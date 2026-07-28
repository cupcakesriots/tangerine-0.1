import { useState, useEffect, useRef, useCallback } from "react";

type Phase = "inhale" | "hold" | "exhale" | "rest";

interface Props { onComplete: () => void; onExit: () => void; }

const DURATIONS = { "3": { inhale: 4, hold: 4, exhale: 4, rest: 4 }, "5": { inhale: 4, hold: 4, exhale: 4, rest: 4 }, "7": { inhale: 4, hold: 7, exhale: 8, rest: 0 } };
const PHASE_LABELS: Record<Phase, string> = { inhale: "Breathe in", hold: "Hold gently", exhale: "Breathe out", rest: "Rest" };
const PHASE_EMOJI: Record<Phase, string> = { inhale: "🌬️", hold: "✨", exhale: "🍃", rest: "☁️" };

function cn(...c: (string | boolean | undefined | null)[]) { return c.filter(Boolean).join(" "); }

export function BoxBreathingCoach({ onComplete, onExit }: Props) {
  const [variant, setVariant] = useState<"3" | "5" | "7" | null>(null);
  const [phase, setPhase] = useState<Phase>("inhale");
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);
  const totalRounds = 5;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseIdx = ["inhale", "hold", "exhale", "rest"] as Phase[];
  const phaseRef = useRef(0);
  const cycleRef = useRef(0);

  const startVariant = (v: "3" | "5" | "7") => {
    setVariant(v);
    const dur = DURATIONS[v];
    const p = phaseIdx[0];
    setPhase(p); setRemaining(dur[p]); setRunning(true); setRound(0);
    phaseRef.current = 0; cycleRef.current = 0;
  };

  const tick = useCallback(() => {
    if (!variant) return;
    const dur = DURATIONS[variant];
    setRemaining(prev => {
      if (prev <= 1) {
        const nextPhaseIdx = (phaseRef.current + 1) % phaseIdx.length;
        const nextPhase = phaseIdx[nextPhaseIdx];
        if (nextPhase === "inhale") {
          cycleRef.current++;
          setRound(cycleRef.current);
          if (cycleRef.current >= totalRounds) { setRunning(false); setDone(true); clearInterval(intervalRef.current!); return 0; }
        }
        phaseRef.current = nextPhaseIdx;
        setPhase(nextPhase);
        return dur[nextPhase];
      }
      return prev - 1;
    });
  }, [variant]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  const progress = variant ? ((round * 4 + phaseIdx.indexOf(phase)) / (totalRounds * 4)) * 100 : 0;
  const circleSize = 180; const radius = 80; const circ = 2 * Math.PI * radius;
  const breathScale = phase === "inhale" ? 1 : phase === "exhale" ? 0.55 : phase === "hold" ? 1 : 0.55;
  const animClass = running ? (phase === "inhale" ? "animate-breath-in" : phase === "exhale" ? "animate-breath-out" : "animate-breath-hold") : "";

  if (done) return (
    <div className="card-glass text-center p-8 space-y-4 slide-up">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-leaf/10">
        <span className="text-4xl">🌿</span>
      </div>
      <h2 className="font-serif text-xl font-semibold text-brand-dark">{variant} minute session complete</h2>
      <p className="text-sm text-brand-muted">Your nervous system thanks you. Notice any shift — however subtle — and carry it forward.</p>
      <button onClick={onComplete} className="btn-primary">Log & return</button>
    </div>
  );

  if (!variant) return (
    <div className="card-glass p-6 space-y-5">
      <h2 className="font-serif text-xl font-semibold text-brand-dark text-center">Box Breathing</h2>
      <p className="text-sm text-brand-muted text-center max-w-xs mx-auto">A simple rhythm to calm your nervous system. Choose the duration that feels right.</p>
      <div className="grid gap-3">
        {(["3", "5", "7"] as const).map(v => (
          <button key={v} onClick={() => startVariant(v)} className="flex items-center gap-3 rounded-xl bg-brand-warm/30 p-4 hover:bg-brand-warm/50 transition-all text-left">
            <span className="text-3xl">{v === "3" ? "🌱" : v === "5" ? "🌊" : "🏔️"}</span>
            <div><p className="font-medium text-brand-dark">{v} minutes</p><p className="text-xs text-brand-muted">{v === "3" ? "A quick reset" : v === "5" ? "Standard practice" : "Deep calm"}</p></div>
            <span className="ml-auto text-brand-muted">→</span>
          </button>
        ))}
      </div>
      <button onClick={onExit} className="btn-ghost text-xs w-full">← Back to wellness</button>
    </div>
  );

  return (
    <div className="card-glass p-6 space-y-6 text-center">
      <div className="flex items-center justify-between"><span className="text-xs text-brand-muted font-medium">Round {round + 1}/{totalRounds}</span><span className="text-xs text-brand-muted">{variant} min</span></div>
      <div className="w-full bg-brand-cream/30 rounded-full h-1.5"><div className="bg-brand-deep h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} /></div>
      <div className="relative flex items-center justify-center" style={{ height: circleSize }}>
        <svg width={circleSize} height={circleSize} viewBox="0 0 180 180" className="absolute">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#f5ede0" strokeWidth="2" />
          <circle cx="90" cy="90" r={radius} fill="none" stroke="url(#breath-grad)" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - remaining / DURATIONS[variant][phase])}
            style={{ transition: "stroke-dashoffset 1s linear" }} />
          <defs><linearGradient id="breath-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ca4e30" /><stop offset="100%" stopColor="#e08b35" />
          </linearGradient></defs>
        </svg>
        <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-700 ease-in-out"
          style={{ transform: `scale(${breathScale})` }}>
          <span className="text-3xl mb-1">{PHASE_EMOJI[phase]}</span>
          <span className="font-serif text-xl font-semibold text-brand-dark">{PHASE_LABELS[phase]}</span>
          <span className="text-3xl font-light text-brand-dark tabular-nums">{remaining}</span>
        </div>
      </div>
      <div className="flex gap-2 justify-center">
        {running ? (
          <button onClick={() => { setRunning(false); if (intervalRef.current) clearInterval(intervalRef.current); }} className="btn-secondary text-sm">Pause</button>
        ) : (
          <button onClick={() => { setRunning(true); }} className="btn-primary text-sm">Resume</button>
        )}
        <button onClick={onExit} className="btn-ghost text-sm">End session</button>
      </div>
    </div>
  );
}
