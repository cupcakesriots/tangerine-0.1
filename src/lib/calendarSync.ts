// Real calendar sync engine: Google (GIS), Outlook (MSAL), Apple (instructions)
// Tokens persisted in localStorage — no server needed.

// ── Types ──

export type CalendarProvider = "google" | "outlook" | "apple";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  startTime?: string; // HH:MM (24h)
  endTime?: string;
  location?: string;
  attendees?: string[];
  source: CalendarProvider;
  color?: string;
  readOnly: boolean;
}

export interface CalendarTokens {
  google?: { accessToken: string; expiresAt: number };
  outlook?: { homeAccountId: string }; // MSAL handles refresh internally
}

export interface CalendarSyncState {
  providers: {
    google: "disconnected" | "connecting" | "connected" | "error";
    outlook: "disconnected" | "connecting" | "connected" | "error";
    apple: "disconnected" | "info"; // Apple: info-only
  };
  lastSync?: string;
}

// ── Constants ──

const TOKENS_KEY = "tangerine_calendar_tokens";
const SYNC_STATE_KEY = "tangerine_calendar_sync_state";

// Env vars — fallback comments if no real client ID configured
// Set VITE_GOOGLE_CLIENT_ID and VITE_AZURE_CLIENT_ID in your .env
const GOOGLE_CLIENT_ID =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
  ""; // TODO: set in .env

const AZURE_CLIENT_ID =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_AZURE_CLIENT_ID) ||
  ""; // TODO: set in .env

const GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar.readonly";
const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";
const OUTLOOK_GRAPH_BASE = "https://graph.microsoft.com/v1.0";

// ── Token Persistence ──

