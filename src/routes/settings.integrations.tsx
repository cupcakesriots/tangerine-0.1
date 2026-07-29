import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppLayout } from "~/components/AppLayout";
import { usePremium } from "~/lib/premium";
import {
  isOnboardingComplete,
  getIntegrations,
  toggleIntegration,
  getSettings,
  saveSettings,
  type Integration,
  type UserSettings,
} from "~/lib/storage";

export const Route = createFileRoute("/settings/integrations")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const premium = usePremium();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [activeTab, setActiveTab] = useState<"integrations" | "preferences">("integrations");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isOnboardingComplete()) {
      navigate({ to: "/", replace: true });
      return;
    }
    setIntegrations(getIntegrations());
    setSettings(getSettings());
    setReady(true);
  }, []);

  const handleToggle = (id: string) => {
    toggleIntegration(id);
    setIntegrations(getIntegrations());
  };

  const updateSettings = (partial: Partial<UserSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...partial };
    saveSettings(updated);
    setSettings(updated);
  };

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
          <div className="space-y-3">
            <div className="mb-4">
              <h2 className="font-serif text-lg font-medium text-brand-dark">Connected Services</h2>
              <p className="text-sm text-brand-muted">
                Connect your tools so Tangerine can adapt to your real schedule and data.
                Toggle any service to see how it works.
              </p>
            </div>
            {integrations.map((integration) => (
              <div key={integration.id} className="card flex items-center gap-4">
                {/* Icon */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${
                    integration.connected
                      ? "bg-brand-warm text-brand-deep"
                      : "bg-brand-cream/30 text-brand-muted"
                  }`}
                >
                  {integration.icon === "calendar" && "📅"}
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
                {integration.icon === "calendar" && !premium.isPremium ? (
                  <Link
                    to="/upgrade"
                    className="rounded-full bg-brand-warm/50 px-3 py-1 text-xs font-medium text-brand-deep transition-all hover:bg-brand-deep hover:text-white"
                  >
                    ✨ Premium
                  </Link>
                ) : (
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
                )}
              </div>
            ))}
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