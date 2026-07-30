// localStorage-based persistence for the Tangerine prototype
// All data persists across page refreshes without a backend.

export interface OnboardingData {
  completed: boolean;
  energyPeak: "morning" | "afternoon" | "evening";
  painPoints: string[];
  nudgeStyle: "gentle" | "structured" | "both";
  quietHoursStart: string; // "HH:MM" format
  quietHoursEnd: string;
  name: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  date: string;
  startTime?: string;
  endTime?: string;
  priority: "low" | "medium" | "high";
  status: "draft" | "active" | "completed" | "snoozed" | "cancelled" | "on_hold";
  projectType: "personal" | "work" | "creative" | "health" | "errand";
  recurring: boolean;
  recurringPattern?: string;
  solo: boolean;
  groupName?: string;
  subtasks: Subtask[];
  delegationNotes: string;
  tags: string[];
  createdAt: string;
  energyRequired?: number;
  blockers?: string[];
  dependencies: string[]; // task IDs this task depends on
}

export interface Subtask {
  id: string;
  name: string;
  completed: boolean;
}

export interface WellnessEntry {
  id: string;
  date: string;
  energyLevel: number; // 1-5
  moods?: string[];
  activities: string[];
  notes: string;
}

export interface CoachMessage {
  id: string;
  role: "user" | "coach";
  content: string;
  timestamp: string;
  type: "chat" | "nudge" | "suggestion" | "cbt-card" | "subtask-breakdown" | "thought-reframe" | "breathing-guide" | "decision-tree" | "scenario-suggestion" | "dopamine-cold-start" | "burnout-boundary" | "clarity-checkin" | "focus-timer" | "task-reschedule" | "task-creator";
  data?: CoachInteractiveData;
}

export interface CoachInteractiveData {
  // CBT Unblocking Card
  thought?: string;
  reframe?: string;
  cbtStep?: "identify" | "challenge" | "reframe";
  // Subtask Breakdown
  taskId?: string;
  taskName?: string;
  subtasks?: Subtask[];
  // Thought Reframer
  negativeThought?: string;
  alternative?: string;
  // Breathing Guide
  pattern?: "4-4-4" | "4-7-8" | "box";
  // Decision Tree
  options?: { label: string; action: string; icon?: string }[];
  // Scenario Suggestion
  scenario?: string;
  suggestions?: string[];
  category?: "adhd" | "burnout" | "variable-capacity" | "procrastination" | "overwhelm" | "focus" | "motivation";
  // Dopamine Cold Start
  avoidedTask?: string;
  noveltySwitches?: string[];
  // Burnout Boundary Guard
  requestToDecline?: string;
  boundaryTemplates?: string[];
  // Clarity Check-in
  diagnosticQuestions?: { id: string; question: string }[];
  diagnosticAnswers?: Record<string, string>;
  diagnosticStep?: "physical" | "mental" | "environmental" | "summary";
  // Focus Timer
  focusDuration?: number; // minutes
  focusPresets?: number[]; // available durations
  // Task Reschedule
  rescheduleAction?: "move-to-tomorrow" | "postpone-week" | "clear-low-priority";
  affectedTaskCount?: number;
  affectedTasks?: { id: string; name: string; oldDate: string }[];
  // Task Creator
  parsedTasks?: { id: string; name: string; date: string; priority: "low" | "medium" | "high"; subtasks?: { id: string; name: string }[]; selected: boolean }[];
  createdCount?: number;
  createdTaskIds?: string[];
}

export interface UserSettings {
  quietHoursStart: string;
  quietHoursEnd: string;
  nudgeStyle: "gentle" | "structured" | "both";
  theme: "warm" | "light";
  notifications: boolean;
}

// Generic typed localStorage helper
function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Onboarding ---
const ONBOARDING_KEY = "tangerine_onboarding";

export function getOnboarding(): OnboardingData | null {
  return getItem<OnboardingData | null>(ONBOARDING_KEY, null);
}

export function saveOnboarding(data: OnboardingData): void {
  setItem(ONBOARDING_KEY, data);
}

export function isOnboardingComplete(): boolean {
  const data = getOnboarding();
  return data?.completed === true;
}

// --- Tasks ---
const TASKS_KEY = "tangerine_tasks";

