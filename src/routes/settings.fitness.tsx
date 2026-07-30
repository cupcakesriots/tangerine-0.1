import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppLayout } from "~/components/AppLayout";
import { usePremium } from "~/lib/premium";
import { isOnboardingComplete } from "~/lib/storage";
import {
  getFitnessSettings,
  saveFitnessSettings,
  simulateOAuthFlow,
  disconnectTracker,
  syncNow,
  toggleDataType,
  toggleDemoMode,
  getLastSyncText,
  getFitnessData,
  PROVIDER_LABELS,
  PROVIDER_ICONS,
  DATA_TYPE_LABELS,
  type FitnessSettings,
  type TrackerProvider,
  type DataType,
} from "~/lib/fitnessSync";

export const Route = createFileRoute("/settings/fitness")({
  component: FitnessSettingsPage,
});

function FitnessSettingsPage() {
  const navigate = useNavigate();
  const premium = usePremium();
  const [settings, setSettings] = useState<FitnessSettings>(getFitnessSettings());
  const [connecting, setConnecting] = useState<TrackerProvider>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isOnboardingComplete()) { navigate({ to: "/", replace: true }); return; }
    refreshState();
    setReady(true);
  }, []);

  const refreshState = () => {
    setSettings(getFitnessSettings());
    setLastSyncText(getLastSyncText());
  };

  const handleConnect = async (provider: TrackerProvider) => {
    setConnecting(provider);
    try { await simulateOAuthFlow(provider); refreshState(); } finally { setConnecting(null); }
  };

  const handleDisconnect = async () => {
    await disconnectTracker();
    refreshState();
  };

  const handleSync = async () => {
    setSyncing(true);
    try { await syncNow(); refreshState(); } finally { setSyncing(false); }
  };

  const handleToggleDataType = (type: DataType) => {
    toggleDataType(type);
    refreshState();
  };

  const handleToggleDemo = () => {
    toggleDemoMode();
    refreshState();
  };

  if (!ready) return null;

  const isConnected = settings.connected;
  const providerName = settings.provider ? PROVIDER_LABELS[settings.provider] : null;
  const providerIcon = settings.provider ? PROVIDER_ICONS[settings.provider] : null;
  const demoDataDays = getFitnessData().length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark sm:text-3xl">Fitness Tracker Sync</h1>
          <p className="text-sm text-brand-muted">
            Connect your health data so Tangerine can understand your energy patterns — gently, without turning your day into a performance metric.
          </p>
        </div>

        {isConnected && providerName && providerIcon ? (
          <div className="card space-y-4 border-brand-light/30 bg-gradient-to-br from-brand-warm/20 to-brand-cream/10">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-warm/60 text-2xl">{providerIcon}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-lg font-semibold text-brand-dark">{providerName}</h2>
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">Connected</span>
                </div>
                <p className="text-sm text-brand-muted">{lastSyncText ? `Last synced ${lastSyncText}` : "Synced"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleSync} disabled={syncing} className="btn-primary text-sm">
                {syncing ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Syncing…
                  </span>
                ) : "Sync now"}
              </button>
              <button onClick={handleDisconnect} className="btn-ghost text-sm text-brand-muted">Disconnect</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="font-serif text-lg font-medium text-brand-dark">Connect a tracker</h2>
              <p className="text-sm text-brand-muted">Choose your tracker to begin. Your data stays local — it's just for you.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                { provider: "apple-health" as const, label: "Apple Health", icon: "❤️", description: "Sync steps, sleep, heart rate, and workouts from your iPhone or Apple Watch." },
                { provider: "garmin" as const, label: "Garmin Connect", icon: "⌚", description: "Import activity, sleep, and heart rate data from your Garmin device." },
              ]).map(({ provider, label, icon, description }) => {
                const isCurrentlyConnecting = connecting === provider;
                return (
                  <div key={provider} className="card space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-cream/40 text-2xl">{icon}</div>
                      <h3 className="font-serif text-base font-semibold text-brand-dark">{label}</h3>
                    </div>
                    <p className="text-sm text-brand-muted leading-relaxed">{description}</p>
                    {!premium.isPremium ? (
                      <Link to="/upgrade" className="inline-flex items-center gap-1 rounded-full bg-brand-warm/50 px-4 py-2 text-sm font-medium text-brand-deep transition-all hover:bg-brand-deep hover:text-white">
                        ✨ Unlock with Premium
                      </Link>
                    ) : (
                      <button onClick={() => handleConnect(provider)} disabled={isCurrentlyConnecting} className="btn-primary text-sm w-full">
                        {isCurrentlyConnecting ? (
                          <span className="inline-flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            Connecting…
                          </span>
                        ) : "Connect"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isConnected && (
          <div className="card space-y-3">
            <h3 className="font-serif text-base font-medium text-brand-dark">Data to sync</h3>
            <p className="text-xs text-brand-muted">Choose what feels useful. You can change this anytime.</p>
            <div className="space-y-2">
              {(Object.keys(DATA_TYPE_LABELS) as DataType[]).map((type) => {
                const { label, icon } = DATA_TYPE_LABELS[type];
                const isActive = settings.syncedTypes.includes(type);
                return (
                  <div key={type} className="flex items-center justify-between rounded-lg bg-brand-cream/20 px-4 py-3">
                    <div className="flex items-center gap-3"><span className="text-lg">{icon}</span><span className="text-sm font-medium text-brand-dark">{label}</span></div>
                    <button onClick={() => handleToggleDataType(type)} className={`relative h-7 w-12 rounded-full transition-all ${isActive ? "bg-brand-deep" : "bg-brand-cream/60"}`} aria-label={`Toggle ${label}`}>
                      <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${isActive ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-serif text-base font-medium text-brand-dark">Demo mode</h3>
              <p className="text-xs text-brand-muted mt-0.5">
                {settings.demoMode
                  ? `Demo mode is active — ${demoDataDays} days of sample data are available. Use this to explore before connecting a real tracker.`
                  : "Try out the experience with realistic sample data. No real tracker needed."}
              </p>
            </div>
            <button onClick={handleToggleDemo} className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-all ${settings.demoMode ? "bg-brand-deep" : "bg-brand-cream/60"}`} aria-label="Toggle demo mode">
              <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${settings.demoMode ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
