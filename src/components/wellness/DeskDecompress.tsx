import { useState, useEffect, useRef } from "react";

interface Pose { name: string; emoji: string; instruction: string; duration: number; }
interface Props { onComplete: () => void; onExit: () => void; }

const POSES: Pose[] = [
  { name: "Neck Rolls", emoji: "🔄", instruction: "Slowly roll your neck in gentle circles. Let your chin drop to your chest, then roll side to side. Three times each direction.", duration: 45 },
  { name: "Shoulder Shrugs", emoji: "⬆️", instruction: "Lift both shoulders toward your ears. Hold for a breath, then let them drop completely. Feel the weight release.", duration: 40 },
  { name: "Seated Twist", emoji: "🌀", instruction: "Sit tall. Place your right hand behind you, left hand on your right knee. Gently twist to the right. Breathe. Then switch sides.", duration: 60 },
  { name: "Wrist & Finger Stretch", emoji: "🤲", instruction: "Extend one arm forward, palm up. Gently pull back each finger. Circle your wrists. Switch hands.", duration: 50 },
  { name: "Seated Cat-Cow", emoji: "🐱", instruction: "On inhale: arch your back, lift your chest, look gently up. On exhale: round your spine, tuck your chin. Flow slowly.", duration: 55 },
  { name: "Gentle Forward Fold", emoji: "🙇", instruction: "Let your upper body drape forward over your thighs. Arms hang loose. Neck completely relaxed. Just breathe.", duration: 50 },
];

export function DeskDecompress({ onComplete, onExit }: Props) {
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(POSES[0].duration);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current!); advancePose(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, idx]);

  const advancePose = () => {
    if (idx + 1 >= POSES.length) { setDone(true); setRunning(false); return; }
    const next = idx + 1;
    setIdx(next); setRemaining(POSES[next].duration);
  };

  const skip = () => advancePose();
  const pose = POSES[idx];
  const progress = ((POSES.length - idx - (remaining / pose.duration)) / POSES.length) * 100;

  if (done) return (
    <div className="card-glass text-center p-8 space-y-4 slide-up">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-leaf/10"><span className="text-4xl">🙏</span></div>
      <h2 className="font-serif text-xl font-semibold text-brand-dark">Desk decompress complete</h2>
      <p className="text-sm text-brand-muted">Your body has moved through six gentle releases. Notice any ease in your shoulders, neck, or breath.</p>
      <button onClick={onComplete} className="btn-primary">Log & return</button>
    </div>
  );

  return (
    <div className="card-glass p-6 space-y-5 text-center">
      <div className="flex items-center justify-between">
        <span className="text-xs text-brand-muted font-medium">Pose {idx + 1}/{POSES.length}</span>
        <span className="text-xs text-brand-muted">~5 min</span>
      </div>
      <div className="w-full bg-brand-cream/30 rounded-full h-1.5"><div className="bg-brand-gold h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} /></div>
      <div className="space-y-4">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-warm/40 transition-all duration-500">
          <span className="text-5xl">{pose.emoji}</span>
        </div>
        <h3 className="font-serif text-lg font-semibold text-brand-dark">{pose.name}</h3>
        <p className="text-sm text-brand-muted max-w-sm mx-auto leading-relaxed">{pose.instruction}</p>
        <div className="flex items-center justify-center gap-1 text-brand-dark">
          <span className="text-2xl font-light tabular-nums">{Math.ceil(remaining)}</span>
          <span className="text-xs text-brand-muted">seconds</span>
        </div>
      </div>
      <div className="flex gap-2 justify-center">
        {!running ? (
          <button onClick={() => setRunning(true)} className="btn-primary text-sm">{remaining < pose.duration ? "Resume" : "Begin"}</button>
        ) : (
          <button onClick={() => { setRunning(false); if (intervalRef.current) clearInterval(intervalRef.current); }} className="btn-secondary text-sm">Pause</button>
        )}
        <button onClick={skip} className="btn-ghost text-sm">Skip →</button>
        <button onClick={onExit} className="btn-ghost text-sm">End</button>
      </div>
    </div>
  );
}
