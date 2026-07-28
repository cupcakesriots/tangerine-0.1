import { useState, useEffect, useRef } from "react";

interface Region { id: string; label: string; emoji: string; prompt: string; duration: number; }
interface Props { onComplete: () => void; onExit: () => void; }

const REGIONS: Region[] = [
  { id: "feet", label: "Feet & Ankles", emoji: "🦶", prompt: "Notice your feet on the floor. Feel the weight, the temperature, the contact. No need to change anything.", duration: 35 },
  { id: "legs", label: "Lower Legs", emoji: "🦵", prompt: "Bring your awareness to your calves and shins. Notice any tension or ease. Let them be exactly as they are.", duration: 30 },
  { id: "thighs", label: "Thighs & Hips", emoji: "🧘", prompt: "Feel the support of your chair against your thighs. Notice the hips — the body's center of stability.", duration: 30 },
  { id: "belly", label: "Core & Belly", emoji: "🌊", prompt: "Soften your belly. Let your breath move naturally here. No forcing, no holding — just gentle rise and fall.", duration: 40 },
  { id: "chest", label: "Chest & Heart", emoji: "💛", prompt: "Feel your heartbeat. Your chest rising and falling. Place a gentle hand here if you'd like.", duration: 35 },
  { id: "shoulders", label: "Shoulders", emoji: "🏔️", prompt: "Notice your shoulders. Are they held up? Let them soften. Let them fall away from your ears.", duration: 30 },
  { id: "neck", label: "Neck & Jaw", emoji: "🧵", prompt: "Unclench your jaw. Let your tongue rest. Soften the space behind your eyes. Your neck can release.", duration: 30 },
  { id: "head", label: "Crown", emoji: "👑", prompt: "Feel the top of your head. Imagine a gentle warmth spreading downward. You are here. You are safe.", duration: 30 },
];

export function SomaticGrounding({ onComplete, onExit }: Props) {
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(REGIONS[0].duration);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervals = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalTime = REGIONS.reduce((s, r) => s + r.duration, 0);
  const elapsed = REGIONS.slice(0, idx).reduce((s, r) => s + r.duration, 0) + (REGIONS[idx].duration - remaining);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      intervals.current++;
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current!); advance(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, idx]);

  const advance = () => {
    if (idx + 1 >= REGIONS.length) { setDone(true); setRunning(false); return; }
    setIdx(idx + 1); setRemaining(REGIONS[idx + 1].duration);
  };

  const progress = (elapsed / totalTime) * 100;
  const region = REGIONS[idx];

  if (done) return (
    <div className="card-glass text-center p-8 space-y-4 slide-up">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-leaf/10"><span className="text-4xl">🌿</span></div>
      <h2 className="font-serif text-xl font-semibold text-brand-dark">Body scan complete</h2>
      <p className="text-sm text-brand-muted">You've travelled through eight regions of your body. Wherever you feel most grounded now — stay there a moment longer.</p>
      <button onClick={onComplete} className="btn-primary">Log & return</button>
    </div>
  );

  return (
    <div className="card-glass p-6 space-y-5 text-center">
      <span className="text-xs text-brand-muted font-medium">5–7–8 Grounding · {Math.floor((totalTime - elapsed) / 60)}:{String((totalTime - elapsed) % 60).padStart(2, "0")} remaining</span>
      <div className="w-full bg-brand-cream/30 rounded-full h-1.5"><div className="bg-brand-deep h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} /></div>
      <div className="flex justify-center gap-1 py-2">
        {REGIONS.map((r, i) => (
          <div key={r.id} className={`h-2 rounded-full transition-all duration-500 ${i < idx ? "w-4 bg-brand-deep" : i === idx ? "w-6 bg-brand-gold animate-gentle-pulse" : "w-2 bg-brand-cream/40"}`} />
        ))}
      </div>
      <div className="space-y-4 min-h-[200px] flex flex-col justify-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-warm/40 transition-all duration-700">
          <span className="text-4xl">{region.emoji}</span>
        </div>
        <h3 className="font-serif text-lg font-semibold text-brand-dark">{region.label}</h3>
        <p className="text-sm text-brand-muted max-w-sm mx-auto leading-relaxed italic">"{region.prompt}"</p>
        <div className="flex items-center justify-center gap-1 text-brand-dark">
          <span className="text-2xl font-light tabular-nums">{Math.ceil(remaining)}</span>
          <span className="text-xs text-brand-muted">s</span>
        </div>
      </div>
      <div className="flex gap-2 justify-center">
        {!running ? (
          <button onClick={() => setRunning(true)} className="btn-primary text-sm">{idx === 0 && remaining === REGIONS[0].duration ? "Begin body scan" : "Resume"}</button>
        ) : (
          <button onClick={() => { setRunning(false); if (intervalRef.current) clearInterval(intervalRef.current); }} className="btn-secondary text-sm">Pause</button>
        )}
        <button onClick={onExit} className="btn-ghost text-sm">End</button>
      </div>
    </div>
  );
}
