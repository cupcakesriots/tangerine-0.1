import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppLayout } from "~/components/AppLayout"
import { NectarMeter } from "~/components/NectarMeter";
import { TaskDetailModal } from "~/components/TaskDetailModal";
import {
  isOnboardingComplete,
  getOnboarding,
  getTasks,
  getTodaysWellness,
  getCoachMessages,
  getSampleTasks,
  saveTasks,
  addWellnessEntry,
  updateTask,
  addTask,
  deleteTask,
  generateId,
  isTaskBlocked,
  getBlockingTaskNames,
  areAllDepsCompleted,
  type Task,
} from "~/lib/storage";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [blockerTask, setBlockerTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [curiosityEntry, setCuriosityEntry] = useState<{ energy: number; moods: string[] } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const onboarding = getOnboarding();

  // Re-read reactive data whenever refreshKey changes
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todaysWellness, setTodaysWellness] = useState(getTodaysWellness());
  const [coachMsgs, setCoachMsgs] = useState(getCoachMessages());

  useEffect(() => {
    if (!isOnboardingComplete()) {
      navigate({ to: "/", replace: true });
      return;
    }
    // Refresh all data
    setTasks(getTasks());
    setTodaysWellness(getTodaysWellness());
    setCoachMsgs(getCoachMessages());
    if (getTasks().length === 0) saveTasks(getSampleTasks());
    setReady(true);
  }, [refreshKey]);

  // Re-read on focus (handles user returning from tasks page)
  useEffect(() => {
    const handleFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Re-read on storage events (cross-tab sync)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("tangerine_")) setRefreshKey((k) => k + 1);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  if (!ready) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <div className="animate-float text-4xl">🍊</div>
        </div>
      </AppLayout>
    );
  }

  const activeTasks = tasks.filter((t) => t.status === "active");
  const todayTasks = activeTasks.filter(
    (t) => t.date === new Date().toISOString().split("T")[0]
  );
  const highPriorityTasks = activeTasks.filter((t) => t.priority === "high");
  const upcomingTasks = activeTasks.filter(
    (t) => t.date !== new Date().toISOString().split("T")[0]
  );
  const recentCoach = coachMsgs[coachMsgs.length - 1];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* ===== WELCOME HEADER ===== */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark sm:text-4xl">
            {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}{onboarding?.name ? `, ${onboarding.name}` : ""}
          </h1>
          <p className="text-sm font-medium text-brand-muted/80">
            {todaysWellness ? (
              <span className="inline-flex items-center gap-1.5">
                <NectarMeter level={todaysWellness.energyLevel} size={22} />
                {todaysWellness.moods?.length ? <span>· {todaysWellness.moods.join(", ").toLowerCase()}</span> : null}
              </span>
            ) : "Log your current energy to get the most relevant suggestions for today."}
          </p>
        </div>
        {/* ===== INLINE ENERGY + MOOD CHECK-IN ===== */}
        <InlineEnergyMoodCheckin
          todaysWellness={todaysWellness}
          onCheckin={(energyLevel, moods) => {
            addWellnessEntry({
              id: generateId(),
              date: new Date().toISOString().split("T")[0],
              energyLevel,
              moods: moods.length > 0 ? moods : undefined,
              activities: [],
              notes: "",
            });
            // Show curiosity prompt if Disinterested or Lost selected
            if (moods.includes("Disinterested") || moods.includes("Lost")) {
              setCuriosityEntry({ energy: energyLevel, moods });
            }
            setReady(false);
            setTimeout(() => setReady(true), 100);
          }}
        />

        {/* ===== QUICK ACTION DOCK ===== */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-medium text-brand-muted/60">Quick actions</span>
            <div className="h-px flex-1 bg-gradient-to-r from-brand-cream/40 to-transparent" />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => navigate({ to: "/tasks" })}
              className="btn-action"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-warm to-amber-50 text-sm shadow-sm">⚡</span>
              Quick Add Task
            </button>
            <button
              onClick={() => navigate({ to: "/wellness" })}
              className="btn-action"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 text-sm shadow-sm">🌸</span>
              Log Energy
            </button>
            <button
              onClick={() => navigate({ to: "/coach" })}
              className="btn-action"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 text-sm shadow-sm">🧩</span>
              Ask Coach (I'm Stuck)
            </button>
            <button
              onClick={() => navigate({ to: "/wellness" })}
              className="btn-action"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-sm shadow-sm">🧘</span>
              Start 5-Min Move & Stretch
            </button>
          </div>
        </div>

        {/* ===== MAIN GRID ===== */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ===== TODAY'S TASKS ===== */}
          <div className="card-elevated col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-brand-dark">Today's Tasks</h2>
              <span className="text-xs font-medium text-brand-muted/60">{todayTasks.length} {todayTasks.length === 1 ? "task" : "tasks"}</span>
            </div>
            {todayTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <span className="text-3xl">🎉</span>
                <p className="text-sm font-medium text-brand-muted">No tasks today — enjoy the ease</p>
                <button onClick={() => navigate({ to: "/tasks" })} className="btn-ghost text-xs text-brand-deep">
                  Add a task →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <InlineTaskRow key={task.id} task={task} onEdit={setEditingTask} />
                ))}
              </div>
            )}
            <button onClick={() => navigate({ to: "/tasks" })} className="btn-ghost mt-4 w-full text-sm text-brand-muted hover:text-brand-deep">
              View all tasks →
            </button>
          </div>

          {/* ===== RIGHT COLUMN ===== */}
          <div className="col-span-1 space-y-5">
            {/* Coach */}
            <div className="card-warm">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/60 text-sm shadow-sm">💬</span>
                <h3 className="font-serif text-base font-medium text-brand-dark">Planning note</h3>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-brand-dark/70">
                {recentCoach
                  ? `${recentCoach.content.slice(0, 100)}${recentCoach.content.length > 100 ? "..." : ""}`
                  : "Progress is a series of small decisions. Identify one task that feels manageable and start there."}
              </p>
              <div className="flex gap-2">
                <button onClick={() => navigate({ to: "/coach" })} className="btn-primary flex-1 text-xs">
                  Open Coach
                </button>
                <button onClick={() => navigate({ to: "/tasks" })} className="btn-secondary flex-1 text-xs">
                  Review Schedule
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card-elevated">
              <h3 className="mb-3 font-serif text-base font-medium text-brand-dark">This Week</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between rounded-xl bg-brand-warm/30 px-3.5 py-2.5">
                  <span className="text-sm text-brand-dark">Tasks completed</span>
                  <span className="font-serif text-lg font-semibold text-brand-deep">
                    {tasks.filter((t) => t.status === "completed").length}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-brand-warm/30 px-3.5 py-2.5">
                  <span className="text-sm text-brand-dark">Days checked in</span>
                  <span className="font-serif text-lg font-semibold text-brand-deep">
                    {todaysWellness ? 1 : 0}/7
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-brand-warm/30 px-3.5 py-2.5">
                  <span className="text-sm text-brand-dark">Focus sessions</span>
                  <span className="font-serif text-lg font-semibold text-brand-deep">—</span>
                </div>
              </div>
            </div>
        {/* ===== HIGH PRIORITY ===== */}
        {highPriorityTasks.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-brand-muted/60">High priority</span>
              <div className="h-px flex-1 bg-gradient-to-r from-red-200/40 to-transparent" />
              <span className="text-xs text-brand-muted/50">{highPriorityTasks.length} {highPriorityTasks.length === 1 ? "task" : "tasks"}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {highPriorityTasks.map((task) => {
                const blocked = isTaskBlocked(task, tasks);
                const depsReady = !blocked && areAllDepsCompleted(task, tasks);
                const blockingNames = blocked ? getBlockingTaskNames(task, tasks) : [];
                return (
                <div
                  key={task.id}
                  className="card-elevated flex cursor-pointer items-center gap-3 transition-all hover:shadow-[0_8px_24px_-8px_rgba(194,105,1,0.15)] hover:-translate-y-0.5"
                  onClick={() => setEditingTask(task)}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm shadow-sm ${blocked ? "bg-amber-50" : depsReady ? "bg-emerald-50" : "bg-red-50"}`}>
                    {blocked ? "⛓️" : depsReady ? "🔓" : "⚡"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-brand-dark">{task.name}</p>
                    <p className="text-xs text-brand-muted/60">
                      {task.date === new Date().toISOString().split("T")[0] ? "Due today" : new Date(task.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {blocked && blockingNames.length > 0 && (
                        <span className="ml-1.5 text-amber-600">· ⛓️ Blocked by: {blockingNames[0]}{blockingNames.length > 1 ? ` +${blockingNames.length - 1}` : ""}</span>
                      )}
                      {depsReady && <span className="ml-1.5 text-emerald-600">· 🔓 Ready</span>}
                    </p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setBlockerTask(task)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-brand-muted/40 transition-all hover:bg-brand-cream/30 hover:text-brand-muted" title="Feeling blocked?">🧩</button>
                    <button onClick={() => { updateTask(task.id, { status: "completed" }); setReady(false); setTimeout(() => setReady(true), 100); }}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-cream/40 text-xs text-brand-muted transition-all hover:border-brand-deep hover:text-brand-deep">✓</button>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* ===== UPCOMING ===== */}
        {upcomingTasks.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-brand-muted/60">Upcoming</span>
              <div className="h-px flex-1 bg-gradient-to-r from-brand-cream/40 to-transparent" />
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {upcomingTasks.slice(0, 4).map((task) => {
                const blocked = isTaskBlocked(task, tasks);
                const depsReady = !blocked && areAllDepsCompleted(task, tasks);
                const blockingNames = blocked ? getBlockingTaskNames(task, tasks) : [];
                return (
                <div
                  key={task.id}
                  className="card-elevated flex cursor-pointer items-center gap-3 py-3 transition-all hover:shadow-[0_4px_16px_-4px_rgba(194,105,1,0.1)] hover:-translate-y-0.5"
                  onClick={() => setEditingTask(task)}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${blocked ? "bg-amber-400" : depsReady ? "bg-emerald-400" : task.priority === "high" ? "bg-red-400" : task.priority === "medium" ? "bg-amber-400" : "bg-emerald-400"}`} />
                  <span className="flex-1 truncate text-sm text-brand-dark">
                    {task.name}
                    {blocked && <span className="ml-1.5 text-[10px] text-amber-500" title={`Blocked by: ${blockingNames.join(", ")}`}>⛓️</span>}
                    {depsReady && <span className="ml-1.5 text-[10px] text-emerald-500" title="Dependencies completed">🔓</span>}
                  </span>
                  <span className="text-xs text-brand-muted/60">
                    {new Date(task.date).toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); setBlockerTask(task); }}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] text-brand-muted/30 transition-all hover:bg-brand-cream/30 hover:text-brand-muted" title="Feeling blocked?">🧩</button>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* ===== INSPIRATIONAL TIP ===== */}
        <div className="card-glass text-center px-8 py-6">
          <p className="font-serif text-base italic leading-relaxed text-brand-dark/60">
            "Rest is not idle, and doing nothing is not a waste. You are not a machine."
          </p>
        </div>

        {/* ===== CURIOSITY PROMPT (Disinterested/Lost) ===== */}
        {curiosityEntry && (
          <CuriosityPrompt
            entry={curiosityEntry}
            onDismiss={() => setCuriosityEntry(null)}
            navigate={navigate}
          />
        )}

        {/* ===== BLOCKER HELPER MODAL ===== */}
        {blockerTask && (
          <BlockerHelperModal
            task={blockerTask}
            onClose={() => setBlockerTask(null)}
            onResolve={(updatedTask) => {
              if (updatedTask) {
                updateTask(updatedTask.id, updatedTask);
              }
              setBlockerTask(null);
              setReady(false);
              setTimeout(() => setReady(true), 100);
            }}
          />
        )}

        {/* ===== TASK DETAIL MODAL (click-to-edit) ===== */}
        {editingTask && (
          <TaskDetailModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onSave={(updatedTask) => {
              updateTask(updatedTask.id, updatedTask);
              setEditingTask(null);
              setReady(false);
              setTimeout(() => setReady(true), 100);
            }}
            onDelete={(taskId) => {
              deleteTask(taskId);
              setEditingTask(null);
              setReady(false);
              setTimeout(() => setReady(true), 100);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}

/* ===== INLINE ENERGY + MOOD CHECK-IN ===== */
function InlineEnergyMoodCheckin({
  todaysWellness,
  onCheckin,
}: {
  todaysWellness: { energyLevel: number; moods?: string[] } | undefined;
  onCheckin: (energyLevel: number, moods: string[]) => void;
}) {
  const [energyLevel, setEnergyLevel] = useState<number>(todaysWellness?.energyLevel || 3);
  const [moods, setMoods] = useState<string[]>(todaysWellness?.moods || []);
  const [expanded, setExpanded] = useState(!todaysWellness);

  const moodOptions = ["Focused", "Calm", "Anxious", "Tired", "Happy", "Meh", "Stressed", "Curious", "Grateful", "Frustrated", "Disinterested", "Lost"];

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="card-warm w-full text-left animate-shimmer"
      >
        <div className="flex items-center gap-3">
          <NectarMeter level={todaysWellness?.energyLevel || 3} size={40} />
          <div className="flex-1">
            <p className="text-sm font-medium text-brand-dark">Energy: {todaysWellness?.energyLevel}/5</p>
            {todaysWellness?.moods?.length ? (
              <p className="text-xs text-brand-muted">{todaysWellness.moods.join(" · ")}</p>
            ) : (
              <p className="text-xs text-brand-muted/60">Update your check-in</p>
            )}
          </div>
          <span className="text-xs text-brand-deep">Edit →</span>
        </div>
      </button>
    );
  }

  return (
    <div className="card-elevated slide-up">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-base font-semibold tracking-tight text-brand-dark">
          {todaysWellness ? "Update Check-in" : "How are you feeling?"}
        </h2>
        {todaysWellness && (
          <button onClick={() => setExpanded(false)} className="btn-ghost text-xs">
            Collapse
          </button>
        )}
      </div>

      {/* Energy slider */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-brand-dark">Energy level</span>
          <span className="text-xs font-medium text-brand-muted">
            {energyLevel <= 1 ? "😴 Drained" : energyLevel === 2 ? "😐 Low" : energyLevel === 3 ? "🙂 Okay" : energyLevel === 4 ? "😊 Good" : "⚡ Amazing"}
          </span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setEnergyLevel(n)}
              className={`flex flex-1 flex-col items-center rounded-xl py-2.5 transition-all duration-200 ${
                energyLevel === n
                  ? "bg-gradient-to-b from-brand-deep to-brand-light text-white shadow-[0_2px_12px_-4px_rgba(194,105,1,0.3)]"
                  : "bg-brand-warm/30 text-brand-muted hover:bg-brand-warm/50"
              }`}
            >
              <span className="text-base">{n <= 1 ? "😴" : n === 2 ? "😐" : n === 3 ? "🙂" : n === 4 ? "😊" : "⚡"}</span>
              <span className="mt-0.5 text-[10px] font-semibold">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mood multi-select */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-brand-dark">Mood <span className="text-xs font-normal text-brand-muted">(pick all that fit)</span></p>
        <div className="flex flex-wrap gap-1.5">
          {moodOptions.map((m) => {
            const isSelected = moods.includes(m);
            return (
              <button
                key={m}
                onClick={() => setMoods(isSelected ? moods.filter((x) => x !== m) : [...moods, m])}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  isSelected
                    ? "bg-brand-deep text-white shadow-[0_1px_6px_-2px_rgba(194,105,1,0.2)]"
                    : "bg-brand-cream/20 text-brand-muted hover:bg-brand-cream/40"
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
        {moods.length > 0 && (
          <p className="mt-1.5 text-xs text-brand-deep/70">{moods.length} selected: {moods.join(", ")}</p>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={() => { onCheckin(energyLevel, moods); setExpanded(false); }}
        className="btn-primary w-full"
      >
        {todaysWellness ? "✨ Update Check-in" : "🌿 Save Check-in"}
      </button>
    </div>
  );
}

/* ===== INLINE TASK ROW ===== */
function InlineTaskRow({ task, onEdit }: { task: Task; onEdit: (task: Task) => void }) {
  const [completed, setCompleted] = useState(false);

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all duration-200 cursor-pointer ${
        completed ? "opacity-50" : "hover:bg-brand-warm/30"
      }`}
      onClick={() => onEdit(task)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setCompleted(true);
          import("~/lib/storage").then(({ updateTask }) => {
            updateTask(task.id, { status: "completed" });
          });
        }}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          completed
            ? "border-brand-deep bg-brand-deep text-white"
            : "border-brand-cream/60 hover:border-brand-light"
        }`}
      >
        {completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
      </button>
      <span className={`flex-1 truncate text-sm ${completed ? "text-brand-muted line-through" : "text-brand-dark font-medium"}`}>
        {task.name}
      </span>
      {task.energyRequired && (
        <span className="text-xs text-brand-muted/50">{'⚡'.repeat(task.energyRequired)}</span>
      )}
      <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => import("~/lib/storage").then(({ updateTask }) => {
            updateTask(task.id, { status: "snoozed" });
          })}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-brand-muted/50 transition-all hover:bg-brand-cream/30 hover:text-brand-muted"
          title="Snooze"
        >
          😴
        </button>
        <button
          onClick={() => onEdit(task)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-brand-muted/30 transition-all hover:bg-brand-cream/30 hover:text-brand-muted"
          title="Details"
        >
          ⋯
        </button>
      </div>
    </div>
  );
}

/* ===== CURIOSITY PROMPT ===== */
function CuriosityPrompt({ entry, onDismiss, navigate }: {
  entry: { energy: number; moods: string[] };
  onDismiss: () => void;
  navigate: any;
}) {
  const isDisinterested = entry.moods.includes("Disinterested");
  const isLost = entry.moods.includes("Lost");
  return (
    <div className="card-elevated slide-up border border-brand-light/20 bg-gradient-to-br from-brand-warm/40 to-white/80">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/60 text-sm shadow-sm">{isLost ? "🧭" : "🔍"}</span>
        <h3 className="font-serif text-base font-medium text-brand-dark">{isLost ? "Finding direction" : "Exploring interest"}</h3>
      </div>
      {isDisinterested && (
        <>
          <p className="mb-3 text-sm leading-relaxed text-brand-dark/70">Disinterest can signal that the mind needs novelty or is pushing against a rigid expectation. Instead of forcing focus, consider a brief exploration of something unrelated.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { navigate({ to: "/wellness" }); onDismiss(); }} className="btn-secondary text-xs">Take a 5-min stretch</button>
            <button onClick={() => { navigate({ to: "/tasks" }); onDismiss(); }} className="btn-secondary text-xs">Switch to draft mode</button>
            <button onClick={() => { navigate({ to: "/coach" }); onDismiss(); }} className="btn-ghost text-xs">Explore with Coach</button>
          </div>
        </>
      )}
      {isLost && (
        <>
          <p className="mb-3 text-sm leading-relaxed text-brand-dark/70">Feeling lost often means there is too much noise on the plate. If you could take only one step today, what would it be?</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { navigate({ to: "/coach"}); onDismiss(); }} className="btn-primary text-xs">Run clarity check-in</button>
            <button onClick={() => { navigate({ to: "/tasks"}); onDismiss(); }} className="btn-secondary text-xs">Write one focus item</button>
            <button onClick={onDismiss} className="btn-ghost text-xs">Dismiss</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ===== BLOCKER HELPER MODAL ===== */
function BlockerHelperModal({ task, onClose, onResolve }: {
  task: Task;
  onClose: () => void;
  onResolve: (updatedTask: Task) => void;
}) {
  const [selectedBlockers, setSelectedBlockers] = useState<string[]>([]);
  const blockerOptions = [
    { id: "low-energy", label: "Low energy or focus", icon: "🔋" },
    { id: "missing-info", label: "Missing information or waiting on someone", icon: "🧩" },
    { id: "overwhelm", label: "Task feels too large or overwhelming", icon: "🌪️" },
    { id: "mindset", label: "Emotional friction or procrastination anxiety", icon: "🧼" },
    { id: "environment", label: "Environment is too noisy or distracting", icon: "🚪" },
  ];
  const toggleBlocker = (id: string) => setSelectedBlockers((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]);
  const handleResolve = () => {
    const updatedTask = { ...task, blockers: selectedBlockers };
    if (selectedBlockers.includes("low-energy")) updatedTask.status = "snoozed";
    if (selectedBlockers.includes("missing-info")) { updatedTask.status = "draft"; updatedTask.delegationNotes = "Waiting on: information needed"; }
    if (selectedBlockers.includes("overwhelm")) { updatedTask.subtasks = [...(task.subtasks || []), { id: generateId(), name: "Break down first step", completed: false }, { id: generateId(), name: "Identify resources", completed: false }, { id: generateId(), name: "Set a 15-min timer", completed: false }]; }
    onResolve(updatedTask);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/10 backdrop-blur-sm sm:items-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-t-2xl bg-white/95 p-6 shadow-xl backdrop-blur-2xl sm:rounded-2xl slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-brand-dark"><span className="mr-2">🧩</span>What&apos;s making this task feel difficult?</h2>
          <button onClick={onClose} className="btn-ghost p-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <p className="mb-4 text-sm text-brand-muted">Select any that apply to &ldquo;{task.name}&rdquo;:</p>
        <div className="space-y-2">{blockerOptions.map((opt) => (
          <button key={opt.id} onClick={() => toggleBlocker(opt.id)}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${selectedBlockers.includes(opt.id) ? "border-brand-deep bg-brand-warm/50 ring-2 ring-brand-light/20 font-medium text-brand-dark" : "border-white/60 bg-white/50 text-brand-muted hover:border-brand-light/30"}`}>
            <span className="mr-2">{opt.icon}</span>{opt.label}
          </button>
        ))}</div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleResolve} disabled={selectedBlockers.length === 0} className="btn-primary flex-1 disabled:opacity-50">Resolve ({selectedBlockers.length})</button>
        </div>
      </div>
    </div>
  );
}