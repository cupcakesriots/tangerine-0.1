import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppLayout } from "~/components/AppLayout"
import { NectarMeter } from "~/components/NectarMeter";
import { GuidedSession, type SessionType } from "~/components/wellness";
import { usePremium } from "~/lib/premium";
import {
  isOnboardingComplete,
  getWellnessEntries,
  addWellnessEntry,
  getTodaysWellness,
  generateId,
  type WellnessEntry,
} from "~/lib/storage";

export const Route = createFileRoute("/wellness")({
  component: WellnessPage,
});

type ActivityType = "meditation" | "yoga" | "breathing" | "walk" | "stretch" | "break";

const activities: { type: ActivityType; emoji: string; title: string; duration: string; description: string }[] = [
  {
    type: "yoga",
    emoji: "🧘",
    title: "Move, Stretch, & Strengthen",
    duration: "5-10 min",
    description: "Desk-friendly motions: gentle stretches, light strengthening, and posture holds for a full cognitive and physical reset.",
  },
  {
    type: "meditation",
    emoji: "🧠",
    title: "Mindful Minute",
    duration: "1 min",
    description: "Close your eyes. Breathe. Just one minute of stillness.",
  },
  {
    type: "breathing",
    emoji: "🌬️",
    title: "Box Breathing",
    duration: "4 min",
    description: "Inhale 4s · Hold 4s · Exhale 4s · Hold 4s. Calm your nervous system.",
  },
  {
    type: "stretch",
    emoji: "🙆",
    title: "Quick Desk Reset",
    duration: "3 min",
    description: "Stand up, stretch your arms overhead, side bend, and touch your toes. Includes light posture holds for strength.",
  },
  {
    type: "walk",
    emoji: "🚶",
    title: "Mindful Walk",
    duration: "10 min",
    description: "Walk slowly around your space. Notice 3 things you see, 2 you hear, 1 you feel.",
  },
  {
    type: "break",
    emoji: "☕",
    title: "Intentional Break",
    duration: "5-15 min",
    description: "Step away. Make tea. Stare out the window. You're allowed to rest.",
  },
];

// ── Premium guided sessions ──
// First 2 are available to all; last 4 are premium-locked
const premiumSessions: { type: SessionType; emoji: string; title: string; duration: string; description: string; gradient: string; premiumLocked: boolean }[] = [
  {
    type: "box-breathing",
    emoji: "🫁",
    title: "Box Breathing Coach",
    duration: "3-7 min",
    description: "Animated breath pacing with expanding circle. Choose 3, 5, or 7 minutes of guided calm.",
    gradient: "from-blue-50/60 to-brand-cream/30",
    premiumLocked: false,
  },
  {
    type: "desk-decompress",
    emoji: "🪑",
    title: "Desk Decompress",
    duration: "5 min",
    description: "Guided chair yoga with illustrated pose cards. Neck rolls, twists, cat-cow — all from your seat.",
    gradient: "from-brand-warm/40 to-brand-cream/20",
    premiumLocked: false,
  },
  {
    type: "somatic-grounding",
    emoji: "🧘‍♀️",
    title: "Somatic Grounding",
    duration: "5-7 min",
    description: "Body scan meditation moving through eight regions. Progressive visual indicator with gentle cues.",
    gradient: "from-stone-100/50 to-brand-cream/30",
    premiumLocked: true,
  },
  {
    type: "brain-dump",
    emoji: "📝",
    title: "Brain Dump & Release",
    duration: "3-5 min",
    description: "Externalize overwhelming thoughts in three phases: spill, reflect, and ceremonially release.",
    gradient: "from-brand-cream/40 to-brand-warm/30",
    premiumLocked: true,
  },
  {
    type: "energy-reset",
    emoji: "⚡",
    title: "Energy Reset Micro-Break",
    duration: "2 min",
    description: "Quick physical shakeout, 30-sec breathing, and a gentle reframing thought for low-energy moments.",
    gradient: "from-amber-50/50 to-brand-warm/30",
    premiumLocked: true,
  },
  {
    type: "evening-wind-down",
    emoji: "🌙",
    title: "Evening Wind-Down",
    duration: "5 min",
    description: "Pre-sleep ritual with progressive relaxation, dimming screen overlay, and gratitude reflection.",
    gradient: "from-indigo-50/30 to-brand-cream/30",
    premiumLocked: true,
  },
];

