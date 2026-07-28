import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getOnboarding, saveOnboarding, isOnboardingComplete, type OnboardingData } from "~/lib/storage";

export const Route = createFileRoute("/")({ component: OnboardingPage });

const energyOptions = [
  { value: "morning", label: "🌅 Morning — I'm sharpest after waking up" },
  { value: "afternoon", label: "☀️ Afternoon — I hit my stride midday" },
  { value: "evening", label: "🌙 Evening — I come alive at night" },
];
const painPointOptions = [
  { value: "rigid-schedules", label: "Rigid schedules feel suffocating" },
  { value: "guilt", label: "I feel guilty when I don't finish everything" },
  { value: "overwhelm", label: "I get overwhelmed by big task lists" },
  { value: "focus", label: "I struggle to stay focused" },
  { value: "energy", label: "My energy varies unpredictably" },
  { value: "procrastination", label: "I put things off until the last minute" },
  { value: "burnout", label: "I'm recovering from or worried about burnout" },
  { value: "planning", label: "I don't know how to break down big projects" },
];
const nudgeOptions = [
  { value: "gentle", label: "🎐 Gentle whispers — soft reminders, no pressure" },
  { value: "structured", label: "📋 Structured pushes — clear, friendly prompts" },
  { value: "both", label: "🫂 A mix — gentle most days, structured when needed" },
];

