import { useState, useRef, useCallback } from "react";
import { parseFile, getSupportedFormats, type ParsedTask } from "~/lib/fileParser";
import { addTask, generateId, type Task } from "~/lib/storage";

type Step = "upload" | "preview" | "import";

interface Props {
  onClose: () => void;
  onImported: () => void; // refresh task list after import
}

export function FileImportModal({ onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [defaultPriority, setDefaultPriority] = useState<"low" | "medium" | "high">("medium");
  const [defaultType, setDefaultType] = useState<string>("personal");
  const [importCount, setImportCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formats = getSupportedFormats();

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ── Upload step ──
  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    setLoading(true);
    try {
      const tasks = await parseFile(f);
      setParsedTasks(tasks);
      setSelected(new Set(tasks.map((_, i) => i)));
      setStep("preview");
    } catch (err) {
      setError("Couldn't read this file — try a different format");
    }
    setLoading(false);
  }, []);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  // ── Preview step ──
  const toggleAll = () => {
    if (selected.size === parsedTasks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(parsedTasks.map((_, i) => i)));
    }
  };

  const toggleOne = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  };

  // ── Import step ──
  const doImport = () => {
    const toImport = parsedTasks.filter((_, i) => selected.has(i));
    const today = new Date().toISOString().split("T")[0];

    for (const pt of toImport) {
      const task: Task = {
        id: generateId(),
        name: pt.name,
        description: pt.description || "",
        date: pt.date || today,
        priority: pt.priority || defaultPriority,
        status: "active",
        projectType: pt.projectType || defaultType as Task["projectType"],
        recurring: false,
        solo: true,
        subtasks: [],
        delegationNotes: "",
        tags: pt.tags || [],
        createdAt: new Date().toISOString(),
        energyRequired: 3,
        dependencies: [],
      };
      addTask(task);
    }

    setImportCount(toImport.length);
    setStep("import");
  };

  const resetToUpload = () => {
    setStep("upload");
    setFile(null);
    setParsedTasks([]);
    setSelected(new Set());
    setError(null);
  };

  const projectTypes = [
    { value: "personal", label: "👤 Personal" },
    { value: "work", label: "💼 Work" },
    { value: "creative", label: "🎨 Creative" },
    { value: "health", label: "💚 Health" },
    { value: "errand", label: "🛒 Errand" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/10 backdrop-blur-sm sm:items-center"
      onClick={handleBackdrop}
    >
      <div className="flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-white/95 p-6 shadow-xl backdrop-blur-2xl sm:max-w-lg sm:rounded-2xl slide-up">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-brand-dark">
            {step === "upload" && "📎 Import Tasks"}
            {step === "preview" && "👀 Preview Tasks"}
            {step === "import" && "✅ Import Complete"}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* ── STEP: Upload ── */}
        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-brand-muted">
              Upload an Excel, CSV, Markdown, or text file. Each row or line becomes a task you can review before importing.
            </p>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                dragOver
                  ? "border-brand-deep bg-brand-warm/30"
                  : "border-brand-cream/60 bg-brand-cream/10 hover:border-brand-light hover:bg-brand-cream/20"
              }`}
            >
              <div className="mb-2 text-3xl">📂</div>
              <p className="text-sm font-medium text-brand-dark">
                {dragOver ? "Drop your file here" : "Click to choose a file"}
              </p>
              <p className="mt-1 text-xs text-brand-muted">or drag and drop</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.md,.txt"
              onChange={handleFilePick}
              className="hidden"
            />

            {/* Supported formats */}
            <div className="rounded-xl bg-brand-cream/20 p-3">
              <p className="mb-1.5 text-xs font-medium text-brand-muted">Supported formats:</p>
              <div className="flex flex-wrap gap-1.5">
                {formats.map((f) => (
                  <span key={f.ext} className="rounded-full bg-white/60 px-2.5 py-1 text-[11px] font-medium text-brand-dark">
                    .{f.ext} — {f.label}
                  </span>
                ))}
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-brand-muted">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-light border-r-transparent" />
                Reading file…
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── STEP: Preview ── */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-muted">
                {parsedTasks.length} {parsedTasks.length === 1 ? "task" : "tasks"} found · {selected.size} selected
              </p>
              <button onClick={toggleAll} className="btn-ghost text-xs">
                {selected.size === parsedTasks.length ? "Deselect all" : "Select all"}
              </button>
            </div>

            {/* Task list */}
            <div className="max-h-[300px] space-y-1 overflow-y-auto rounded-xl bg-brand-cream/10 p-2">
              {parsedTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-brand-muted">No tasks found in this file.</p>
              ) : (
                parsedTasks.map((task, i) => (
                  <label
                    key={i}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg p-2.5 transition-all ${
                      selected.has(i) ? "bg-white/70" : "opacity-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleOne(i)}
                      className="mt-0.5 h-4 w-4 rounded border-brand-cream text-brand-deep focus:ring-brand-light"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-brand-dark truncate">
                        {task.name}
                      </span>
                      {task.description && (
                        <span className="mt-0.5 block text-xs text-brand-muted truncate">
                          {task.description}
                        </span>
                      )}
                      <div className="mt-0.5 flex flex-wrap gap-1.5">
                        {task.priority && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            task.priority === "high" ? "bg-red-50 text-red-600" : task.priority === "medium" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
                          }`}>
                            {task.priority}
                          </span>
                        )}
                        {task.date && (
                          <span className="rounded-full bg-brand-warm/30 px-1.5 py-0.5 text-[10px] font-medium text-brand-deep">
                            📅 {task.date}
                          </span>
                        )}
                        {task.projectType && (
                          <span className="rounded-full bg-brand-warm/30 px-1.5 py-0.5 text-[10px] font-medium text-brand-deep">
                            {task.projectType}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            {/* Defaults */}
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-brand-cream/10 p-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-muted">Default priority</label>
                <select
                  value={defaultPriority}
                  onChange={(e) => setDefaultPriority(e.target.value as any)}
                  className="input-field text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-muted">Default type</label>
                <select
                  value={defaultType}
                  onChange={(e) => setDefaultType(e.target.value)}
                  className="input-field text-sm"
                >
                  {projectTypes.map((pt) => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
              </div>
              <p className="col-span-2 text-[10px] text-brand-muted">
                These defaults apply to imported tasks that don't specify a priority or type.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t border-brand-cream/40 pt-4">
              <button onClick={resetToUpload} className="btn-ghost text-sm">← Back</button>
              <div className="ml-auto flex gap-2">
                <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
                <button
                  onClick={doImport}
                  disabled={selected.size === 0}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  Import {selected.size} {selected.size === 1 ? "task" : "tasks"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: Import Complete ── */}
        {step === "import" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 p-6 text-center">
              <div className="mb-3 text-4xl">✨</div>
              <p className="text-lg font-medium text-emerald-700">
                {importCount} {importCount === 1 ? "task" : "tasks"} imported
              </p>
              <p className="mt-1 text-sm text-emerald-600">
                {file?.name} was processed successfully.
              </p>
            </div>

            <div className="flex gap-2 border-t border-brand-cream/40 pt-4">
              <button
                onClick={() => {
                  onImported();
                  onClose();
                }}
                className="btn-ghost text-sm"
              >
                Done
              </button>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => {
                    onImported();
                    resetToUpload();
                  }}
                  className="btn-secondary text-sm"
                >
                  Import another file
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