export function getTasks(): Task[] {
  const tasks = getItem<Task[]>(TASKS_KEY, []);
  // Migrate: ensure all tasks have the dependencies field
  let migrated = false;
  const migratedTasks = tasks.map((t) => {
    if (!Array.isArray(t.dependencies)) {
      migrated = true;
      return { ...t, dependencies: [] };
    }
    return t;
  });
  if (migrated) saveTasks(migratedTasks);
  return migratedTasks;
}

export function saveTasks(tasks: Task[]): void {
  setItem(TASKS_KEY, tasks);
}

export function addTask(task: Task): void {
  const tasks = getTasks();
  tasks.push(task);
  saveTasks(tasks);
}

export function updateTask(id: string, updates: Partial<Task>): void {
  const tasks = getTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx !== -1) {
    tasks[idx] = { ...tasks[idx], ...updates };
    saveTasks(tasks);
  }
}

export function deleteTask(id: string): void {
  const tasks = getTasks().filter((t) => t.id !== id);
  saveTasks(tasks);
}

// --- Wellness / Energy ---
const WELLNESS_KEY = "tangerine_wellness";

export function getWellnessEntries(): WellnessEntry[] {
  return getItem<WellnessEntry[]>(WELLNESS_KEY, []);
}

export function addWellnessEntry(entry: WellnessEntry): void {
  const entries = getWellnessEntries();
  entries.push(entry);
  setItem(WELLNESS_KEY, entries);
}

export function getTodaysWellness(): WellnessEntry | undefined {
  const today = new Date().toISOString().split("T")[0];
  return getWellnessEntries().find((e) => e.date === today);
}

// --- Coach Chat ---
const COACH_KEY = "tangerine_coach_chat";

export function getCoachMessages(): CoachMessage[] {
  return getItem<CoachMessage[]>(COACH_KEY, []);
}

export function addCoachMessage(msg: CoachMessage): void {
  const msgs = getCoachMessages();
  msgs.push(msg);
  setItem(COACH_KEY, msgs);
}

export function clearCoachMessages(): void {
  setItem(COACH_KEY, []);
}

// --- Settings ---
const SETTINGS_KEY = "tangerine_settings";

export function getSettings(): UserSettings {
  return getItem<UserSettings>(SETTINGS_KEY, {
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    nudgeStyle: "gentle",
    theme: "warm",
    notifications: true,
  });
}

export function saveSettings(settings: UserSettings): void {
  setItem(SETTINGS_KEY, settings);
}

// --- Mock Integration Status ---
const INTEGRATIONS_KEY = "tangerine_integrations";

export interface Integration {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  lastSync?: string;
  description: string;
}

export function getIntegrations(): Integration[] {
  return getItem<Integration[]>(INTEGRATIONS_KEY, [
    { id: "google-cal", name: "Google Calendar", icon: "calendar", connected: true, lastSync: "2 min ago", description: "Sync your events and see your day at a glance." },
    { id: "fitness", name: "Fitness Tracker", icon: "heart", connected: false, description: "Import step counts, heart rate, and activity data to inform your energy levels." },
    { id: "slack", name: "Slack", icon: "message-square", connected: false, description: "Get gentle nudges and daily planning prompts without leaving Slack." },
    { id: "zoom", name: "Zoom", icon: "video", connected: false, description: "Auto-detect meeting times and build focus blocks around them." },
    { id: "notes", name: "Notes App", icon: "file-text", connected: false, description: "Keep meeting notes and quick capture linked to your tasks." },
    { id: "smart-home", name: "Smart Home", icon: "home", connected: false, description: "Let your smart lights and thermostat support your focus and rest sessions." },
  ]);
}

export function toggleIntegration(id: string): void {
  const integrations = getIntegrations();
  const idx = integrations.findIndex((i) => i.id === id);
  if (idx !== -1) {
    integrations[idx].connected = !integrations[idx].connected;
    integrations[idx].lastSync = integrations[idx].connected ? "Just now" : undefined;
    setItem(INTEGRATIONS_KEY, integrations);
  }
}