export function getCalendarTokens(): CalendarTokens {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCalendarTokens(tokens: CalendarTokens): void {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

// ── Sync State Persistence ──

export function getCalendarSyncState(): CalendarSyncState {
  try {
    const raw = localStorage.getItem(SYNC_STATE_KEY);
    return raw
      ? JSON.parse(raw)
      : { providers: { google: "disconnected", outlook: "disconnected", apple: "disconnected" } };
  } catch {
    return { providers: { google: "disconnected", outlook: "disconnected", apple: "disconnected" } };
  }
}

function saveSyncState(state: CalendarSyncState): void {
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
}

function updateProviderState(
  provider: "google" | "outlook" | "apple",
  status: CalendarSyncState["providers"]["google"] | "info"
): void {
  const state = getCalendarSyncState();
  state.providers[provider] = status as any;
  if (status === "connected") state.lastSync = new Date().toISOString();
  saveSyncState(state);
}

// ── Google Calendar ──

let gisScriptLoaded = false;

function loadGisScript(): Promise<void> {
  if (gisScriptLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gisScriptLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

function getGoogleAccessToken(): string | null {
  const tokens = getCalendarTokens();
  if (!tokens.google?.accessToken) return null;
  if (Date.now() >= tokens.google.expiresAt) {
    // Token expired — clear and return null
    const updated = { ...tokens, google: undefined };
    saveCalendarTokens(updated);
    updateProviderState("google", "disconnected");
    return null;
  }
  return tokens.google.accessToken;
}

export async function connectGoogleCalendar(): Promise<void> {
  updateProviderState("google", "connecting");

  try {
    await loadGisScript();

    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: async (response: any) => {
        if (response.error) {
          updateProviderState("google", "error");
          return;
        }
        const tokens = getCalendarTokens();
        tokens.google = {
          accessToken: response.access_token,
          expiresAt: Date.now() + (response.expires_in || 3600) * 1000,
        };
        saveCalendarTokens(tokens);
        updateProviderState("google", "connected");
      },
    });

    tokenClient.requestAccessToken();
  } catch (err) {
    console.error("Google Calendar connect error:", err);
    updateProviderState("google", "error");
    throw err;
  }
}

export async function fetchGoogleEvents(
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const accessToken = getGoogleAccessToken();
  if (!accessToken) return [];

  const timeMin = new Date(startDate + "T00:00:00").toISOString();
  const timeMax = new Date(endDate + "T23:59:59").toISOString();

  const url = `${GOOGLE_API_BASE}/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin
  )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Token expired/invalid
      const tokens = getCalendarTokens();
      tokens.google = undefined;
      saveCalendarTokens(tokens);
      updateProviderState("google", "disconnected");
    }
    return [];
  }

  const data = await res.json();
  return (data.items || []).map((event: any): CalendarEvent => {
    const start = event.start || {};
    const end = event.end || {};
    const startDatePart = (start.date || start.dateTime || "").split("T")[0];
    const endDateFrom = (end.date || end.dateTime || "");
    const endDatePart = endDateFrom.split("T")[0] || startDatePart;
    return {
      id: `gcal-${event.id}`,
      title: event.summary || "(No title)",
      description: event.description || undefined,
      startDate: startDatePart,
      endDate: endDatePart,
      startTime: start.dateTime ? start.dateTime.split("T")[1]?.slice(0, 5) : undefined,
      endTime: end.dateTime ? end.dateTime.split("T")[1]?.slice(0, 5) : undefined,
      location: event.location || undefined,
      attendees: event.attendees?.map((a: any) => a.displayName || a.email).filter(Boolean),
      source: "google",
      color: "#4285F4",
      readOnly: true,
    };
  });
}

export async function disconnectGoogleCalendar(): Promise<void> {
  const tokens = getCalendarTokens();
  tokens.google = undefined;
  saveCalendarTokens(tokens);
  updateProviderState("google", "disconnected");
  // Google token revoke requires a server — just clear local
}

// ── Outlook Calendar (Microsoft Graph via MSAL) ──

let msalInstance: any = null;

async function getMsalInstance(): Promise<any> {
  if (msalInstance) return msalInstance;
  const { PublicClientApplication } = await import("@azure/msal-browser");
  msalInstance = new PublicClientApplication({
    auth: {
      clientId: AZURE_CLIENT_ID,
      authority: "https://login.microsoftonline.com/common",
      redirectUri: typeof window !== "undefined" ? window.location.origin : "",
    },
    cache: {
      cacheLocation: "localStorage",
      storeAuthStateInCookie: false,
    },
  });
  await msalInstance.initialize();
  return msalInstance;
}

function getOutlookAccountId(): string | null {
  const tokens = getCalendarTokens();
  return tokens.outlook?.homeAccountId || null;
}

export async function connectOutlookCalendar(): Promise<void> {
  updateProviderState("outlook", "connecting");

  try {
    const msal = await getMsalInstance();

    const result = await msal.acquireTokenPopup({
      scopes: ["Calendars.Read", "User.Read"],
      prompt: "select_account",
    });

    const tokens = getCalendarTokens();
    tokens.outlook = { homeAccountId: result.account.homeAccountId };
    saveCalendarTokens(tokens);
    updateProviderState("outlook", "connected");
  } catch (err: any) {
    if (err.errorCode !== "user_cancelled") {
      console.error("Outlook Calendar connect error:", err);
      updateProviderState("outlook", "error");
    } else {
      updateProviderState("outlook", "disconnected");
    }
    throw err;
  }
}

async function getOutlookToken(): Promise<string | null> {
  try {
    const msal = await getMsalInstance();
    const accountId = getOutlookAccountId();
    if (!accountId) return null;
    const accounts = msal.getAllAccounts();
    const account = accounts.find((a: any) => a.homeAccountId === accountId);
    if (!account) return null;
    const result = await msal.acquireTokenSilent({
      scopes: ["Calendars.Read"],
      account,
    });
    return result.accessToken;
  } catch (err: any) {
    if (err.errorCode === "interaction_required") {
      // Need re-auth — disconnect silently
      const tokens = getCalendarTokens();
      tokens.outlook = undefined;
      saveCalendarTokens(tokens);
      updateProviderState("outlook", "disconnected");
    }
    return null;
  }
}

export async function fetchOutlookEvents(
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const token = await getOutlookToken();
  if (!token) return [];

  const startDateTime = `${startDate}T00:00:00`;
  const endDateTime = `${endDate}T23:59:59`;

  const url = `${OUTLOOK_GRAPH_BASE}/me/calendar/events?startDateTime=${encodeURIComponent(
    startDateTime
  )}&endDateTime=${encodeURIComponent(endDateTime)}&$orderby=start/dateTime&$top=50`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      Prefer: 'outlook.timezone="UTC"',
    },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.value || []).map((event: any): CalendarEvent => {
    const start = event.start || {};
    const end = event.end || {};
    return {
      id: `outlook-${event.id}`,
      title: event.subject || "(No title)",
      description: event.bodyPreview || undefined,
      startDate: start.dateTime?.split("T")[0] || startDate,
      endDate: end.dateTime?.split("T")[0] || endDate,
      startTime: start.dateTime?.split("T")[1]?.slice(0, 5),
      endTime: end.dateTime?.split("T")[1]?.slice(0, 5),
      location: event.location?.displayName || undefined,
      attendees: event.attendees?.map((a: any) => a.emailAddress?.name || a.emailAddress?.address).filter(Boolean),
      source: "outlook",
      color: "#0078D4",
      readOnly: true,
    };
  });
}

export async function disconnectOutlookCalendar(): Promise<void> {
  try {
    const msal = await getMsalInstance();
    const accountId = getOutlookAccountId();
    if (accountId) {
      const accounts = msal.getAllAccounts();
      const account = accounts.find((a: any) => a.homeAccountId === accountId);
      if (account) await msal.logoutPopup({ account });
    }
  } catch {
    // Best-effort cleanup
  }
  const tokens = getCalendarTokens();
  tokens.outlook = undefined;
  saveCalendarTokens(tokens);
  updateProviderState("outlook", "disconnected");
}

// ── Apple Calendar ──
// No browser-based OAuth for iCloud. Show instructions to sync via Google.

export function connectAppleCalendar(): void {
  updateProviderState("apple", "info");
}

export async function disconnectAppleCalendar(): Promise<void> {
  updateProviderState("apple", "disconnected");
}

// ── Unified Event Fetch ──

export async function getCalendarEvents(
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const state = getCalendarSyncState();
  const events: CalendarEvent[] = [];

  if (state.providers.google === "connected") {
    try {
      const googleEvents = await fetchGoogleEvents(startDate, endDate);
      events.push(...googleEvents);
    } catch {
      // Silently skip failed fetches — stale data better than nothing
    }
  }

  if (state.providers.outlook === "connected") {
    try {
      const outlookEvents = await fetchOutlookEvents(startDate, endDate);
      events.push(...outlookEvents);
    } catch {
      // Silently skip
    }
  }

  // Apple: no fetch — just instructions

  return events;
}

// ── Helpers ──

export function formatEventTime(event: CalendarEvent): string {
  if (!event.startTime) return "All day";
  const end = event.endTime ? ` – ${event.endTime}` : "";
  return `${event.startTime}${end}`;
}

export function getEventsForDate(dateStr: string, events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((e) => dateStr >= e.startDate && dateStr <= e.endDate);
}
