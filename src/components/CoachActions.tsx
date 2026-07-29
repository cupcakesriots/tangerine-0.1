import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { getTasks, updateTask, addTask, type CoachMessage } from "~/lib/storage";

// ── Focus Timer Card ──
export function FocusTimerCard({ msg, onResponse }: { msg: CoachMessage; onResponse: (text: string) => void }) {
  const presets = msg.data?.focusPresets || [5, 10, 15, 25, 45];
  const [duration, setDuration] = useState(msg.data?.focusDuration || 25);
  const [remaining, setRemaining] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = duration * 60;
  const progress = remaining / totalSeconds;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const displayTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference * (1 - progress);

  const start = () => {
    if (isComplete) { setRemaining(duration * 60); setIsComplete(false); }
    setIsRunning(true); setIsPaused(false);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current!); intervalRef.current = null; setIsRunning(false); setIsComplete(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const pause = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsPaused(true); setIsRunning(false);
  };

  const reset = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsRunning(false); setIsPaused(false); setIsComplete(false);
    setRemaining(duration * 60);
  };

  const changeDuration = (mins: number) => { reset(); setDuration(mins); setRemaining(mins * 60); };

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  return (
    <div className="max-w-[90%] rounded-xl bg-white shadow-sm ring-1 ring-brand-cream/30 overflow-hidden border border-brand-light/10">
      <div className="bg-gradient-to-r from-brand-warm/60 to-brand-warm/20 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">⏱️</span>
        <span className="font-serif text-sm font-semibold text-brand-deep tracking-tight">Focus Timer</span>
        {isComplete && <span className="ml-auto rounded-full bg-brand-leaf/15 px-2 py-0.5 text-[10px] font-medium text-brand-leaf">Complete! 🎉</span>}
        {isRunning && <span className="ml-auto rounded-full bg-brand-gold/15 px-2 py-0.5 text-[10px] font-medium text-brand-deep">Running</span>}
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-brand-dark">{msg.content}</p>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button key={p} onClick={() => changeDuration(p)} disabled={isRunning}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-40 ${duration === p && !isRunning ? "bg-brand-deep text-white shadow-sm" : "bg-brand-cream/30 text-brand-muted hover:bg-brand-warm hover:text-brand-dark"}`}>
              {p}min
            </button>
          ))}
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
            <svg width="140" height="140" viewBox="0 0 120 120" className="-rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#f5ede0" strokeWidth="6" />
              <circle cx="60" cy="60" r="54" fill="none" stroke={isComplete ? "#536451" : "url(#timer-grad)"}
                strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 0.5s ease" }} />
              <defs>
                <linearGradient id="timer-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ca4e30" /><stop offset="100%" stopColor="#e08b35" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`font-serif text-2xl font-semibold tracking-tight ${isComplete ? "text-brand-leaf" : "text-brand-dark"}`}>
                {isComplete ? "✓" : displayTime}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {!isRunning && !isPaused && !isComplete && <button onClick={start} className="btn-primary text-xs px-6">▶ Start</button>}
            {isRunning && <button onClick={pause} className="btn-secondary text-xs px-6">⏸ Pause</button>}
            {isPaused && <button onClick={start} className="btn-primary text-xs px-6">▶ Resume</button>}
            {(isPaused || isComplete) && <button onClick={reset} className="btn-ghost text-xs">↺ Reset</button>}
          </div>
        </div>
        {isComplete && (
          <div className="slide-up rounded-xl bg-gradient-to-br from-brand-warm/50 to-emerald-50/40 border border-brand-leaf/20 p-3 text-center">
            <p className="text-sm font-medium text-brand-dark">Focus session complete! 🎉</p>
            <p className="text-xs text-brand-muted mt-1">Your brain just did meaningful work. Take a moment to stretch or hydrate.</p>
          </div>
        )}
        <button onClick={() => { reset(); onResponse(isComplete ? `I completed a ${duration}-minute focus session.` : "I'll use the timer when ready."); }}
          className="btn-ghost text-xs w-full">{isComplete ? "Log this session ✨" : "I'll come back to this →"}</button>
      </div>
    </div>
  );
}

