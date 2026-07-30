import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppLayout } from "~/components/AppLayout";
import { usePremium } from "~/lib/premium";
import { isOnboardingComplete } from "~/lib/storage";
import {
  getCalendarSyncState,
  connectCalendar,
  disconnectCalendar,
  toggleDemoMode,
  syncNow,
  toggleCalendar,
  updateCalendarSyncSettings,
  formatEventTime,
  type CalendarSyncState,
  type CalendarSyncSettings,
} from "~/lib/calendarSync";

export const Route = createFileRoute("/settings/calendar")({
  component: CalendarSettingsPage,
});

function CalendarSettingsPage() {
  const navigate = useNavigate();
  const premium = usePremium();
  const [state, setState] = useState<CalendarSyncState>(getCalendarSyncState());
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isOnboardingComplete()) {
      navigate({ to: "/", replace: true });
      return;
    }
    setReady(true);
  }, []);

  const refresh = () => setState(getCalendarSyncState());

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectCalendar();
      refresh();
    } catch {
      refresh();
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    await syncNow();
    refresh();
    setSyncing(false);
  };

  const handleDemoToggle = (enable: boolean) => {
    toggleDemoMode(enable);
    refresh();
  };

  const handleToggleCalendar = (id: string) => {
    toggleCalendar(id);
    refresh();
  };

  const handleSettingChange = (partial: Partial<CalendarSyncSettings>) => {
    updateCalendarSyncSettings(partial);
    refresh();
  };

  const isConnected = state.syncStatus === "synced" && !state.demoMode;
  const isDemo = state.demoMode;
  const hasConnection = isConnected || isDemo;

  if (!ready) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark sm:text-3xl">Calendar Sync</h1>
          <p className="text-sm text-brand-muted">
            Connect your Google Calendar so Tangerine can see your schedule and help you plan around it.
          </p>
        </div>

        {/* ===== PREMIUM GATE ===== */}
        {!premium.isPremium && (
          <div className="card-elevated border-brand-light/15 bg-gradient-to-br from-brand-warm/20 to-white">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-deep/10 text-sm">📅</span>
              <span className="rounded-full bg-brand-gold/15 px-2 py-0.5 text-[10px] font-medium text-brand-deep">✨ Premium</span>
            </div>
            <h3 className="mb-2 font-serif text-base font-medium text-brand-dark">Calendar Sync is a Premium feature</h3>
            <p className="mb-3 text-xs leading-relaxed text-brand-muted">
              Connect Google Calendar to see your events alongside Tangerine tasks, get smarter scheduling suggestions, and protect your focus time.
            </p>
            <Link to="/upgrade" className="btn-primary inline-block text-xs">
              Unlock with Premium →
            </Link>
          </div>
        )}

        {/* ===== CONNECTION STATUS (Premium only) ===== */}
        {premium.isPremium && (
          <>
            {/* Connection Card */}
            <div className="card-elevated">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg shadow-sm ${
                    hasConnection ? "bg-brand-warm text-brand-deep" : "bg-brand-cream/30 text-brand-muted"
                  }`}>
                    📅
                  </span>
                  <div>
                    <h3 className="font-medium text-brand-dark">Google Calendar</h3>
                    <p className="text-xs text-brand-muted">
                      {isConnected ? "Connected" : isDemo ? "Demo mode" : "Not connected"}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  state.syncStatus === "synced"
                    ? "bg-green-50 text-green-600"
                    : state.syncStatus === "connecting"
                      ? "bg-amber-50 text-amber-600"
                      : state.syncStatus === "error"
                        ? "bg-red-50 text-red-600"
                        : "bg-brand-cream/30 text-brand-muted"
                }`}>
                  {state.syncStatus === "synced" ? "🟢 Synced" :
                   state.syncStatus === "connecting" ? "🔄 Syncing…" :
                   state.syncStatus === "error" ? "⚠️ Error" : "⚪ Disconnected"}
                </span>
              </div>

              {/* Connect / Disconnect buttons */}
              {!hasConnection && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="btn-primary disabled:opacity-60"
                  >
                    {connecting ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Connecting…
                      </span>
                    ) : (
                      "Connect Google Calendar"
                    )}
                  </button>
                  <button
                    onClick={() => handleDemoToggle(true)}
                    className="btn-secondary"
                  >
                    Try Demo Mode
                  </button>
                </div>
              )}

              {/* Connected actions */}
              {hasConnection && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleSyncNow}
                      disabled={syncing}
                      className="btn-primary disabled:opacity-60"
                    >
                      {syncing ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Syncing…
                        </span>
                      ) : (
                        "Sync Now"
                      )}
                    </button>
                    {state.lastSync && (
                      <span className="text-xs text-brand-muted/60">
                        Last synced: {new Date(state.lastSync).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => isDemo ? handleDemoToggle(false) : disconnectCalendar()}
                      className="btn-ghost text-xs text-red-400 hover:text-red-500"
                    >
                      {isDemo ? "Stop Demo" : "Disconnect"}
                    </button>
                    {!isDemo && (
                      <button
                        onClick={() => handleDemoToggle(true)}
                        className="btn-ghost text-xs"
                      >
                        Switch to Demo
                      </button>
                    )}
                  </div>

                  {/* Synced events count */}
                  <div className="rounded-xl bg-brand-warm/20 px-4 py-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-2xl font-semibold text-brand-deep">{state.events.length}</span>
                      <span className="text-sm text-brand-muted">synced events this week</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ===== CALENDAR LIST ===== */}
            {hasConnection && state.connections.length > 0 && (
              <div className="card-elevated">
                <h3 className="mb-3 font-serif text-base font-medium text-brand-dark">Synced Calendars</h3>
                <div className="space-y-2">
                  {state.connections.map((conn) => (
                    <div key={conn.id} className="flex items-center gap-3 rounded-xl bg-brand-cream/15 px-4 py-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: conn.color }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-brand-dark">{conn.name}</p>
                        <p className="text-xs text-brand-muted">
                          {conn.primary ? "Primary · " : ""}{conn.source === "google" ? "Google Calendar" : "Unknown"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleCalendar(conn.id)}
                        className={`relative h-7 w-12 rounded-full transition-all ${
                          conn.enabled ? "bg-brand-deep" : "bg-brand-cream/60"
                        }`}
                        aria-label={`Toggle ${conn.name}`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
                            conn.enabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== TASK → CALENDAR MAPPING ===== */}
            {hasConnection && (
              <div className="card-elevated">
                <h3 className="mb-3 font-serif text-base font-medium text-brand-dark">Task Mapping</h3>
                <p className="mb-4 text-xs text-brand-muted">
                  Choose which task properties sync to your calendar events.
                </p>
                <div className="space-y-3">
                  {[
                    { key: "mapTaskName" as const, label: "Task name", desc: "Shows the task title on your calendar" },
                    { key: "mapTaskDescription" as const, label: "Task description", desc: "Includes the description in event details" },
                    { key: "mapTaskPriority" as const, label: "Priority indicator", desc: "Colors events based on task priority" },
                    { key: "mapTaskEnergy" as const, label: "Energy rating", desc: "Adds ⚡ energy level to the event" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-brand-dark">{label}</p>
                        <p className="text-xs text-brand-muted">{desc}</p>
                      </div>
                      <button
                        onClick={() => handleSettingChange({ [key]: !state.settings[key] })}
                        className={`relative h-7 w-12 shrink-0 rounded-full transition-all ${
                          state.settings[key] ? "bg-brand-deep" : "bg-brand-cream/60"
                        }`}
                        aria-label={`Toggle ${label}`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
                            state.settings[key] ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== RECENT EVENTS PREVIEW ===== */}
            {hasConnection && state.events.length > 0 && (
              <div className="card-elevated">
                <h3 className="mb-3 font-serif text-base font-medium text-brand-dark">
                  {isDemo ? "Demo Events" : "Upcoming Synced Events"}
                </h3>
                <div className="space-y-2">
                  {state.events.slice(0, 6).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 rounded-xl bg-brand-cream/15 px-4 py-3"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: event.color || "#da9202" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-brand-dark">
                          {event.title}
                          {event.readOnly && (
                            <span className="ml-1.5 text-[10px] text-brand-muted/60">🔒</span>
                          )}
                        </p>
                        <p className="text-xs text-brand-muted">
                          {new Date(event.startDate + "T00:00:00").toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                          {event.startTime && ` · ${formatEventTime(event)}`}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-brand-cream/50 px-2 py-0.5 text-[10px] font-medium text-brand-muted">
                        {event.source === "demo" ? "Demo" : event.source === "tangerine" ? "🍊" : "📅"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
