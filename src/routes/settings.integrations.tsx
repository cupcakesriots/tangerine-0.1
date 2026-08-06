import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppLayout } from "~/components/AppLayout";
import {
  isOnboardingComplete,
  getIntegrations,
  toggleIntegration,
  getSettings,
  saveSettings,
  type Integration,
  type UserSettings,
} from "~/lib/storage";
import {
  getCalendarSyncState,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  connectOutlookCalendar,
  disconnectOutlookCalendar,
  connectAppleCalendar,
  disconnectAppleCalendar,
  type CalendarSyncState,
} from "~/lib/calendarSync";

export const Route = createFileRoute("/settings/integrations")({
  component: SettingsPage,
});

type CalendarProviderId = "google-cal" | "outlook-cal" | "apple-cal";

function SettingsPage() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [activeTab, setActiveTab] = useState<"integrations" | "preferences">("integrations");
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState<CalendarSyncState>(
    getCalendarSyncState()
  );
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [appleExpanded, setAppleExpanded] = useState(false);

  useEffect(() => {
    if (!isOnboardingComplete()) {
      navigate({ to: "/", replace: true });
      return;
    }
    setIntegrations(getIntegrations());
    setSettings(getSettings());
    setReady(true);
  }, []);

  const refreshSyncState = () => setSyncState(getCalendarSyncState());

  const handleToggle = (id: string) => {
    // Calendar integrations use real OAuth — skip old toggle
    if (id === "google-cal" || id === "outlook-cal" || id === "apple-cal") return;
    toggleIntegration(id);
    setIntegrations(getIntegrations());
  };

  const handleCalendarAction = async (id: CalendarProviderId) => {
    const provider = id === "google-cal" ? "google" : id === "outlook-cal" ? "outlook" : "apple";
    const currentState = getCalendarSyncState().providers[provider];

    if (currentState === "connected") {
      // Disconnect
      setConnectingProvider(id);
      try {
        if (provider === "google") await disconnectGoogleCalendar();
        else if (provider === "outlook") await disconnectOutlookCalendar();
        else await disconnectAppleCalendar();
      } catch {
        // best effort
      }
      setConnectingProvider(null);
      refreshSyncState();
      return;
    }

    if (currentState === "disconnected") {
      if (provider === "apple") {
        // Apple doesn't have OAuth — show instructions
        connectAppleCalendar();
        setAppleExpanded(true);
        refreshSyncState();
        return;
      }

      // Connect
      setConnectingProvider(id);
      try {
        if (provider === "google") await connectGoogleCalendar();
        else await connectOutlookCalendar();
      } catch {
        // user cancelled or error — state already updated in connect function
      }
      setConnectingProvider(null);
      refreshSyncState();
    }
  };

  const updateSettings = (partial: Partial<UserSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...partial };
    saveSettings(updated);
    setSettings(updated);
  };

  const getCalendarProviderStatus = (id: CalendarProviderId): CalendarSyncState["providers"]["google"] | "info" => {
    const provider = id === "google-cal" ? "google" : id === "outlook-cal" ? "outlook" : "apple";
    return syncState.providers[provider];
  };

  const getCalendarButtonLabel = (id: CalendarProviderId): string => {
    const status = getCalendarProviderStatus(id);
    if (id === connectingProvider) return "Connecting...";
    if (status === "connected") return "Disconnect";
    if (status === "connecting") return "Connecting...";
    if (status === "error") return "Retry";
    if (status === "info") return "View Instructions";
    return "Connect";
  };

  const getStatusBadge = (id: CalendarProviderId) => {
    const status = getCalendarProviderStatus(id);
    if (id === connectingProvider || status === "connecting") {
      return (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
          Connecting…
        </span>
      );
    }
    if (status === "connected") {
      return (
        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">
          Connected
        </span>
      );
    }
    if (status === "error") {
      return (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-500">
          Error
        </span>
      );
    }
    if (status === "info") {
      return (
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
          Info
        </span>
      );
    }
    return null;
  };

  // Separate calendar and non-calendar integrations
  const calendarIds = ["google-cal", "outlook-cal", "apple-cal"];
  const calIntegrations = integrations.filter((i) => calendarIds.includes(i.id));
  const otherIntegrations = integrations.filter((i) => !calendarIds.includes(i.id));

  if (!ready || !settings) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark sm:text-3xl">Settings</h1>
          <p className="text-sm text-brand-muted">
            Customize your Tangerine experience
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-brand-cream/40 pb-2">
          <button
            onClick={() => setActiveTab("integrations")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              activeTab === "integrations"
                ? "bg-brand-deep text-white shadow-sm"
                : "text-brand-muted hover:bg-brand-cream/30"
            }`}
          >
            🔌 Integrations
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              activeTab === "preferences"
                ? "bg-brand-deep text-white shadow-sm"
                : "text-brand-muted hover:bg-brand-cream/30"
            }`}
          >
            ⚙️ Preferences
          </button>
        </div>

        {/* Integrations Panel */}
        {activeTab === "integrations" && (
          <div className="space-y-6">
            {/* Calendar Integrations */}
            <div>
              <div className="mb-4">
                <h2 className="font-serif text-lg font-medium text-brand-dark">Calendar Sync</h2>
                <p className="text-sm text-brand-muted">
                  Connect your calendars so Tangerine can show your real events alongside your tasks.
                </p>
              </div>
              <div className="space-y-3">
                {calIntegrations.map((integration) => {
                  const isCalendar = calendarIds.includes(integration.id);
                  const status = isCalendar
                    ? getCalendarProviderStatus(integration.id as CalendarProviderId)
                    : integration.connected
                      ? "connected"
                      : "disconnected";
                  const isConnecting = connectingProvider === integration.id;
                  const isApple = integration.id === "apple-cal";

                  return (
                    <div key={integration.id}>
                      <div className="card flex items-center gap-4">
                        {/* Icon */}
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${
                            status === "connected"
                              ? "bg-brand-warm text-brand-deep"
                              : isConnecting
                                ? "bg-amber-50 text-amber-500"
                                : "bg-brand-cream/30 text-brand-muted"
                          }`}
                        >
                          {integration.icon === "calendar" && "📅"}
                          {integration.icon === "apple-calendar" && "🍎"}
                          {integration.icon === "outlook-calendar" && "📧"}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-brand-dark">{integration.name}</h3>
                            {getStatusBadge(integration.id as CalendarProviderId)}
                          </div>
                          <p className="text-xs text-brand-muted">{integration.description}</p>
                          {status === "connected" && syncState.lastSync && (
                            <p className="mt-0.5 text-[10px] text-green-600">
                              Connected · {new Date(syncState.lastSync).toLocaleDateString()}
                            </p>
                          )}
                          {status === "error" && (
                            <p className="mt-0.5 text-[10px] text-red-500">
                              Connection failed. Check your credentials and try again.
                            </p>
                          )}
                        </div>

                        {/* Action button */}
                        <button
                          onClick={() => handleCalendarAction(integration.id as CalendarProviderId)}
                          disabled={isConnecting}
                          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
                            status === "connected"
                              ? "btn-ghost text-red-400 hover:text-red-500 hover:bg-red-50"
                              : status === "error"
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : status === "info"
                                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                  : "btn-primary"
                          }`}
                        >
                          {isConnecting ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" />
                              Connecting…
                            </span>
                          ) : (
                            getCalendarButtonLabel(integration.id as CalendarProviderId)
                          )}
                        </button>
                      </div>

                      {/* Apple Instructions */}
                      {isApple && appleExpanded && (
                        <div className="card-glass mt-2 ml-16 slide-up">
                          <div className="flex items-start gap-3">
                            <span className="text-xl">🍎</span>
                            <div className="space-y-2 text-sm">
                              <p className="font-medium text-brand-dark">
                                Apple Calendar doesn&apos;t support direct browser login.
                              </p>
                              <p className="text-brand-muted">
                                The easiest way: add your iCloud calendar to Google Calendar, then connect Google above.
                              </p>
                              <ol className="ml-4 list-decimal space-y-1 text-xs text-brand-muted">
                                <li>Open <strong>Calendar</strong> on your Mac or iPhone</li>
                                <li>Go to <strong>Calendar → Settings → Accounts</strong></li>
                                <li>Add your Google account and enable calendar sync</li>
                                <li>Or, on iPhone: <strong>Settings → Calendar → Accounts → Add Account → Google</strong></li>
                                <li>Your Apple events will appear in Google Calendar</li>
                                <li>Connect Google Calendar above and they&apos;ll appear here</li>
                              </ol>
                              <button
                                onClick={() => setAppleExpanded(false)}
                                className="btn-ghost text-xs"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Other Integrations */}
            <div>
              <div className="mb-4">
                <h2 className="font-serif text-lg font-medium text-brand-dark">Other Services</h2>
                <p className="text-sm text-brand-muted">
                  Connect your tools so Tangerine can adapt to your real data.
                </p>
              </div>
              <div className="space-y-3">
                {otherIntegrations.map((integration) => (
                  <div key={integration.id} className="card flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${
                        integration.connected
                          ? "bg-brand-warm text-brand-deep"
                          : "bg-brand-cream/30 text-brand-muted"
                      }`}
                    >
                      {integration.icon === "heart" && "❤️"}
                      {integration.icon === "message-square" && "💬"}
                      {integration.icon === "video" && "🎥"}
                      {integration.icon === "file-text" && "📝"}
                      {integration.icon === "home" && "🏠"}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-brand-dark">{integration.name}</h3>
                        {integration.connected && (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-brand-muted">{integration.description}</p>
                      {integration.connected && integration.lastSync && (
                        <p className="mt-0.5 text-[10px] text-green-600">
                          Synced {integration.lastSync}
                        </p>
                      )}
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(integration.id)}
                      className={`relative h-7 w-12 rounded-full transition-all ${
                        integration.connected ? "bg-brand-deep" : "bg-brand-cream/60"
                      }`}
                      aria-label={`Toggle ${integration.name}`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
                          integration.connected ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preferences Panel */}
        {activeTab === "preferences" && (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="font-serif text-lg font-medium text-brand-dark">Your Preferences</h2>
              <p className="text-sm text-brand-muted">
                Adjust how Tangerine works with your daily rhythm.
              </p>
            </div>

            {/* Nudge style */}
            <div className="card">
              <label className="mb-2 block text-sm font-medium text-brand-dark">
                Nudge style
              </label>
              <div className="flex flex-wrap gap-2">
                {(["gentle", "structured", "both"] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => updateSettings({ nudgeStyle: style })}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                      settings.nudgeStyle === style
                        ? "bg-brand-deep text-white shadow-sm"
                        : "bg-brand-cream/30 text-brand-muted hover:bg-brand-cream/50"
                    }`}
                  >
                    {style === "gentle" ? "🎐 Gentle whispers" : style === "structured" ? "📋 Structured pushes" : "🫂 A mix"}
                  </button>
                ))}
              </div>
            </div>

            {/* Quiet hours */}
            <div className="card">
              <label className="mb-2 block text-sm font-medium text-brand-dark">
                Quiet hours
              </label>
              <p className="mb-3 text-xs text-brand-muted">No nudges during this time.</p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <span className="text-xs text-brand-muted">From</span>
                  <input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => updateSettings({ quietHoursStart: e.target.value })}
                    className="input-field mt-1"
                  />
                </div>
                <span className="mt-5 text-brand-muted">→</span>
                <div className="flex-1">
                  <span className="text-xs text-brand-muted">To</span>
                  <input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => updateSettings({ quietHoursEnd: e.target.value })}
                    className="input-field mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-dark">Notifications</p>
                <p className="text-xs text-brand-muted">Receive gentle reminders and nudges</p>
              </div>
              <button
                onClick={() => updateSettings({ notifications: !settings.notifications })}
                className={`relative h-7 w-12 rounded-full transition-all ${
                  settings.notifications ? "bg-brand-deep" : "bg-brand-cream/60"
                }`}
                aria-label="Toggle notifications"
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
                    settings.notifications ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Theme */}
            <div className="card">
              <label className="mb-2 block text-sm font-medium text-brand-dark">
                Theme
              </label>
              <div className="flex gap-2">
                {(["warm", "light"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => updateSettings({ theme: t })}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                      settings.theme === t
                        ? "bg-brand-deep text-white shadow-sm"
                        : "bg-brand-cream/30 text-brand-muted hover:bg-brand-cream/50"
                    }`}
                  >
                    {t === "warm" ? "🍊 Warm" : "☀️ Light"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
