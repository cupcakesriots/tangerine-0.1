import { useState, useEffect, useRef } from "react";

interface Props { onComplete: () => void; onExit: () => void; }

type Stage = "relax" | "gratitude" | "done";

const RELAX_PROMPTS = [
  { part: "Your forehead", instruction: "Soften the space between your eyebrows. Let your forehead feel smooth and wide." },
  { part: "Your jaw", instruction: "Unclench. Let your teeth part slightly. Your tongue can rest at the roof of your mouth." },
  { part: "Your shoulders", instruction: "Let them fall away from your ears. Feel the weight of your arms being fully supported." },
  { part: "Your hands", instruction: "Uncurl your fingers. Palms resting open. Nothing to hold onto right now." },
  { part: "Your breath", instruction: "Slow it down. Let each exhale be longer than the inhale. Your body knows how to rest." },
];

const GRATITUDE_SEEDS = [
  "One small moment today that felt okay...",
  "Something your body did for you today...",
  "A person, a pet, or a place that helped...",
  "A challenge you navigated, however imperfectly...",
  "A simple pleasure — a taste, a sound, a warmth...",
];

export function EveningWindDown({ onComplete, onExit }: Props) {
  const [stage, setStage] = useState<Stage>("relax");
  const [relaxIdx, setRelaxIdx] = useState(0);
  const [remaining, setRemaining] = useState(40);
  const [running, setRunning] = useState(false);
  const [gratitude, setGratitude] = useState("");
  const [overlay, setOverlay] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running || stage !== "relax") return;
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current!); advanceRelax(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, relaxIdx, stage]);

  // Warm dimming overlay effect
  useEffect(() => {
    if (stage !== "relax") return;
    const step = 1 / (RELAX_PROMPTS.length * 40); // gradual dimming
    const t = setInterval(() => { setOverlay(prev => Math.min(prev + step, 0.18)); }, 1000);
    return () => clearInterval(t);
  }, [stage]);

  const advanceRelax = () => {
    if (relaxIdx + 1 >= RELAX_PROMPTS.length) { setStage("gratitude"); setRunning(false); return; }
    setRelaxIdx(relaxIdx + 1); setRemaining(40);
  };

  const prompt = RELAX_PROMPTS[relaxIdx];

  if (stage === "done") return (
    <div className="card-glass text-center p-8 space-y-4 slide-up">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-deep/5"><span className="text-4xl">🌙</span></div>
      <h2 className="font-serif text-xl font-semibold text-brand-dark">Wind-down complete</h2>
      <p className="text-sm text-brand-muted">Your body is settling. Your mind has been given space. Sleep well — you've done enough today.</p>
      <button onClick={onComplete} className="btn-primary">Log & return</button>
    </div>
  );

  return (
    <div className="relative">
      {/* Dimming overlay */}
      {overlay > 0 && (
        <div className="pointer-events-none fixed inset-0 z-40 transition-all duration-[2000ms]" style={{ backgroundColor: `rgba(30, 20, 10, ${overlay})` }} />
      )}
      <div className="relative z-50 card-glass p-6 space-y-5 text-center">
        <span className="text-xs text-brand-muted font-medium">Evening ritual · ~5 min</span>

        {stage === "relax" && (
          <>
            <div className="w-full bg-brand-cream/30 rounded-full h-1.5">
              <div className="bg-brand-deep h-1.5 rounded-full transition-all duration-1000" style={{ width: `${((relaxIdx + (1 - remaining / 40)) / RELAX_PROMPTS.length) * 100}%` }} />
            </div>
            <div className="space-y-4 min-h-[200px] flex flex-col justify-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-warm/30">
                <span className="text-4xl">🕯️</span>
              </div>
              <h3 className="font-serif text-lg font-semibold text-brand-dark">{prompt.part}</h3>
              <p className="text-sm text-brand-muted max-w-sm mx-auto leading-relaxed">{prompt.instruction}</p>
              <div className="flex items-center justify-center gap-1 text-brand-dark">
                <span className="text-2xl font-light tabular-nums">{Math.ceil(remaining)}</span>
                <span className="text-xs text-brand-muted">s</span>
              </div>
            </div>
          </>
        )}

        {stage === "gratitude" && (
          <div className="space-y-5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-gold/10">
              <span className="text-4xl">💫</span>
            </div>
            <h3 className="font-serif text-lg font-semibold text-brand-dark">Evening gratitude</h3>
            <p className="text-sm text-brand-muted italic">"{GRATITUDE_SEEDS[Math.floor(Math.random() * GRATITUDE_SEEDS.length)]}"</p>
            <textarea value={gratitude} onChange={e => setGratitude(e.target.value)}
              placeholder="Write one thing you're thankful for..."
              rows={3} className="input-field resize-none text-sm" autoFocus />
            <button onClick={() => setStage("done")} className="btn-primary w-full">Complete wind-down 🌙</button>
          </div>
        )}

        <div className="flex gap-2 justify-center">
          {stage === "relax" && !running ? (
            <button onClick={() => setRunning(true)} className="btn-primary text-sm">{relaxIdx === 0 && remaining === 40 ? "Begin wind-down" : "Resume"}</button>
          ) : stage === "relax" && running ? (
            <button onClick={() => { setRunning(false); if (intervalRef.current) clearInterval(intervalRef.current); }} className="btn-secondary text-sm">Pause</button>
          ) : null}
          {stage === "relax" && <button onClick={advanceRelax} className="btn-ghost text-sm">Skip →</button>}
          <button onClick={onExit} className="btn-ghost text-sm">End</button>
        </div>
      </div>
    </div>
  );
}