// --- Utility to generate IDs ---
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// Check if a task is blocked by unmet dependencies
// Cancelled deps do NOT block — they were an intentional withdrawal
export function isTaskBlocked(task: Task, allTasks: Task[]): boolean {
  if (!task.dependencies || task.dependencies.length === 0) return false;
  return task.dependencies.some((depId) => {
    const dep = allTasks.find((t) => t.id === depId);
    return !dep || (dep.status !== "completed" && dep.status !== "cancelled");
  });
}

// Get names of blocking (unmet) dependencies
export function getBlockingTaskNames(task: Task, allTasks: Task[]): string[] {
  if (!task.dependencies || task.dependencies.length === 0) return [];
  return task.dependencies
    .filter((depId) => {
      const dep = allTasks.find((t) => t.id === depId);
      return !dep || (dep.status !== "completed" && dep.status !== "cancelled");
    })
    .map((depId) => allTasks.find((t) => t.id === depId)?.name || "Unknown task");
}

// Check if all dependencies are met (all completed or cancelled)
export function areAllDepsCompleted(task: Task, allTasks: Task[]): boolean {
  if (!task.dependencies || task.dependencies.length === 0) return false;
  return task.dependencies.every((depId) => {
    const dep = allTasks.find((t) => t.id === depId);
    return dep && (dep.status === "completed" || dep.status === "cancelled");
  });
}

// Sample tasks to populate the dashboard when first loaded
export function getSampleTasks(): Task[] {
  const depId1 = generateId();
  return [
    {
      id: depId1,
      name: "Research competitors",
      description: "Look into 3-5 competitors and note key features",
      date: new Date().toISOString().split("T")[0],
      priority: "high",
      status: "active",
      projectType: "work",
      recurring: false,
      solo: true,
      subtasks: [],
      delegationNotes: "",
      tags: ["work", "research"],
      createdAt: new Date().toISOString(),
      energyRequired: 3,
      dependencies: [],
    },
    {
      id: generateId(),
      name: "Draft project proposal",
      description: "Outline the key sections and rough timeline",
      date: new Date().toISOString().split("T")[0],
      priority: "high",
      status: "active",
      projectType: "work",
      recurring: false,
      solo: true,
      subtasks: [{ id: generateId(), name: "Write outline", completed: false }, { id: generateId(), name: "Add timeline estimates", completed: false }],
      delegationNotes: "",
      tags: ["work", "project"],
      createdAt: new Date().toISOString(),
      energyRequired: 4,
      dependencies: [depId1],
    },
    {
      id: generateId(),
      name: "Morning walk",
      description: "15 min walk around the block",
      date: new Date().toISOString().split("T")[0],
      priority: "medium",
      status: "active",
      projectType: "health",
      recurring: true,
      recurringPattern: "daily",
      solo: true,
      subtasks: [],
      delegationNotes: "",
      tags: ["health", "routine"],
      createdAt: new Date().toISOString(),
      energyRequired: 2,
      dependencies: [],
    },
    {
      id: generateId(),
      name: "Sketch UI ideas",
      description: "Freeform sketching for the new feature",
      date: new Date().toISOString().split("T")[0],
      priority: "low",
      status: "active",
      projectType: "creative",
      recurring: false,
      solo: true,
      subtasks: [],
      delegationNotes: "",
      tags: ["creative", "design"],
      createdAt: new Date().toISOString(),
      energyRequired: 3,
      dependencies: [],
    },
    {
      id: generateId(),
      name: "Review team retro notes",
      description: "Read through notes and add action items",
      date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      priority: "medium",
      status: "active",
      projectType: "work",
      recurring: false,
      solo: true,
      subtasks: [],
      delegationNotes: "Ask Sarah for the latest version",
      tags: ["work", "team"],
      createdAt: new Date().toISOString(),
      energyRequired: 3,
      dependencies: [],
    },
    {
      id: generateId(),
      name: "Grocery run",
      description: "Weekly groceries",
      date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      priority: "low",
      status: "active",
      projectType: "errand",
      recurring: true,
      recurringPattern: "weekly",
      solo: true,
      subtasks: [{ id: generateId(), name: "Make a list", completed: false }],
      delegationNotes: "Partner can pick up if busy",
      tags: ["errand", "weekly"],
      createdAt: new Date().toISOString(),
      energyRequired: 2,
      dependencies: [],
    },
  ];
}