function WellnessPage() {
  const navigate = useNavigate();
  const premium = usePremium();
  const [ready, setReady] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [moods, setMoods] = useState<string[]>([]);
  const [moodNote, setMoodNote] = useState("");
  const [showEnergyLog, setShowEnergyLog] = useState(false);
  const [todaysEntry, setTodaysEntry] = useState<WellnessEntry | undefined>(undefined);
  const [activeActivity, setActiveActivity] = useState<ActivityType | null>(null);
  const [activeSession, setActiveSession] = useState<SessionType | null>(null);
  const [history, setHistory] = useState<WellnessEntry[]>([]);

  useEffect(() => {
    if (!isOnboardingComplete()) {
      navigate({ to: "/", replace: true });
      return;
    }
    setTodaysEntry(getTodaysWellness());
    setHistory(getWellnessEntries().slice(-7).reverse());
    setReady(true);
  }, []);

  const logEnergy = () => {
    const sessionActivity = activeSession
      ? premiumSessions.find(s => s.type === activeSession)?.title
      : undefined;
    addWellnessEntry({
      id: generateId(),
      date: new Date().toISOString().split("T")[0],
      energyLevel,
      moods: moods.length > 0 ? moods : undefined,
      notes: moodNote,
      activities: sessionActivity ? [sessionActivity] : activeActivity ? [activeActivity] : [],
    });
    setTodaysEntry(getTodaysWellness());
    setShowEnergyLog(false);
    setActiveActivity(null);
    setActiveSession(null);
  };

  const completeSession = () => {
    // Log the session activity automatically
    addWellnessEntry({
      id: generateId(),
      date: new Date().toISOString().split("T")[0],
      energyLevel,
      moods: [],
      notes: `Completed: ${premiumSessions.find(s => s.type === activeSession)?.title || "guided session"}`,
      activities: [premiumSessions.find(s => s.type === activeSession)?.title || "guided session"],
    });
    setTodaysEntry(getTodaysWellness());
    setActiveSession(null);
    setActiveActivity(null);
  };

  const closeModal = () => {
    setShowEnergyLog(false);
    setActiveActivity(null);
    setMoods([]);
    setMoodNote("");
  };

  const energies = [1, 2, 3, 4, 5];
  const energyLabels = ["Drained", "Low", "Okay", "Good", "Amazing"];

  if (!ready) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-brand-dark sm:text-3xl">Move, Stretch, & Strengthen</h1>
            <p className="text-sm text-brand-muted">
              {todaysEntry
                ? "You've checked in today! 🌟"
                : "How are you feeling right now?"}
            </p>
          </div>
          <button
            onClick={() => setShowEnergyLog(true)}
            className="btn-primary"
          >
            {todaysEntry ? "🔄 Update check-in" : "🌿 Check in"}
          </button>
        </div>

        {/* Energy Log Modal */}
        {showEnergyLog && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-sm sm:items-center"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl slide-up">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold text-brand-dark">How are you?</h2>
                <button onClick={closeModal} className="btn-ghost p-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="space-y-5">
                {/* Energy */}
                <div>
                  <p className="mb-2 text-sm font-medium text-brand-dark">Energy level</p>
                  <div className="flex gap-2">
                    {energies.map((n) => (
                      <button
                        key={n}
                        onClick={() => setEnergyLevel(n)}
                        className={`flex flex-1 flex-col items-center rounded-xl p-3 transition-all ${
                          energyLevel === n
                            ? "bg-brand-deep text-white shadow-md"
                            : "bg-brand-cream/20 text-brand-muted hover:bg-brand-warm"
                        }`}
                      >
                        <span className="text-lg">
                          {n <= 1 ? "😴" : n === 2 ? "😐" : n === 3 ? "🙂" : n === 4 ? "😊" : "⚡"}
                        </span>
                        <span className="mt-1 text-[10px] font-medium">{energyLabels[n - 1]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood (multi-select) */}
                <div>
                  <p className="mb-2 text-sm font-medium text-brand-dark">Mood (optional, pick all that fit)</p>
                  <div className="flex flex-wrap gap-2">
                    {["Focused", "Calm", "Anxious", "Tired", "Happy", "Meh", "Stressed", "Curious", "Grateful", "Frustrated"].map((m) => {
                      const isSelected = moods.includes(m);
                      return (
                        <button
                          key={m}
                          onClick={() => {
                            setMoods((prev) =>
                              isSelected ? prev.filter((x) => x !== m) : [...prev, m]
                            );
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-brand-warm text-brand-deep ring-2 ring-brand-light/30"
                              : "bg-brand-cream/20 text-brand-muted hover:bg-brand-cream/40"
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                  {moods.length > 0 && (
                    <p className="mt-1.5 text-xs text-brand-deep">
                      {moods.length} selected: {moods.join(", ")}
                    </p>
                  )}
                </div>

                {/* Quick activity */}
                {!activeActivity && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-brand-dark">
                      Quick activity?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activities.slice(0, 4).map((a) => (
                        <button
                          key={a.type}
                          onClick={() => setActiveActivity(a.type)}
                          className="rounded-full bg-brand-warm/40 px-3 py-1.5 text-xs font-medium text-brand-deep transition-all hover:bg-brand-warm"
                        >
                          {a.emoji} {a.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeActivity && (
                  <div className="card-warm rounded-xl">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-brand-dark">
                        {activities.find((a) => a.type === activeActivity)?.emoji}{" "}
                        {activities.find((a) => a.type === activeActivity)?.title}
                      </p>
                      <button onClick={() => setActiveActivity(null)} className="text-xs text-brand-muted">Remove</button>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <p className="mb-2 text-sm font-medium text-brand-dark">Notes (optional)</p>
                  <textarea
                    value={moodNote}
                    onChange={(e) => setMoodNote(e.target.value)}
                    placeholder="Anything on your mind?"
                    rows={2}
                    className="input-field resize-none"
                  />
                </div>

                <button onClick={logEnergy} className="btn-primary w-full">
                  {todaysEntry ? "Update check-in" : "Log check-in"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Activities Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <div
              key={activity.type}
              className="card cursor-pointer transition-all hover:border-brand-light/40 hover:shadow-md"
              onClick={() => {
                setShowEnergyLog(true);
                setActiveActivity(activity.type);
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-2xl">{activity.emoji}</span>
                <span className="rounded-full bg-brand-warm/60 px-2 py-0.5 text-xs font-medium text-brand-deep">
                  {activity.duration}
                </span>
              </div>
              <h3 className="mb-1 font-serif text-base font-medium text-brand-dark">
                {activity.title}
              </h3>
              <p className="text-xs leading-relaxed text-brand-muted">{activity.description}</p>
            </div>
          ))}
        </div>

        {/* ── Premium Guided Sessions ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg font-semibold text-brand-dark">Guided Reset Experiences</h2>
            <span className="rounded-full bg-brand-gold/15 px-2 py-0.5 text-[10px] font-medium text-brand-deep">Premium</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {premiumSessions.map((session) => {
              const isLocked = session.premiumLocked && !premium.isPremium;
              return (
              <div
                key={session.type}
                className={`card relative overflow-hidden transition-all ${
                  isLocked
                    ? "cursor-default opacity-70"
                    : "cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                } bg-gradient-to-br ${session.gradient}`}
                onClick={() => {
                  if (isLocked) return;
                  setActiveSession(session.type);
                }}
              >
                {/* Premium lock overlay */}
                {isLocked && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/60 backdrop-blur-[2px]">
                    <span className="mb-1 text-2xl">✨</span>
                    <span className="mb-2 text-xs font-medium text-brand-deep">Premium</span>
                    <Link
                      to="/upgrade"
                      className="rounded-full bg-brand-deep px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-brand-dark"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Unlock →
                    </Link>
                  </div>
                )}
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-2xl">{session.emoji}</span>
                  <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium text-brand-deep">
                    {session.duration}
                  </span>
                </div>
                <h3 className="mb-1 font-serif text-base font-medium text-brand-dark">
                  {session.title}
                </h3>
                <p className="text-xs leading-relaxed text-brand-muted">{session.description}</p>
              </div>
            )})}
          </div>
        </div>

        {/* Guided Session Modal */}
        {activeSession && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-sm sm:items-center"
            onClick={(e) => e.target === e.currentTarget && setActiveSession(null)}
          >
            <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl slide-up">
              <GuidedSession
                type={activeSession}
                onComplete={completeSession}
                onExit={() => setActiveSession(null)}
              />
            </div>
          </div>
        )}

        {/* Energy History */}
        {history.length > 0 && (
          <div className="card">
            <h2 className="mb-3 font-serif text-lg font-medium text-brand-dark">Recent Check-ins</h2>
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-lg bg-brand-cream/20 px-3 py-2">
                  <NectarMeter level={entry.energyLevel} size={32} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-brand-dark">
                      Energy: {entry.energyLevel}/5
                      {entry.moods && entry.moods.length > 0 && <span className="ml-2 font-normal text-brand-muted">· {entry.moods.join(", ")}</span>}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {new Date(entry.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {entry.activities.length > 0 && ` · ${entry.activities.join(", ")}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Energy trend visualization */}
        {history.length >= 3 && (
          <div className="card">
            <h2 className="mb-3 font-serif text-lg font-medium text-brand-dark">Energy Trend</h2>
            <div className="flex items-end gap-2">
              {history.slice(0, 7).reverse().map((entry, i) => (
                <div key={entry.id} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs text-brand-muted">{entry.energyLevel}</span>
                  <div
                    className="w-full rounded-lg transition-all"
                    style={{
                      height: `${entry.energyLevel * 18}px`,
                      backgroundColor:
                        entry.energyLevel <= 2 ? "#fca5a5" : entry.energyLevel === 3 ? "#fbbf24" : "#86efac",
                    }}
                  />
                  <span className="text-[10px] text-brand-muted">
                    {new Date(entry.date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}