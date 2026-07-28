import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppLayout } from "~/components/AppLayout";
import { TaskDetailModal } from "~/components/TaskDetailModal";
import {
  isOnboardingComplete,
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  generateId,
  isTaskBlocked,
  getBlockingTaskNames,
  areAllDepsCompleted,
  type Task,
} from "~/lib/storage";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});

type ViewMode = "list" | "kanban" | "gantt" | "grid" | "timeline";

const priorityColors: Record<string, string> = {
  high: "tag-priority-high",
  medium: "tag-priority-medium",
  low: "tag-priority-low",
};

const typeIcons: Record<string, string> = {
  personal: "👤",
  work: "💼",
  creative: "🎨",
  health: "💚",
  errand: "🛒",
};

function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("active");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [view, setView] = useState<ViewMode>("list");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isOnboardingComplete()) {
      navigate({ to: "/", replace: true });
      return;
    }
    setTasks(getTasks());
    setReady(true);
  }, []);

  const refresh = () => setTasks(getTasks());
  const filteredTasks = tasks.filter((t) => {
    if (filter === "active" && t.status !== "active") return false;
    if (filter === "completed" && t.status !== "completed") return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  const completeTask = (id: string) => { updateTask(id, { status: "completed" }); refresh(); };
  const snoozeTask = (id: string) => { updateTask(id, { status: "snoozed" }); refresh(); };
  const removeTask = (id: string) => { deleteTask(id); refresh(); };
  const toggleActive = (id: string, current: string) => {
    updateTask(id, { status: current === "active" ? "draft" : "active" });
    refresh();
  };

  const activeCount = tasks.filter((t) => t.status === "active").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  if (!ready) return null;

  const views: { key: ViewMode; label: string }[] = [
    { key: "list", label: "📋 List" },
    { key: "kanban", label: "📌 Kanban" },
    { key: "gantt", label: "📊 Gantt" },
    { key: "grid", label: "📐 Grid" },
    { key: "timeline", label: "⏳ Timeline" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-brand-dark sm:text-3xl">Tasks</h1>
            <p className="text-sm text-brand-muted">{activeCount} active · {completedCount} completed</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add Task
          </button>
        </div>

        {/* View switcher */}
        <div className="flex flex-wrap gap-2">
          {views.map((v) => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${view === v.key ? "bg-brand-deep text-white shadow-sm" : "bg-white/60 text-brand-muted hover:bg-brand-cream/30"}`}>
              {v.label}
            </button>
          ))}
        </div>

        {/* Filters for list/grid/timeline */}
        {(view === "list" || view === "grid" || view === "timeline") && (
          <>
            <div className="flex flex-wrap gap-2">
              {(["all", "active", "completed"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium ${filter === f ? "bg-brand-deep text-white shadow-sm" : "bg-white/60 text-brand-muted hover:bg-brand-cream/30"}`}
                >{f === "all" ? "All" : f === "active" ? "Active" : "Completed"}</button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-brand-muted">
                  <input type="checkbox" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-brand-cream text-brand-deep focus:ring-brand-light" />
                  Hide completed
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {["all", "high", "medium", "low"].map((p) => (
                <button key={p} onClick={() => setPriorityFilter(p)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${priorityFilter === p ? "bg-brand-dark text-white shadow-sm" : "bg-white/60 text-brand-muted hover:bg-brand-cream/30"}`}
                >{p === "all" ? "⭐ All" : p === "high" ? "🔴 High" : p === "medium" ? "🟡 Medium" : "🟢 Low"}</button>
              ))}
            </div>
          </>
        )}

        {/* ===== LIST ===== */}
        {view === "list" && (filteredTasks.length === 0 ? (
          <div className="card-elevated py-12 text-center">
            <div className="mb-3 text-4xl">🎉</div>
            <p className="text-lg font-medium text-brand-dark">All clear!</p>
            <p className="text-sm text-brand-muted">No tasks to show here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.filter((t) => !(hideCompleted && t.status === "completed")).map((task, i) => {
              const blocked = isTaskBlocked(task, tasks);
              const depsReady = !blocked && areAllDepsCompleted(task, tasks);
              const blockingNames = blocked ? getBlockingTaskNames(task, tasks) : [];
              return (
              <div
                key={task.id}
                className="card-elevated flex cursor-pointer items-start gap-3 slide-up transition-all hover:shadow-[0_8px_24px_-8px_rgba(194,105,1,0.15)] hover:-translate-y-0.5"
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => setEditingTask(task)}
              >
                <button onClick={(e) => { e.stopPropagation(); completeTask(task.id); }}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${task.status === "completed" ? "border-brand-deep bg-brand-deep text-white" : "border-brand-cream/60 hover:border-brand-light"}`}>
                  {task.status === "completed" && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-medium ${task.status === "completed" ? "text-brand-muted line-through" : "text-brand-dark"}`}>{task.name}</span>
                    {blocked && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700" title={blockingNames.join(", ")}>
                        ⛓️ Blocked{blockingNames.length > 0 ? `: ${blockingNames[0]}` : ""}
                      </span>
                    )}
                    {depsReady && <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">🔓 Ready</span>}
                    <span className={`tag ${priorityColors[task.priority]}`}>{task.priority}</span>
                    <span className="tag">{typeIcons[task.projectType]} {task.projectType}</span>
                    {task.energyRequired && <span className="tag">{'⚡'.repeat(task.energyRequired)}</span>}
                  </div>
                  {task.description && <p className="mt-1 text-xs text-brand-muted">{task.description}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-brand-muted">
                    <span>📅 {task.date === new Date().toISOString().split("T")[0] ? "Today" : new Date(task.date).toLocaleDateString()}</span>
                    {task.recurring && <span>🔄 Recurring</span>}
                    {task.solo ? <span>👤 Solo</span> : <span>👥 Group</span>}
                    {task.dependencies && task.dependencies.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-warm/40 px-1.5 py-0.5 text-[10px] text-brand-deep">
                        🔗 {task.dependencies.length} dep{task.dependencies.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {task.tags.map((tag) => <span key={tag} className="rounded-full bg-brand-warm/40 px-2 py-0.5 text-xs text-brand-deep">#{tag}</span>)}
                  </div>
                  {task.subtasks.length > 0 && (
                    <div className="mt-1.5 text-[10px] text-brand-muted/60">
                      Subtasks: {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} done
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                  {task.status !== "completed" && (<>
                    <button onClick={() => snoozeTask(task.id)} className="btn-ghost p-1.5 text-xs" title="Snooze">😴</button>
                    <button onClick={() => toggleActive(task.id, task.status)} className="btn-ghost p-1.5 text-xs" title="Toggle draft">{task.status === "draft" ? "📝" : "📄"}</button>
                  </>)}
                  <button onClick={() => removeTask(task.id)} className="btn-ghost p-1.5 text-xs text-red-400 hover:text-red-500" title="Delete">🗑️</button>
                </div>
              </div>
            )})}
          </div>
        ))}

        {/* ===== KANBAN ===== */}
        {view === "kanban" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["active", "completed", "draft", "snoozed"] as const).map((status) => {
              const statusTasks = tasks.filter((t) => t.status === status);
              const icons: Record<string, string> = { active: "📋", completed: "✅", draft: "📝", snoozed: "😴" };
              return (
                <div key={status} className="card-elevated">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-serif text-sm font-semibold capitalize text-brand-dark">{icons[status]} {status}</h3>
                    <span className="text-xs font-medium text-brand-muted/60">{statusTasks.length}</span>
                  </div>
                  <div className="min-h-[120px] space-y-2">
                    {statusTasks.length === 0 ? (
                      <p className="py-4 text-center text-xs text-brand-muted/50">No tasks</p>
                    ) : (
                      statusTasks.map((task) => {
                        const blocked = isTaskBlocked(task, tasks);
                        const depsReady = !blocked && areAllDepsCompleted(task, tasks);
                        return (
                        <div key={task.id} className="cursor-pointer rounded-xl bg-white/60 p-3 shadow-[0_1px_4px_-2px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_12px_-4px_rgba(194,105,1,0.1)] hover:-translate-y-0.5" onClick={() => setEditingTask(task)}>
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${blocked ? "bg-amber-400" : depsReady ? "bg-emerald-400" : task.priority === "high" ? "bg-red-400" : task.priority === "medium" ? "bg-amber-400" : "bg-emerald-400"}`} />
                            <span className="flex-1 truncate text-xs font-medium text-brand-dark">{task.name}</span>
                            {blocked && <span className="text-[10px]" title="Blocked by dependencies">⛓️</span>}
                            {depsReady && <span className="text-[10px]" title="Dependencies completed">🔓</span>}
                          </div>
                          <p className="text-[10px] text-brand-muted/60">{new Date(task.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                          <div className="mt-1.5 flex items-center gap-1">
                            {task.energyRequired && <span className="text-[10px]">{'⚡'.repeat(task.energyRequired)}</span>}
                            {task.recurring && <span className="text-[10px]">🔄</span>}
                            {task.dependencies && task.dependencies.length > 0 && (
                              <span className="text-[10px] text-brand-muted/50">🔗{task.dependencies.length}</span>
                            )}
                          </div>
                        </div>
                      )})
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== GANTT ===== */}
        {view === "gantt" && (
          <div className="card-elevated">
            <h3 className="mb-4 font-serif text-sm font-semibold text-brand-dark">📊 Timeline Gantt</h3>
            {(() => {
              const today = new Date();
              const days = Array.from({ length: 14 }, (_, i) => {
                const d = new Date(today);
                d.setDate(d.getDate() + i);
                return d;
              });
              const activeTasksList = tasks.filter((t) => t.status === "active" || t.status === "completed").slice(0, 8);
              return (
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="mb-2 flex border-b border-brand-cream/20 pb-2">
                      <div className="w-36 shrink-0 pr-3"><span className="text-xs font-medium text-brand-muted/60">Task</span></div>
                      {days.map((d, i) => (
                        <div key={i} className="flex-1 text-center">
                          <span className={`text-[10px] font-medium ${d.toDateString() === today.toDateString() ? "text-brand-deep" : "text-brand-muted/40"}`}>
                            {d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
                          </span>
                          <div className={`mx-auto mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${d.toDateString() === today.toDateString() ? "bg-brand-deep text-white" : "text-brand-muted/50"}`}>
                            {d.getDate()}
                          </div>
                        </div>
                      ))}
                    </div>
                    {activeTasksList.map((task) => {
                      const taskDate = new Date(task.date);
                      const startIdx = Math.max(0, Math.floor((taskDate.getTime() - today.getTime()) / 86400000));
                      const barWidth = task.priority === "high" ? 4 : task.priority === "medium" ? 3 : 2;
                      const blocked = isTaskBlocked(task, tasks);
                      const depsReady = !blocked && areAllDepsCompleted(task, tasks);
                      return (
                        <div key={task.id} className="mb-2 flex cursor-pointer items-center border-b border-brand-cream/10 pb-2 transition-all hover:bg-brand-warm/20" onClick={() => setEditingTask(task)}>
                          <div className="w-36 shrink-0 truncate pr-3 text-xs font-medium text-brand-dark">
                            {blocked && <span className="mr-1 text-[8px]" title="Blocked">⛓️</span>}
                            {depsReady && <span className="mr-1 text-[8px]" title="Ready">🔓</span>}
                            {task.name}
                          </div>
                          {days.map((_, i) => (
                            <div key={i} className="flex-1 text-center">
                              {i >= startIdx && i < startIdx + barWidth && (
                                <div className={`mx-0.5 h-5 rounded-full ${task.priority === "high" ? "bg-brand-deep/80" : task.priority === "medium" ? "bg-brand-light/70" : "bg-brand-yellow/60"}`} />
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {activeTasksList.length === 0 && <p className="py-8 text-center text-sm text-brand-muted/50">Add tasks to see a Gantt timeline</p>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ===== GRID ===== */}
        {view === "grid" && (filteredTasks.length === 0 ? (
          <div className="card-elevated py-12 text-center">
            <div className="mb-3 text-4xl">🎉</div>
            <p className="text-lg font-medium text-brand-dark">All clear!</p>
            <p className="text-sm text-brand-muted">No tasks here.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTasks.filter((t) => !(hideCompleted && t.status === "completed")).map((task) => {
              const blocked = isTaskBlocked(task, tasks);
              const depsReady = !blocked && areAllDepsCompleted(task, tasks);
              return (
              <div key={task.id} className="card-elevated slide-up cursor-pointer transition-all hover:shadow-[0_8px_24px_-8px_rgba(194,105,1,0.15)] hover:-translate-y-0.5" onClick={() => setEditingTask(task)}>
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`tag ${priorityColors[task.priority]}`}>{task.priority}</span>
                    {blocked && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">⛓️</span>}
                    {depsReady && <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">🔓</span>}
                    {task.dependencies && task.dependencies.length > 0 && (
                      <span className="text-[10px] text-brand-muted/50">🔗{task.dependencies.length}</span>
                    )}
                  </div>
                  <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                    {task.status !== "completed" && <button onClick={() => snoozeTask(task.id)} className="btn-ghost p-1 text-[10px]" title="Snooze">😴</button>}
                    <button onClick={() => removeTask(task.id)} className="btn-ghost p-1 text-[10px] text-red-400" title="Delete">🗑️</button>
                  </div>
                </div>
                <div className="mb-1.5 flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); completeTask(task.id); }}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${task.status === "completed" ? "border-brand-deep bg-brand-deep" : "border-brand-cream/60 hover:border-brand-light"}`}>
                    {task.status === "completed" && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                  </button>
                  <span className={`text-sm font-medium ${task.status === "completed" ? "line-through text-brand-muted" : "text-brand-dark"}`}>{task.name}</span>
                </div>
                {task.description && <p className="mb-2 text-xs text-brand-muted">{task.description}</p>}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-brand-muted/60">
                  <span>{typeIcons[task.projectType]}</span>
                  <span>📅 {task.date === new Date().toISOString().split("T")[0] ? "Today" : new Date(task.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  {task.energyRequired && <span>{'⚡'.repeat(task.energyRequired)}</span>}
                </div>
              </div>
            )})}
          </div>
        ))}

        {/* ===== TIMELINE ===== */}
        {view === "timeline" && (filteredTasks.length === 0 ? (
          <div className="card-elevated py-12 text-center">
            <div className="mb-3 text-4xl">🎉</div>
            <p className="text-lg font-medium text-brand-dark">All clear!</p>
            <p className="text-sm text-brand-muted">No tasks here.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 h-full w-0.5 bg-gradient-to-b from-brand-light/40 via-brand-deep/20 to-transparent" />
            <div className="space-y-4">
              {filteredTasks
                .filter((t) => !(hideCompleted && t.status === "completed"))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((task, i) => {
                  const blocked = isTaskBlocked(task, tasks);
                  const depsReady = !blocked && areAllDepsCompleted(task, tasks);
                  const blockingNames = blocked ? getBlockingTaskNames(task, tasks) : [];
                  return (
                  <div key={task.id} className="relative flex gap-4 slide-up cursor-pointer" style={{ animationDelay: `${i * 50}ms` }} onClick={() => setEditingTask(task)}>
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white shadow-[0_2px_8px_-4px_rgba(194,105,1,0.2)]">
                      <span className="text-sm">{typeIcons[task.projectType]}</span>
                    </div>
                    <div className="flex-1 rounded-xl bg-white/70 p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_16px_-4px_rgba(194,105,1,0.12)]">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-brand-dark">{task.name}</span>
                        {blocked && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700" title={blockingNames.join(", ")}>
                            ⛓️ Blocked{blockingNames.length > 0 ? `: ${blockingNames[0]}` : ""}
                          </span>
                        )}
                        {depsReady && <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">🔓 Ready</span>}
                        <span className={`tag ${priorityColors[task.priority]}`}>{task.priority}</span>
                      </div>
                      <p className="text-xs text-brand-muted">
                        📅 {task.date === new Date().toISOString().split("T")[0] ? "Today" : new Date(task.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                        {task.energyRequired && ` · ${'⚡'.repeat(task.energyRequired)} energy`}
                        {task.dependencies && task.dependencies.length > 0 && ` · 🔗 ${task.dependencies.length} dep${task.dependencies.length > 1 ? "s" : ""}`}
                      </p>
                      {task.description && <p className="mt-1 text-xs text-brand-muted">{task.description}</p>}
                      <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => completeTask(task.id)} className="btn-ghost text-xs text-emerald-600 hover:text-emerald-700">✓ Complete</button>
                        <button onClick={() => snoozeTask(task.id)} className="btn-ghost text-xs text-amber-600 hover:text-amber-700">😴 Snooze</button>
                        <button onClick={() => removeTask(task.id)} className="btn-ghost text-xs text-red-400 hover:text-red-500">🗑️ Delete</button>
                      </div>
                    </div>
                  </div>
                )})}
            </div>
          </div>
        ))}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onSave={(task) => { addTask(task); setShowAddModal(false); refresh(); }}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskDetailModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(updatedTask) => {
            updateTask(updatedTask.id, updatedTask);
            setEditingTask(null);
            refresh();
          }}
          onDelete={(taskId) => {
            deleteTask(taskId);
            setEditingTask(null);
            refresh();
          }}
        />
      )}
    </AppLayout>
  );
}

function AddTaskModal({ onClose, onSave }: { onClose: () => void; onSave: (task: Task) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [projectType, setProjectType] = useState<Task["projectType"]>("personal");
  const [recurring, setRecurring] = useState(false);
  const [solo, setSolo] = useState(true);
  const [energyRequired, setEnergyRequired] = useState<number>(3);
  const [tagsInput, setTagsInput] = useState("");
  const [delegationNotes, setDelegationNotes] = useState("");
  const [asDraft, setAsDraft] = useState(false);
  const [subtasks, setSubtasks] = useState<{ id: string; name: string; completed: boolean }[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [dependencySearch, setDependencySearch] = useState("");
  const [showDepDropdown, setShowDepDropdown] = useState(false);
  const allTasks = getTasks();

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, { id: generateId(), name: newSubtask.trim(), completed: false }]);
    setNewSubtask("");
  };
  const removeSubtask = (id: string) => setSubtasks(subtasks.filter((s) => s.id !== id));
  const toggleDependency = (depId: string) => {
    setDependencies((prev) => prev.includes(depId) ? prev.filter((d) => d !== depId) : [...prev, depId]);
  };

  const availableDeps = allTasks.filter(
    (t) => t.status !== "completed" && t.status !== "snoozed"
  );
  const filteredDeps = dependencySearch
    ? availableDeps.filter((t) => t.name.toLowerCase().includes(dependencySearch.toLowerCase()))
    : availableDeps;
  const selectedDeps = allTasks.filter((t) => dependencies.includes(t.id));

  const save = () => {
    if (!name.trim()) return;
    onSave({
      id: generateId(), name: name.trim(), description: description.trim(), date, priority,
      status: asDraft ? "draft" : "active", projectType, recurring, solo,
      subtasks, delegationNotes: delegationNotes.trim(),
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(), energyRequired,
      dependencies,
    });
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/10 backdrop-blur-sm sm:items-center" onClick={handleBackdrop}>
      <div className="flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-white/95 p-6 shadow-xl backdrop-blur-2xl sm:max-w-lg sm:rounded-2xl slide-up">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-brand-dark">New Task</h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-brand-dark">Task name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="What do you want to do?" className="input-field" autoFocus onKeyDown={(e) => e.key === "Enter" && save()} /></div>
          <div><label className="mb-1 block text-sm font-medium text-brand-dark">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add some details..." rows={2} className="input-field resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-sm font-medium text-brand-dark">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" /></div>
            <div><label className="mb-1 block text-sm font-medium text-brand-dark">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="input-field">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-sm font-medium text-brand-dark">Project type</label>
              <select value={projectType} onChange={(e) => setProjectType(e.target.value as any)} className="input-field">
                <option value="personal">👤 Personal</option>
                <option value="work">💼 Work</option>
                <option value="creative">🎨 Creative</option>
                <option value="health">💚 Health</option>
                <option value="errand">🛒 Errand</option>
              </select></div>
            <div><label className="mb-1 block text-sm font-medium text-brand-dark">Energy needed ⚡</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setEnergyRequired(n)}
                    className={`flex-1 rounded-lg py-2 text-center text-xs font-medium ${energyRequired === n ? "bg-brand-deep text-white" : "bg-brand-cream/30 text-brand-muted hover:bg-brand-cream/50"}`}>{n}</button>
                ))}
              </div></div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-brand-dark"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4 rounded border-brand-cream text-brand-deep" /> 🔄 Recurring</label>
            <label className="flex items-center gap-2 text-sm text-brand-dark"><input type="checkbox" checked={!solo} onChange={(e) => setSolo(!e.target.checked)} className="h-4 w-4 rounded border-brand-cream text-brand-deep" /> 👥 Group task</label>
          </div>
          <div><label className="mb-1 block text-sm font-medium text-brand-dark">Tags (comma-separated)</label>
            <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. work, urgent, design" className="input-field" /></div>
          <div><label className="mb-1 block text-sm font-medium text-brand-dark">Delegation notes</label>
            <input value={delegationNotes} onChange={(e) => setDelegationNotes(e.target.value)} placeholder="Who else is involved?" className="input-field" /></div>

          {/* Subtasks */}
          <div className="border-t border-brand-cream/40 pt-4">
            <label className="mb-2 block text-sm font-medium text-brand-dark">
              Subtasks
              {subtasks.length > 0 && (
                <span className="ml-1.5 text-xs font-normal text-brand-muted">
                  ({subtasks.filter((s) => s.completed).length}/{subtasks.length} done)
                </span>
              )}
            </label>
            {subtasks.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {subtasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-2 rounded-lg bg-brand-warm/20 px-3 py-2">
                    <button
                      onClick={() => setSubtasks(subtasks.map((s) => s.id === st.id ? { ...s, completed: !s.completed } : s))}
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        st.completed ? "border-brand-deep bg-brand-deep text-white" : "border-brand-cream/60 hover:border-brand-light"
                      }`}
                    >
                      {st.completed && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    </button>
                    <span className={`flex-1 text-sm ${st.completed ? "text-brand-muted line-through" : "text-brand-dark"}`}>{st.name}</span>
                    <button onClick={() => removeSubtask(st.id)} className="flex h-6 w-6 items-center justify-center rounded-lg text-xs text-brand-muted/40 transition-all hover:bg-red-50 hover:text-red-400">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="Add a subtask..." className="input-field flex-1 text-sm" onKeyDown={(e) => e.key === "Enter" && addSubtask()} />
              <button onClick={addSubtask} disabled={!newSubtask.trim()} className="btn-secondary shrink-0 text-sm disabled:opacity-50">+ Add</button>
            </div>
          </div>

          {/* Dependencies */}
          <div className="border-t border-brand-cream/40 pt-4">
            <label className="mb-2 block text-sm font-medium text-brand-dark">
              Dependencies <span className="text-xs font-normal text-brand-muted">(tasks to complete first)</span>
            </label>
            {selectedDeps.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {selectedDeps.map((dep) => (
                  <div key={dep.id} className="flex items-center gap-2 rounded-lg bg-brand-warm/20 px-3 py-2">
                    <span className={`h-2 w-2 rounded-full ${dep.status === "completed" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className={`flex-1 text-sm ${dep.status === "completed" ? "text-brand-muted line-through" : "text-brand-dark"}`}>{dep.name}</span>
                    <button onClick={() => toggleDependency(dep.id)} className="flex h-6 w-6 items-center justify-center rounded-lg text-xs text-brand-muted/40 transition-all hover:bg-red-50 hover:text-red-400">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <input value={dependencySearch} onChange={(e) => { setDependencySearch(e.target.value); setShowDepDropdown(true); }} onFocus={() => setShowDepDropdown(true)} onBlur={() => setTimeout(() => setShowDepDropdown(false), 200)} placeholder="Search tasks to depend on..." className="input-field w-full text-sm" />
              {showDepDropdown && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-xl border border-brand-cream/40 bg-white shadow-lg">
                  {filteredDeps.length === 0 ? <p className="px-3 py-3 text-xs text-brand-muted/60">No matching tasks</p> : filteredDeps.map((dep) => {
                    const isSelected = dependencies.includes(dep.id);
                    return (
                      <button key={dep.id} onMouseDown={(e) => { e.preventDefault(); toggleDependency(dep.id); setDependencySearch(""); }} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-all hover:bg-brand-warm/30 ${isSelected ? "bg-brand-warm/20 text-brand-deep font-medium" : "text-brand-dark"}`}>
                        <span className={`h-2 w-2 rounded-full ${dep.status === "completed" ? "bg-emerald-400" : "bg-amber-400"}`} />
                        <span>{dep.name}</span>
                        {isSelected && <span className="ml-auto text-xs text-brand-deep">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-brand-cream/40 pt-4">
            <label className="flex items-center gap-2 text-sm text-brand-muted">
              <input type="checkbox" checked={asDraft} onChange={(e) => setAsDraft(e.target.checked)} className="h-4 w-4 rounded border-brand-cream text-brand-deep" />
              Save as draft
            </label>
            <div className="ml-auto flex gap-2">
              <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
              <button onClick={save} disabled={!name.trim()} className="btn-primary text-sm disabled:opacity-50">Add Task</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}