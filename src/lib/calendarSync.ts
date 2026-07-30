// Calendar Sync Engine for Tangerine
// Handles Google Calendar connection, mock events, and localStorage persistence.
// Full OAuth integration ready — currently uses mock/demo mode for the prototype.

// ─── Types ────────────────────────────────────

export type SyncStatus = "disconnected" | "connecting" | "synced" | "error";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;   // ISO date
  endDate?: string;
  startTime?: string;  // "HH:MM" format
  endTime?: string;
  source: "tangerine" | "google" | "demo";
  calendarId?: string;
  color?: string;
  location?: string;
  attendees?: string[];
  readOnly?: boolean;
}

export interface CalendarConnection {
  id: string;
  name: string;
  source: "google";
  primary: boolean;
  color: string;
  enabled: boolean;
  lastSync?: string;
}

export interface CalendarSyncSettings {
  mapTaskName: boolean;
  mapTaskDescription: boolean;
  mapTaskPriority: boolean;
  mapTaskEnergy: boolean;
}

export interface CalendarSyncState {
  syncStatus: SyncStatus;
  connections: CalendarConnection[];
  events: CalendarEvent[];
  lastSync: string | null;
  demoMode: boolean;
  settings: CalendarSyncSettings;
}

// ─── Constants ────────────────────────────────

const CALENDAR_SYNC_KEY = "tangerine_calendar_sync";

const DEFAULT_SETTINGS: CalendarSyncSettings = {
  mapTaskName: true,
  mapTaskDescription: true,
  mapTaskPriority: false,
  mapTaskEnergy: false,
};

const DEFAULT_CONNECTIONS: CalendarConnection[] = [
  { id: "gcal-primary", name: "Personal Calendar", source: "google", primary: true, color: "#4285F4", enabled: true },
  { id: "gcal-work", name: "Work Calendar", source: "google", primary: false, color: "#34A853", enabled: true },
  { id: "gcal-shared", name: "Team Shared", source: "google", primary: false, color: "#FBBC04", enabled: false },
];

export const DEMO_EVENTS: CalendarEvent[] = [
  {
    id: "demo-1",
    title: "Team Standup",
    description: "Daily sync with the engineering team",
    startDate: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "09:30",
    source: "demo",
    color: "#4285F4",
    readOnly: true,
  },
  {
    id: "demo-2",
    title: "Lunch with Alex",
    description: "Catch up at the new café on 3rd",
    startDate: new Date().toISOString().split("T")[0],
    startTime: "12:00",
    endTime: "13:00",
    source: "demo",
    color: "#34A853",
    readOnly: true,
  },
  {
    id: "demo-3",
    title: "Design Review",
    description: "Review latest mockups for the onboarding flow",
    startDate: new Date().toISOString().split("T")[0],
    startTime: "14:00",
    endTime: "15:00",
    source: "demo",
    color: "#EA4335",
    readOnly: true,
  },
  {
    id: "demo-4",
    title: "Yoga Class",
    description: "Vinyasa flow at the studio",
    startDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    startTime: "07:30",
    endTime: "08:30",
    source: "demo",
    color: "#FBBC04",
    readOnly: true,
  },
  {
    id: "demo-5",
    title: "Sprint Planning",
    description: "Plan next sprint with the product team",
    startDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    startTime: "10:00",
    endTime: "11:30",
    source: "demo",
    color: "#4285F4",
    readOnly: true,
  },
  {
    id: "demo-6",
    title: "Dentist Appointment",
    description: "Regular checkup — Dr. Chen",
    startDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    startTime: "15:00",
    endTime: "16:00",
    source: "demo",
    color: "#EA4335",
    readOnly: true,
  },
];

// ─── Storage Helpers ──────────────────────────

function getState(): CalendarSyncState {
  try {
    const raw = localStorage.getItem(CALENDAR_SYNC_KEY);
    return raw ? JSON.parse(raw) : getDefaultState();
  } catch {
    return getDefaultState();
  }
}

function getDefaultState(): CalendarSyncState {
  return {
    syncStatus: "disconnected",
    connections: [],
    events: [],
    lastSync: null,
    demoMode: false,
    settings: { ...DEFAULT_SETTINGS },
  };
}

