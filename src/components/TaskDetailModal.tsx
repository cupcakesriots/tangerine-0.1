import { useState, useEffect, useRef } from "react";
import { type Task, type Subtask, generateId, getTasks, isTaskBlocked, getBlockingTaskNames, areAllDepsCompleted } from "~/lib/storage";

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
}

export function TaskDetailModal({ task, onClose, onSave, onDelete }: TaskDetailModalProps) {
  const allTasks = getTasks();
  const blocked = isTaskBlocked(task, allTasks);
  const depsReady = !blocked && areAllDepsCompleted(task, allTasks);
  const blockingNames = blocked ? getBlockingTaskNames(task, allTasks) : [];

  // Editable fields
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description);
  const [date, setDate] = useState(task.date);
  const [priority, setPriority] = useState<Task["priority"]>(task.priority);
  const [projectType, setProjectType] = useState<Task["projectType"]>(task.projectType);
  const [recurring, setRecurring] = useState(task.recurring);
  const [solo, setSolo] = useState(task.solo);
  const [energyRequired, setEnergyRequired] = useState<number>(task.energyRequired || 3);
  const [tagsInput, setTagsInput] = useState(task.tags.join(", "));
  const [delegationNotes, setDelegationNotes] = useState(task.delegationNotes);
  const [status, setStatus] = useState<Task["status"]>(task.status);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [dependencies, setDependencies] = useState<string[]>(task.dependencies || []);
  const [newSubtask, setNewSubtask] = useState("");
  const [dependencySearch, setDependencySearch] = useState("");
  const [showDepDropdown, setShowDepDropdown] = useState(false);
  const depInputRef = useRef<HTMLInputElement>(null);

  // Prevent scroll on body when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...task,
      name: name.trim(),
      description: description.trim(),
      date,
      priority,
      projectType,
      recurring,
      solo,
      energyRequired,
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      delegationNotes: delegationNotes.trim(),
      status,
      subtasks,
      dependencies,
    });
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, { id: generateId(), name: newSubtask.trim(), completed: false }]);
    setNewSubtask("");
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(subtasks.map((s) => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const toggleDependency = (depId: string) => {
    setDependencies((prev) =>
      prev.includes(depId) ? prev.filter((d) => d !== depId) : [...prev, depId]
    );
  };

  // Filter available dependency tasks: active/draft tasks, not self, not already a dependency of self
  const availableDeps = allTasks.filter(
    (t) => t.id !== task.id && t.status !== "completed" && t.status !== "snoozed" && t.status !== "cancelled" && t.status !== "on_hold"
  );
  const filteredDeps = dependencySearch
    ? availableDeps.filter((t) => t.name.toLowerCase().includes(dependencySearch.toLowerCase()))
    : availableDeps;

  const selectedDeps = allTasks.filter((t) => dependencies.includes(t.id));

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const typeIcons: Record<string, string> = {
    personal: "👤", work: "💼", creative: "🎨", health: "💚", errand: "🛒",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/10 backdrop-blur-sm sm:items-center" onClick={handleBackdrop}>
      <div className="flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-white/95 p-6 shadow-xl backdrop-blur-2xl sm:max-w-xl sm:rounded-2xl slide-up">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-xl font-semibold text-brand-dark">Edit Task</h2>
            {blocked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700" title={blockingNames.join(", ")}>
                ⛓️ Blocked{blockingNames.length > 0 ? `: ${blockingNames[0]}` : ""}{blockingNames.length > 1 ? ` +${blockingNames.length - 1}` : ""}
              </span>
            )}
            {depsReady && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                🔓 Ready
              </span>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Task name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-dark">Task name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What do you want to do?"
              className="input-field"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-dark">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add some details..."
              rows={2}
              className="input-field resize-none"
            />
          </div>

          {/* Date, Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])} className="input-field">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Project type, Energy */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">Project type</label>
              <select value={projectType} onChange={(e) => setProjectType(e.target.value as Task["projectType"])} className="input-field">
                <option value="personal">👤 Personal</option>
                <option value="work">💼 Work</option>
                <option value="creative">🎨 Creative</option>
                <option value="health">💚 Health</option>
                <option value="errand">🛒 Errand</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-dark">Energy needed ⚡</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setEnergyRequired(n)}
                    className={`flex-1 rounded-lg py-2 text-center text-xs font-medium transition-all ${
                      energyRequired === n
                        ? "bg-brand-deep text-white shadow-sm"
                        : "bg-brand-cream/30 text-brand-muted hover:bg-brand-cream/50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-dark">Status</label>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { value: "active", label: "Active", icon: "📋" },
                { value: "draft", label: "Draft", icon: "📝" },
                { value: "completed", label: "Done", icon: "✅" },
                { value: "snoozed", label: "Snoozed", icon: "😴" },
                { value: "on_hold", label: "On Hold", icon: "⏸️" },
                { value: "cancelled", label: "Cancelled", icon: "❌" },
              ] as const).map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setStatus(value)}
                  className={`rounded-lg py-2 text-center text-xs font-medium transition-all ${
                    status === value
                      ? value === "cancelled"
                        ? "bg-red-100 text-red-700 shadow-sm ring-1 ring-red-200"
                        : value === "on_hold"
                          ? "bg-amber-100 text-amber-700 shadow-sm ring-1 ring-amber-200"
                          : "bg-brand-deep text-white shadow-sm"
                      : value === "cancelled"
                        ? "bg-red-50/30 text-red-400/60 hover:bg-red-50/60"
                        : value === "on_hold"
                          ? "bg-amber-50/30 text-amber-400/60 hover:bg-amber-50/60"
                          : "bg-brand-cream/30 text-brand-muted hover:bg-brand-cream/50"
                  }`}
                >
                  <span className="mr-0.5">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Recurring / Solo */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-brand-dark">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4 rounded border-brand-cream text-brand-deep" />
              🔄 Recurring
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-dark">
              <input type="checkbox" checked={!solo} onChange={(e) => setSolo(!e.target.checked)} className="h-4 w-4 rounded border-brand-cream text-brand-deep" />
              👥 Group task
            </label>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-dark">Tags (comma-separated)</label>
            <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. work, urgent, design" className="input-field" />
          </div>

          {/* Delegation notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-dark">Delegation notes</label>
            <input value={delegationNotes} onChange={(e) => setDelegationNotes(e.target.value)} placeholder="Who else is involved?" className="input-field" />
          </div>

          {/* ===== SUBTASKS ===== */}
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
                      onClick={() => toggleSubtask(st.id)}
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        st.completed
                          ? "border-brand-deep bg-brand-deep text-white"
                          : "border-brand-cream/60 hover:border-brand-light"
                      }`}
                    >
                      {st.completed && (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                    <span className={`flex-1 text-sm ${st.completed ? "text-brand-muted line-through" : "text-brand-dark"}`}>
                      {st.name}
                    </span>
                    <button
                      onClick={() => removeSubtask(st.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-xs text-brand-muted/40 transition-all hover:bg-red-50 hover:text-red-400"
                      title="Remove subtask"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Add a subtask..."
                className="input-field flex-1 text-sm"
                onKeyDown={(e) => e.key === "Enter" && addSubtask()}
              />
              <button
                onClick={addSubtask}
                disabled={!newSubtask.trim()}
                className="btn-secondary shrink-0 text-sm disabled:opacity-50"
              >
                + Add
              </button>
            </div>
          </div>

          {/* ===== DEPENDENCIES ===== */}
          <div className="border-t border-brand-cream/40 pt-4">
            <label className="mb-2 block text-sm font-medium text-brand-dark">
              Dependencies
              <span className="ml-1.5 text-xs font-normal text-brand-muted">
                (tasks that must be completed first)
              </span>
            </label>

            {/* Selected dependencies */}
            {selectedDeps.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {selectedDeps.map((dep) => (
                  <div key={dep.id} className="flex items-center gap-2 rounded-lg bg-brand-warm/20 px-3 py-2">
                    <span className={`h-2 w-2 rounded-full ${dep.status === "completed" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className={`flex-1 text-sm ${dep.status === "completed" ? "text-brand-muted line-through" : "text-brand-dark"}`}>
                      {dep.name}
                    </span>
                    <span className="text-[10px] text-brand-muted/60">
                      {dep.status === "completed" ? "✓ Done" : dep.status === "draft" ? "Draft" : "Pending"}
                    </span>
                    <button
                      onClick={() => toggleDependency(dep.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-xs text-brand-muted/40 transition-all hover:bg-red-50 hover:text-red-400"
                      title="Remove dependency"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Dependency search / add */}
            <div className="relative">
              <input
                ref={depInputRef}
                value={dependencySearch}
                onChange={(e) => { setDependencySearch(e.target.value); setShowDepDropdown(true); }}
                onFocus={() => setShowDepDropdown(true)}
                onBlur={() => setTimeout(() => setShowDepDropdown(false), 200)}
                placeholder="Search tasks to depend on..."
                className="input-field w-full text-sm"
              />
              {showDepDropdown && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-xl border border-brand-cream/40 bg-white shadow-lg">
                  {filteredDeps.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-brand-muted/60">No matching tasks</p>
                  ) : (
                    filteredDeps.map((dep) => {
                      const isSelected = dependencies.includes(dep.id);
                      return (
                        <button
                          key={dep.id}
                          onMouseDown={(e) => { e.preventDefault(); toggleDependency(dep.id); setDependencySearch(""); }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-all hover:bg-brand-warm/30 ${
                            isSelected ? "bg-brand-warm/20 text-brand-deep font-medium" : "text-brand-dark"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${dep.status === "completed" ? "bg-emerald-400" : "bg-amber-400"}`} />
                          <span>{dep.name}</span>
                          {isSelected && <span className="ml-auto text-xs text-brand-deep">✓</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            {dependencies.length > 0 && blocked && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                <span>⛓️</span>
                Blocked by: {blockingNames.join(", ")}
              </p>
            )}
            {dependencies.length > 0 && depsReady && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                <span>🔓</span>
                All dependencies completed — ready to start!
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 border-t border-brand-cream/40 pt-4">
            <button
              onClick={() => { onDelete(task.id); onClose(); }}
              className="btn-ghost text-sm text-red-400 hover:text-red-500"
            >
              🗑️ Delete
            </button>
            <div className="ml-auto flex gap-2">
              <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
