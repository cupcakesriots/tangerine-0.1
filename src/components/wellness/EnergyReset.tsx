import { useState, useEffect, useRef } from "react";

interface Props { onComplete: () => void; onExit: () => void; }

type Stage = "shakeout" | "breathe" | "reframe" | "done";

const REFRAMES = [
  "You are not behind. You are exactly where you need to be.",
  "Small steps are still steps. Progress doesn't need to be loud.",
  "Your energy is not a measure of your worth. You're doing enough.",
  "Pause is productive. Rest is part of the rhythm, not a break from it.",
  "This moment — right now — you are safe. You are capable. You are here.",
];

export function EnergyReset({ onComplete, onExit }: Props) {
  const [stage, setStage] = useState<Stage>("shakeout");
  const [remaining, setRemaining] = useState(45);
  const [running, setRunning] = useState(false);
  const [shakeIdx, setShakeIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const shakeEmojis = ["🫳", "🤲", "🤸", "🫶", "👐"];
  const stageDurations: Record<Stage, number> = { shakeout: 45, breathe: 30, reframe: 0, done: 0 };

  useEffect(() => {
    if (!running || stage === "reframe" || stage === "done") return;
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current!); advanceStage(); return 0; }
        return prev - 1;
      });
      if (stage === "shakeout") setShakeIdx(i => (i + 1) % shakeEmojis.length);
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, stage]);

  const advanceStage = () => {
    if (stage === "shakeout") { setStage("breathe"); setRemaining(30); }
    else if (stage === "breathe") { setStage("reframe"); setRunning(false); }
    else { setStage("done"); }
  };

  const start = () => { setRunning(true); if (stage === "done") setStage("shakeout"); setRemaining(stageDurations[stage]); };

  if (stage === "done") return (
    <div className="card-glass text-center p-8 space-y-4 slide-up">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-warm/40"><span className="text-4xl">✨</span></div>
      <h2 className="font-serif text-xl font-semibold text-brand-dark">Energy reset complete</h2>
      <p className="text-sm text-brand-muted">Two minutes of intentional care. Notice any shift — even the smallest. You gave yourself this.</p>
      <button onClick={onComplete} className="btn-primary">Log & return</button>
    </div>
  );

  const totalElapsed = stage === "shakeout" ? 45 - remaining : stage === "breathe" ? 45 + (30 - remaining) : 75;
  const progress = Math.min((totalElapsed / 75) * 100, 100);

  return (
    <div className="card-glass p-6 space-y-5 text-center">
      <span className="text-xs text-brand-muted font-medium">2 min reset · Micro-break</span>
      <div className="w-full bg-brand-cream/30 rounded-full h-1.5"><div className="bg-brand-gold h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} /></div>
      <div className="space-y-4 min-h-[220px] flex flex-col justify-center">
        {stage === "shakeout" && (
          <>
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-warm/40 transition-all duration-300" style={{ transform: `rotate(${shakeIdx * 5}deg) scale(${1 + shakeIdx * 0.02})` }}>
              <span className="text-5xl transition-all">{shakeEmojis[shakeIdx]}</span>
            </div>
            <h3 className="font-serif text-lg font-semibold text-brand-dark">Physical shakeout</h3>
            <p className="text-sm text-brand-muted max-w-sm mx-auto">Shake out your hands. Roll your shoulders. Wiggle your fingers. Let your body release stored tension.</p>
            <div className="flex items-center justify-center gap-1 text-brand-dark"><span className="text-2xl font-light tabular-nums">{Math.ceil(remaining)}</span><span className="text-xs text-brand-muted">s</span></div>
          </>
        )}
        {stage === "breathe" && (
          <>
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-leaf/10 animate-gentle-pulse">
              <span className="text-5xl">🌬️</span>
            </div>
            <h3 className="font-serif text-lg font-semibold text-brand-dark">Breathe</h3>
            <p className="text-sm text-brand-muted max-w-sm mx-auto">Inhale slowly — 4 counts. Exhale fully — 6 counts. Let each exhale carry away what you no longer need.</p>
            <div className="flex items-center justify-center gap-1 text-brand-dark"><span className="text-2xl font-light tabular-nums">{Math.ceil(remaining)}</span><span className="text-xs text-brand-muted">s</span></div>
          </>
        )}
        {stage === "reframe" && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-gold/10">
              <span className="text-4xl">💭</span>
            </div>
            <h3 className="font-serif text-lg font-semibold text-brand-dark">A gentle thought</h3>
            <p className="text-sm text-brand-muted max-w-sm mx-auto italic">"{REFRAMES[remaining % REFRAMES.length]}"</p>
          </>
        )}
      </div>
      <div className="flex gap-2 justify-center">
        {!running ? (
          <button onClick={start} className="btn-primary text-sm">{totalElapsed === 0 ? "Begin reset" : "Resume"}</button>
        ) : (
          <button onClick={() => { setRunning(false); if (intervalRef.current) clearInterval(intervalRef.current); }} className="btn-secondary text-sm">Pause</button>
        )}
        {stage === "reframe" && <button onClick={() => setStage("done")} className="btn-primary text-sm">Complete ✨</button>}
        <button onClick={onExit} className="btn-ghost text-sm">End</button>
      </div>
    </div>
  );
}