function saveState(state: CalendarSyncState): void {
  try {
    localStorage.setItem(CALENDAR_SYNC_KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
}

// ─── Public API ───────────────────────────────

/** Get the current calendar sync state */
export function getCalendarSyncState(): CalendarSyncState {
  return getState();
}

/** Connect to Google Calendar (mock OAuth flow) */
export function connectCalendar(): Promise<CalendarSyncState> {
  const state = getState();
  state.syncStatus = "connecting";
  saveState(state);

  // Simulate OAuth flow delay
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const updated = getState();
        updated.syncStatus = "synced";
        updated.connections = DEFAULT_CONNECTIONS.map((c) => ({ ...c }));
        updated.lastSync = new Date().toISOString();
        updated.demoMode = false;
        // Seed demo events when first connecting
        updated.events = DEMO_EVENTS.map((e) => ({ ...e, source: "google" as const }));
        saveState(updated);
        resolve(updated);
      } catch {
        const updated = getState();
        updated.syncStatus = "error";
        saveState(updated);
        reject(new Error("Connection failed — please try again"));
      }
    }, 2000);
  });
}

/** Disconnect calendar and clear events */
export function disconnectCalendar(): CalendarSyncState {
  const state = getState();
  state.syncStatus = "disconnected";
  state.connections = [];
  state.events = [];
  state.lastSync = null;
  state.demoMode = false;
  saveState(state);
  return state;
}

/** Toggle demo mode — seeds sample events without "connecting" */
export function toggleDemoMode(enable: boolean): CalendarSyncState {
  const state = getState();
  state.demoMode = enable;
  if (enable) {
    state.events = DEMO_EVENTS.map((e) => ({ ...e }));
    state.syncStatus = "synced";
    state.connections = DEFAULT_CONNECTIONS.map((c) => ({ ...c }));
    state.lastSync = new Date().toISOString();
  } else {
    state.events = [];
    state.syncStatus = "disconnected";
    state.connections = [];
    state.lastSync = null;
  }
  saveState(state);
  return state;
}

/** Trigger a manual sync */
export function syncNow(): Promise<CalendarSyncState> {
  const state = getState();
  state.syncStatus = "connecting";
  saveState(state);

  return new Promise((resolve) => {
    setTimeout(() => {
      const updated = getState();
      updated.syncStatus = "synced";
      updated.lastSync = new Date().toISOString();
      saveState(updated);
      resolve(updated);
    }, 1500);
  });
}

/** Toggle a calendar connection on/off */
export function toggleCalendar(id: string): CalendarSyncState {
  const state = getState();
  const conn = state.connections.find((c) => c.id === id);
  if (conn) {
    conn.enabled = !conn.enabled;
    saveState(state);
  }
  return state;
}

/** Update sync settings */
export function updateCalendarSyncSettings(partial: Partial<CalendarSyncSettings>): CalendarSyncState {
  const state = getState();
  state.settings = { ...state.settings, ...partial };
  saveState(state);
  return state;
}

/** Get events for a specific date */
export function getEventsForDate(date: string): CalendarEvent[] {
  const state = getState();
  if (state.syncStatus !== "synced" && !state.demoMode) return [];
  return state.events.filter((e) => e.startDate === date);
}

/** Convert a Tangerine task to a calendar event */
export function taskToEvent(task: {
  id: string;
  name: string;
  date: string;
  description?: string;
  priority?: string;
  energyRequired?: number;
}): CalendarEvent {
  const settings = getState().settings;
  return {
    id: `task-${task.id}`,
    title: settings.mapTaskName ? task.name : "",
    description: settings.mapTaskDescription ? task.description : "",
    startDate: task.date,
    source: "tangerine",
    color: "#da9202",
  };
}

/** Format time for display */
export function formatEventTime(event: CalendarEvent): string {
  if (event.startTime && event.endTime) {
    return `${formatTimeAMPM(event.startTime)} – ${formatTimeAMPM(event.endTime)}`;
  }
  if (event.startTime) return formatTimeAMPM(event.startTime);
  return "";
}

function formatTimeAMPM(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}
