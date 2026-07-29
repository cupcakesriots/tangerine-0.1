import { useState } from "react";

type Phase = "spill" | "reflect" | "release";
interface Props { onComplete: () => void; onExit: () => void; }

// Gentle reflection prompts — objective, not therapeutic
const REFLECT_PROMPTS = [
  "Which of these thoughts feels heaviest right now?",
  "Is there a common theme threading through these?",
  "Which of these thoughts is a fact, and which is a story you're telling yourself?",
  "What would change if one of these worries was no longer yours to carry?",
];

export function BrainDump({ onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>("spill");
  const [text, setText] = useState("");
  const [reflection, setReflection] = useState("");
  const [prompt, setPrompt] = useState(REFLECT_PROMPTS[0]);
  const [released, setReleased] = useState(false);

  const goReflect = () => {
    if (text.trim().length < 5) return;
    setPrompt(REFLECT_PROMPTS[Math.floor(Math.random() * REFLECT_PROMPTS.length)]);
    setPhase("reflect");
  };

  const goRelease = () => { setPhase("release"); };
  const doRelease = () => { setReleased(true); };

  const reset = () => { setPhase("spill"); setText(""); setReflection(""); setReleased(false); };

  if (phase === "release") return (
    <div className="card-glass text-center p-8 space-y-5 slide-up">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-warm/40">
        <span className="text-4xl">{released ? "🕊️" : "✋"}</span>
      </div>
      <h2 className="font-serif text-xl font-semibold text-brand-dark">{released ? "Released" : "Ready to release?"}</h2>
      {!released ? (
        <>
          <p className="text-sm text-brand-muted max-w-sm mx-auto">
            You've named your thoughts and noticed patterns. Now, imagine placing these words on a leaf and watching them drift downstream. 
            They served their purpose. You don't need to carry them anymore.
          </p>
          <div className="rounded-xl bg-brand-cream/20 p-4 max-h-32 overflow-y-auto">
            <p className="text-xs text-brand-muted italic whitespace-pre-wrap line-through decoration-brand-rose/30">{text.slice(0, 300)}{text.length > 300 ? "..." : ""}</p>
          </div>
          <button onClick={doRelease} className="btn-primary">Let them go 🍃</button>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-sm text-brand-deep">The thoughts have been acknowledged. They are now released.</p>
            <div className="rounded-xl bg-gradient-to-b from-brand-cream/40 to-transparent p-4">
              <p className="text-xs text-brand-muted opacity-40 whitespace-pre-wrap">{text.slice(0, 200)}{text.length > 200 ? "..." : ""}</p>
            </div>
          </div>
          <button onClick={onComplete} className="btn-primary">Log & return</button>
        </>
      )}
      <button onClick={reset} className="btn-ghost text-xs w-full">Start fresh</button>
    </div>
  );

  return (
    <div className="card-glass p-6 space-y-5">
      <div className="flex items-center gap-2">
        {(["spill", "reflect", "release"] as Phase[]).map((p, i) => (
          <div key={p} className="flex items-center gap-1 flex-1">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-all ${
              phase === p ? "bg-brand-deep text-white" : phaseIdx(phase) > i ? "bg-brand-leaf/20 text-brand-leaf" : "bg-brand-cream/30 text-brand-muted"
            }`}>{i + 1}</div>
            {i < 2 && <div className="h-px flex-1 bg-brand-cream/30" />}
          </div>
        ))}
      </div>

      {phase === "spill" ? (
        <>
          <h2 className="font-serif text-lg font-semibold text-brand-dark">Spill everything</h2>
          <p className="text-sm text-brand-muted">No filter. No organization. Just write whatever is occupying mental space right now. This is for your eyes only — it won't be saved.</p>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Everything on my mind right now..."
            rows={6} className="input-field resize-none text-sm" autoFocus />
          <button onClick={goReflect} disabled={text.trim().length < 5} className="btn-primary w-full disabled:opacity-40">Continue →</button>
        </>
      ) : (
        <>
          <h2 className="font-serif text-lg font-semibold text-brand-dark">Notice patterns</h2>
          <p className="text-sm text-brand-muted italic">"{prompt}"</p>
          <div className="rounded-xl bg-brand-cream/20 p-4 max-h-24 overflow-y-auto">
            <p className="text-xs text-brand-muted whitespace-pre-wrap">{text.slice(0, 300)}{text.length > 300 ? "..." : ""}</p>
          </div>
          <textarea value={reflection} onChange={e => setReflection(e.target.value)}
            placeholder="What do you notice...?"
            rows={3} className="input-field resize-none text-sm" autoFocus />
          <button onClick={goRelease} className="btn-primary w-full">Continue to release →</button>
        </>
      )}
      <button onClick={onExit} className="btn-ghost text-xs w-full">← Back</button>
    </div>
  );
}

function phaseIdx(p: Phase) { return ["spill", "reflect", "release"].indexOf(p); }