type Step = "welcome" | "energy" | "pain-points" | "nudge-style" | "quiet-hours" | "name" | "done";

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [data, setData] = useState<Partial<OnboardingData>>({
    energyPeak: "morning", painPoints: [], nudgeStyle: "gentle",
    quietHoursStart: "22:00", quietHoursEnd: "07:00", name: "",
  });
  const [checked, setChecked] = useState(false);
  const [showPhilosophy, setShowPhilosophy] = useState(false);

  useEffect(() => {
    if (isOnboardingComplete()) navigate({ to: "/dashboard", replace: true });
    else setChecked(true);
  }, [navigate]);

  const update = (partial: Partial<OnboardingData>) => setData((d) => ({ ...d, ...partial }));
  const togglePainPoint = (value: string) => setData((d) => ({
    ...d, painPoints: d.painPoints?.includes(value) ? d.painPoints.filter((p) => p !== value) : [...(d.painPoints || []), value],
  }));
  const goNext = () => { const steps: Step[] = ["welcome", "energy", "pain-points", "nudge-style", "quiet-hours", "name", "done"]; const idx = steps.indexOf(step); if (idx < steps.length - 1) setStep(steps[idx + 1]); };
  const goBack = () => { const steps: Step[] = ["welcome", "energy", "pain-points", "nudge-style", "quiet-hours", "name", "done"]; const idx = steps.indexOf(step); if (idx > 0) setStep(steps[idx - 1]); };
  const finish = () => { saveOnboarding({ ...data, completed: true } as OnboardingData); navigate({ to: "/dashboard", replace: true }); };

  if (!checked) return <div className="flex min-h-dvh items-center justify-center"><div className="animate-float text-5xl">🍊</div></div>;

  const progressIndex = ["welcome", "energy", "pain-points", "nudge-style", "quiet-hours", "name"].indexOf(step);
  const totalSteps = 6;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-brand-ivory via-brand-warm/20 to-brand-ivory p-4">
      <div className="w-full max-w-lg">
        {step !== "welcome" && step !== "done" && (
          <div className="mb-8 flex items-center gap-2">
            <button onClick={goBack} className="btn-ghost p-1" aria-label="Go back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div className="flex-1">
              <div className="h-1.5 rounded-full bg-brand-cream/40">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-brand-light to-brand-deep transition-all duration-500" style={{ width: `${((progressIndex + 1) / totalSteps) * 100}%` }} />
              </div>
            </div>
            <span className="text-xs font-medium text-brand-muted/60">{progressIndex + 1}/{totalSteps}</span>
          </div>
        )}

        {/* Welcome */}
        {step === "welcome" && (
          <div className="slide-up text-center">
            <div className="mb-6 animate-float text-7xl">🍊</div>
            <h1 className="mb-3 text-4xl font-semibold tracking-tight text-brand-dark">
              Welcome to <span className="text-brand-deep">Tangerine</span>
            </h1>
            <p className="mb-2 text-lg text-brand-muted">A planner that adapts to how you <em>actually</em> feel.</p>
            <p className="mb-8 text-sm leading-relaxed text-brand-muted">
              No rigid schedules. No guilt trips. Just a warm companion that helps you match your tasks to your energy.
            </p>
            {/* Decorative feature cards — non-clickable, info-only */}
            <div className="mb-8 grid grid-cols-3 gap-4">
              {[
                { icon: "🧠", title: "Energy-aware", desc: "Tasks matched to your peak hours", grad: "from-brand-warm to-amber-50" },
                { icon: "💛", title: "Shame-free", desc: "No guilt, no pressure, no failure", grad: "from-pink-50 to-rose-50" },
                { icon: "🌱", title: "Sustainable", desc: "Built for the long haul", grad: "from-emerald-50 to-teal-50" },
              ].map((f) => (
                <div key={f.title} className="flex flex-col items-center gap-2 rounded-xl bg-white/50 p-4 shadow-[0_1px_6px_-3px_rgba(0,0,0,0.04)]">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b ${f.grad} text-xl shadow-sm`}>{f.icon}</div>
                  <p className="text-xs font-medium text-brand-dark">{f.title}</p>
                  <p className="text-[10px] leading-relaxed text-brand-muted/70">{f.desc}</p>
                </div>
              ))}
            </div>
            {/* Learn More philosophy link */}
            <button onClick={() => setShowPhilosophy(true)} className="mb-6 text-xs font-medium text-brand-deep underline-offset-2 hover:underline">
              💡 Learn more about the Tangerine philosophy →
            </button>
            <button onClick={goNext} className="btn-primary w-full text-base">
              Let's get started
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        )}

        {/* Energy */}
        {step === "energy" && (
          <div className="slide-up">
            <h2 className="mb-2 text-2xl font-semibold text-brand-dark">When do you feel your best?</h2>
            <p className="mb-6 text-sm text-brand-muted">We'll match important tasks to your peak hours.</p>
            <div className="space-y-3">
              {energyOptions.map((opt) => (
                <button key={opt.value} onClick={() => { update({ energyPeak: opt.value as OnboardingData["energyPeak"] }); goNext(); }}
                  className={`card-elevated w-full text-left ${data.energyPeak === opt.value ? "ring-2 ring-brand-light/30" : "hover:ring-1 hover:ring-brand-light/20"}`}>
                  <span className="text-base font-medium text-brand-dark">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pain Points */}
        {step === "pain-points" && (
          <div className="slide-up">
            <h2 className="mb-2 text-2xl font-semibold text-brand-dark">What gets in the way?</h2>
            <p className="mb-6 text-sm text-brand-muted">Pick any that resonate (skip if none apply).</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {painPointOptions.map((opt) => (
                <button key={opt.value} onClick={() => togglePainPoint(opt.value)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                    data.painPoints?.includes(opt.value)
                      ? "border-brand-deep bg-brand-warm/50 ring-2 ring-brand-light/20 font-medium text-brand-dark"
                      : "border-white/60 bg-white/50 text-brand-muted hover:border-brand-light/30"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <button onClick={goNext} className="btn-primary mt-6 w-full">
              {data.painPoints?.length ? `Got it (${data.painPoints.length} selected)` : "Skip — none of these"}
            </button>
          </div>
        )}

        {/* Nudge Style */}
        {step === "nudge-style" && (
          <div className="slide-up">
            <h2 className="mb-2 text-2xl font-semibold text-brand-dark">How do you like to be nudged?</h2>
            <p className="mb-6 text-sm text-brand-muted">We'll adapt our tone to what works for you.</p>
            <div className="space-y-3">
              {nudgeOptions.map((opt) => (
                <button key={opt.value} onClick={() => { update({ nudgeStyle: opt.value as OnboardingData["nudgeStyle"] }); goNext(); }}
                  className={`card-elevated w-full text-left ${data.nudgeStyle === opt.value ? "ring-2 ring-brand-light/30" : "hover:ring-1 hover:ring-brand-light/20"}`}>
                  <span className="text-base font-medium text-brand-dark">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quiet Hours */}
        {step === "quiet-hours" && (
          <div className="slide-up">
            <h2 className="mb-2 text-2xl font-semibold text-brand-dark">When should we go quiet?</h2>
            <p className="mb-6 text-sm text-brand-muted">No nudges, no reminders — just peace. Change anytime.</p>
            <div className="card-elevated mb-4">
              <label className="mb-2 block text-sm font-medium text-brand-dark">Quiet hours start</label>
              <input type="time" value={data.quietHoursStart} onChange={(e) => update({ quietHoursStart: e.target.value })} className="input-field" />
            </div>
            <div className="card-elevated mb-6">
              <label className="mb-2 block text-sm font-medium text-brand-dark">Quiet hours end</label>
              <input type="time" value={data.quietHoursEnd} onChange={(e) => update({ quietHoursEnd: e.target.value })} className="input-field" />
            </div>
            <button onClick={goNext} className="btn-primary w-full">Looks good</button>
          </div>
        )}

        {/* Name */}
        {step === "name" && (
          <div className="slide-up text-center">
            <h2 className="mb-2 text-2xl font-semibold text-brand-dark">What should we call you?</h2>
            <p className="mb-6 text-sm text-brand-muted">Just so Tangerine feels more like a friend than a tool.</p>
            <input type="text" value={data.name || ""} onChange={(e) => update({ name: e.target.value })}
              placeholder="Your name..." className="input-field mb-6 text-center text-lg"
              onKeyDown={(e) => e.key === "Enter" && finish()} autoFocus />
            <button onClick={finish} className="btn-primary w-full text-base">
              {data.name ? `Start planning, ${data.name}!` : "Let me in!"}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* Philosophy Drawer */}
      {showPhilosophy && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/10 backdrop-blur-sm sm:items-center" onClick={() => setShowPhilosophy(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white/95 p-6 shadow-xl backdrop-blur-2xl sm:rounded-2xl slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold text-brand-dark">🍊 The Tangerine Philosophy</h2>
              <button onClick={() => setShowPhilosophy(false)} className="btn-ghost p-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-brand-dark/80">
              <p><strong>Tangerine</strong> was built for people who don't thrive inside rigid planning systems.</p>
              <p>Instead of forcing you into a fixed schedule, <strong>Tangerine adapts</strong> to how you actually feel, work, and move through the day.</p>
              <p className="flex items-start gap-2"><span>🧠</span> <span><strong>Energy-aware planning</strong> — Tasks are suggested based on your energy levels, not arbitrary deadlines. Your morning peak gets your hardest work.</span></p>
              <p className="flex items-start gap-2"><span>💛</span> <span><strong>Shame-free productivity</strong> — No guilt trips. No failure language. If you need to reschedule, we celebrate your self-awareness.</span></p>
              <p className="flex items-start gap-2"><span>🌱</span> <span><strong>Sustainable rhythms</strong> — This isn't a sprint. Tangerine helps you build planning habits that actually last, by meeting you where you are.</span></p>
              <p className="flex items-start gap-2"><span>🤖</span> <span><strong>Warm AI coaching</strong> — Your AI Coach is trained on empathy, not optimization. It helps you find the next manageable step when you feel stuck or overwhelmed.</span></p>
              <p className="pt-2 text-xs text-brand-muted">Welcome to a kinder way to plan. 🍊</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}