// ── Task Reschedule Card ──
export function TaskRescheduleCard({ msg, onResponse }: { msg: CoachMessage; onResponse: (text: string) => void }) {
  const [actionTaken, setActionTaken] = useState(false);
  const [actionLabel, setActionLabel] = useState("");
  const [changedTasks, setChangedTasks] = useState<{ id: string; name: string; oldDate: string; newDate: string }[]>([]);
  const affectedTasks = msg.data?.affectedTasks || [];
  const affectedCount = msg.data?.affectedTaskCount || affectedTasks.length;

  const moveToTomorrow = () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const changed: typeof changedTasks = [];
    affectedTasks.forEach((t: any) => { updateTask(t.id, { date: tomorrow }); changed.push({ ...t, newDate: tomorrow }); });
    setChangedTasks(changed); setActionTaken(true);
    setActionLabel(`Moved to tomorrow (${new Date(tomorrow + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })})`);
  };

  const postponeWeek = () => {
    const nextWeek = new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0];
    const changed: typeof changedTasks = [];
    affectedTasks.forEach((t: any) => { updateTask(t.id, { date: nextWeek }); changed.push({ ...t, newDate: nextWeek }); });
    setChangedTasks(changed); setActionTaken(true);
    setActionLabel(`Postponed to ${new Date(nextWeek + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`);
  };

  const clearLowPriority = () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const changed: typeof changedTasks = [];
    const allTasks = getTasks();
    affectedTasks.filter((t: any) => allTasks.find((x) => x.id === t.id)?.priority === "low")
      .forEach((t: any) => { updateTask(t.id, { date: tomorrow }); changed.push({ ...t, newDate: tomorrow }); });
    setChangedTasks(changed); setActionTaken(true);
    setActionLabel(`Cleared ${changed.length} low-priority task${changed.length !== 1 ? "s" : ""}`);
  };

  const undo = () => {
    changedTasks.forEach((t) => updateTask(t.id, { date: t.oldDate }));
    setActionTaken(false); setChangedTasks([]); setActionLabel("");
  };

  if (actionTaken && changedTasks.length === 0) {
    return (
      <div className="max-w-[85%] rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-brand-cream/30">
        <div className="mb-1 flex items-center gap-2"><span className="text-sm">🍊</span><span className="text-xs font-medium text-brand-deep">Coach</span></div>
        <p className="text-sm text-brand-muted">No tasks matched — everything stayed where it was.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[90%] rounded-xl bg-white shadow-sm ring-1 ring-brand-cream/30 overflow-hidden border border-brand-light/10">
      <div className="bg-gradient-to-r from-brand-warm/60 to-brand-warm/20 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">📅</span>
        <span className="font-serif text-sm font-semibold text-brand-deep tracking-tight">Lighten Your Day</span>
        {actionTaken && <span className="ml-auto rounded-full bg-brand-leaf/15 px-2 py-0.5 text-[10px] font-medium text-brand-leaf">Done</span>}
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm leading-relaxed text-brand-dark">{msg.content}</p>
        {!actionTaken ? (
          <>
            {affectedTasks.length > 0 && (
              <div className="rounded-xl bg-brand-warm/30 border border-brand-light/10 p-3 max-h-28 overflow-y-auto">
                <p className="text-xs font-medium text-brand-muted mb-1.5">{affectedCount} task{affectedCount !== 1 ? "s" : ""}:</p>
                {affectedTasks.slice(0, 5).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 text-xs text-brand-dark"><span className="text-brand-muted">•</span><span className="flex-1 truncate">{t.name}</span></div>
                ))}
                {affectedTasks.length > 5 && <p className="text-xs text-brand-muted">...and {affectedTasks.length - 5} more</p>}
              </div>
            )}
            <div className="space-y-2">
              <button onClick={moveToTomorrow} disabled={affectedTasks.length === 0}
                className="flex w-full items-center gap-3 rounded-lg border border-brand-light/20 bg-brand-warm/20 px-4 py-3 text-left hover:bg-brand-warm/40 disabled:opacity-40">
                <span className="text-lg">🌅</span><div className="flex-1"><p className="text-sm font-medium text-brand-dark">Move to tomorrow</p><p className="text-xs text-brand-muted">Push {affectedCount} task{affectedCount !== 1 ? "s" : ""} to the next day</p></div>
              </button>
              <button onClick={postponeWeek} disabled={affectedTasks.length === 0}
                className="flex w-full items-center gap-3 rounded-lg border border-brand-cream/30 bg-white/50 px-4 py-3 text-left hover:bg-brand-warm/30 disabled:opacity-40">
                <span className="text-lg">📆</span><div className="flex-1"><p className="text-sm font-medium text-brand-dark">Postpone one week</p><p className="text-xs text-brand-muted">Reschedule to next week</p></div>
              </button>
              <button onClick={clearLowPriority} disabled={affectedTasks.length === 0}
                className="flex w-full items-center gap-3 rounded-lg border border-brand-cream/30 bg-white/50 px-4 py-3 text-left hover:bg-brand-warm/30 disabled:opacity-40">
                <span className="text-lg">🧹</span><div className="flex-1"><p className="text-sm font-medium text-brand-dark">Clear low-priority only</p><p className="text-xs text-brand-muted">Only move tasks marked as low priority</p></div>
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3 slide-up">
            <div className="rounded-xl bg-brand-leaf/5 border border-brand-leaf/15 p-3">
              <p className="text-sm font-medium text-brand-leaf">✓ {actionLabel}</p>
              {changedTasks.length > 0 && changedTasks.slice(0, 5).map((t) => (
                <p key={t.id} className="text-xs text-brand-muted"><span className="text-brand-leaf">→</span> {t.name}</p>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={undo} className="btn-ghost text-xs">↩ Undo</button>
              <button onClick={() => onResponse(`I rescheduled ${changedTasks.length} task${changedTasks.length !== 1 ? "s" : ""}. My day feels lighter.`)}
                className="btn-primary text-xs flex-1">Feels better ✨</button>
            </div>
          </div>
        )}
        <button onClick={() => onResponse("I'll keep my tasks as they are for now.")} className="btn-ghost text-xs w-full">Keep as-is →</button>
      </div>
    </div>
  );
}

// ── Parse user text into actionable task items ──
function parseTaskItems(text: string): { name: string; priority: "low" | "medium" | "high" }[] {
  const items: { name: string; priority: "low" | "medium" | "high" }[] = [];
  // Split on common task separators
  const segments = text
    .replace(/^(i need to|i have to|i must|i should|i want to|i've got to|i gotta|things i need to do[:;]?|here's what i need to do[:;]?)/i, "")
    .split(/(?:,?\s+(?:and|then|also)\s+|,\s*|;\s*)/i)
    .filter(Boolean);

  const priorityKeywords: [string[], "high"][] = [[["urgent", "asap", "critical", "deadline", "due today"], "high"]];
  const lowKeywords = ["maybe", "consider", "optional", "low", "nice to have"];

  for (const seg of segments) {
    const cleaned = seg.trim().replace(/^(write|draft|create|make|do|check|review|call|email|research|prepare|organize|finish|complete|update|send|schedule|plan|clean)\s+/i, "$1 ").replace(/^to\s+/, "").replace(/[.!]$/, "").trim();
    if (cleaned.length < 3) continue;
    let priority: "low" | "medium" | "high" = "medium";
    const lowerC = cleaned.toLowerCase();
    if (lowKeywords.some(k => lowerC.includes(k))) priority = "low";
    if (["urgent", "asap", "critical", "deadline", "due today"].some(k => lowerC.includes(k))) priority = "high";
    // Capitalize first letter
    const name = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    items.push({ name, priority });
  }
  return items;
}

// ── Task Creator Card ──
export function TaskCreatorCard({ msg, onResponse }: { msg: CoachMessage; onResponse: (text: string) => void }) {
  const rawParsed = msg.data?.parsedTasks || [];
  const [tasks, setTasks] = useState(structuredClone(rawParsed));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdIds, setCreatedIds] = useState<string[]>([]);
  const today = new Date().toISOString().split("T")[0];

  // If no tasks were parsed from the engine, try parsing from content
  useEffect(() => {
    if (rawParsed.length > 0) return;
    // Extract from user's last message
    const userMsg = msg.content.toLowerCase();
    const parsed = parseTaskItems(userMsg);
    if (parsed.length > 0) {
      setTasks(parsed.map((p, i) => ({
        id: `parsed-${i}`,
        name: p.name,
        date: today,
        priority: p.priority,
        selected: true,
      })));
    }
  }, [rawParsed]);

  const toggleTask = (idx: number) => {
    setTasks(prev => prev.map((t, i) => i === idx ? { ...t, selected: !t.selected } : t));
  };

  const updateName = (idx: number, name: string) => {
    setTasks(prev => prev.map((t, i) => i === idx ? { ...t, name } : t));
  };

  const updateDate = (idx: number, date: string) => {
    setTasks(prev => prev.map((t, i) => i === idx ? { ...t, date } : t));
  };

  const updatePriority = (idx: number, priority: "low" | "medium" | "high") => {
    setTasks(prev => prev.map((t, i) => i === idx ? { ...t, priority } : t));
  };

  const addToPlanner = () => {
    const selected = tasks.filter(t => t.selected);
    if (selected.length === 0) return;
    setIsSubmitting(true);
    const ids: string[] = [];
    selected.forEach(t => {
      const newTask: any = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: t.name,
        date: t.date || today,
        priority: t.priority,
        status: "active",
        projectType: "personal",
        recurring: false,
        solo: true,
        subtasks: [],
        delegationNotes: "",
        tags: ["coach-created"],
        createdAt: new Date().toISOString(),
        dependencies: [],
      };
      addTask(newTask);
      ids.push(newTask.id);
    });
    setCreatedIds(ids);
    setCreated(true);
    setTimeout(() => setIsSubmitting(false), 400);
  };

  const selectedCount = tasks.filter(t => t.selected).length;

  if (created) {
    return (
      <div className="max-w-[90%] rounded-xl bg-white shadow-sm ring-1 ring-brand-cream/30 overflow-hidden border border-brand-light/10 slide-up">
        <div className="bg-gradient-to-r from-brand-leaf/40 to-emerald-100/30 px-4 py-3 flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span className="font-serif text-sm font-semibold text-brand-deep tracking-tight">Tasks Created!</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-brand-leaf/5 border border-brand-leaf/15 p-4">
            <p className="text-sm font-medium text-brand-leaf mb-2">Created {createdIds.length} task{createdIds.length !== 1 ? "s" : ""} in your planner</p>
            <div className="space-y-1.5">
              {tasks.filter(t => t.selected).map(t => (
                <p key={t.id} className="text-xs text-brand-dark flex items-center gap-2">
                  <span className="text-brand-leaf">✓</span>
                  <span>{t.name}</span>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    t.priority === "high" ? "bg-brand-rose/10 text-brand-rose" :
                    t.priority === "low" ? "bg-brand-cream/30 text-brand-muted" :
                    "bg-brand-warm/30 text-brand-dark"}`}>
                    {t.priority}
                  </span>
                </p>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/tasks" className="btn-primary text-xs flex-1 text-center">View in Tasks →</Link>
            <Link to="/dashboard" className="btn-secondary text-xs flex-1 text-center">Dashboard →</Link>
          </div>
          <button onClick={() => onResponse("Thanks! I'll start working on these.")} className="btn-ghost text-xs w-full">Thanks! ✨</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[90%] rounded-xl bg-white shadow-sm ring-1 ring-brand-cream/30 overflow-hidden border border-brand-light/10">
      <div className="bg-gradient-to-r from-brand-gold/30 to-brand-warm/20 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">📋</span>
        <span className="font-serif text-sm font-semibold text-brand-deep tracking-tight">Create Tasks from Chat</span>
        {selectedCount > 0 && (
          <span className="ml-auto rounded-full bg-brand-leaf/10 px-2 py-0.5 text-[10px] font-medium text-brand-leaf">{selectedCount} selected</span>
        )}
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm leading-relaxed text-brand-dark">{msg.content}</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tasks.map((task, idx) => (
            <div key={task.id} className={`flex items-start gap-3 rounded-lg p-3 transition-all ${
              task.selected ? "bg-brand-warm/20 border border-brand-light/10" : "bg-brand-cream/10 border border-transparent opacity-50"
            }`}>
              <label className="mt-1 flex-shrink-0">
                <input type="checkbox" checked={task.selected} onChange={() => toggleTask(idx)}
                  className="h-4 w-4 rounded accent-brand-deep cursor-pointer" />
              </label>
              <div className="flex-1 min-w-0 space-y-2">
                <input value={task.name} onChange={e => updateName(idx, e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-brand-dark border-b border-brand-light/20 pb-1 focus:outline-none focus:border-brand-deep" />
                <div className="flex gap-2 flex-wrap">
                  <input type="date" value={task.date} onChange={e => updateDate(idx, e.target.value)}
                    className="text-xs bg-brand-cream/30 rounded-lg px-2 py-1 border border-brand-light/10 text-brand-muted focus:outline-none" />
                  <select value={task.priority} onChange={e => updatePriority(idx, e.target.value as "low" | "medium" | "high")}
                    className="text-xs bg-brand-cream/30 rounded-lg px-2 py-1 border border-brand-light/10 text-brand-muted focus:outline-none">
                    <option value="high">🔴 High</option>
                    <option value="medium">🟠 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addToPlanner} disabled={selectedCount === 0 || isSubmitting}
          className="btn-primary text-sm w-full disabled:opacity-40 flex items-center justify-center gap-2">
          {isSubmitting ? <span className="loader" /> : <span>✨</span>}
          Add {selectedCount} selected task{selectedCount !== 1 ? "s" : ""} to planner
        </button>
        <button onClick={() => onResponse("I'll add these manually, thanks.")} className="btn-ghost text-xs w-full">I'll add these later →</button>
      </div>
    </div>
  );
}
