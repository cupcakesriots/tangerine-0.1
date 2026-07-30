// Fitness tracker integration — mock data engine for Tangerine
// Stores realistic simulated health data in localStorage for the Premium tier.

export type TrackerProvider = "apple-health" | "garmin" | null;

export interface FitnessSettings {
  connected: boolean;
  provider: TrackerProvider;
  lastSync: string | null;
  syncedTypes: DataType[];
  demoMode: boolean;
}

export type DataType = "steps" | "heartRate" | "sleep" | "workouts" | "activeMinutes";

export interface DailyFitnessData {
  date: string;
  steps: number;
  heartRateResting: number;
  sleepHours: number;
  activeMinutes: number;
  workouts: WorkoutEntry[];
}

export interface WorkoutEntry {
  type: string;
  durationMinutes: number;
  intensity: "low" | "moderate" | "high";
}

export interface FitnessSummary {
  today: {
    steps: number;
    activeMinutes: number;
    sleepHours: number;
  } | null;
  provider: TrackerProvider;
}

export interface CorrelationInsight {
  text: string;
  type: "sleep-energy" | "steps-energy" | "active-energy" | "insufficient-data";
}

const FITNESS_KEY = "tangerine_fitness";
const FITNESS_DATA_KEY = "tangerine_fitness_data";

const DEFAULT_SETTINGS: FitnessSettings = {
  connected: false,
  provider: null,
  lastSync: null,
  syncedTypes: ["steps", "activeMinutes", "sleep"],
  demoMode: false,
};

export function getFitnessSettings(): FitnessSettings {
  try {
    const raw = localStorage.getItem(FITNESS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.syncedTypes)) {
      parsed.syncedTypes = ["steps", "activeMinutes", "sleep"];
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveFitnessSettings(settings: FitnessSettings): void {
  try {
    localStorage.setItem(FITNESS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event("fitness-settings-changed"));
  } catch { /* noop */ }
}

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function generateWorkouts(_date: string): WorkoutEntry[] {
  if (Math.random() > 0.4) return [];
  const types: WorkoutEntry[] = [
    { type: "Walking", durationMinutes: randomBetween(15, 45), intensity: "low" },
    { type: "Running", durationMinutes: randomBetween(15, 40), intensity: "high" },
    { type: "Yoga", durationMinutes: randomBetween(20, 60), intensity: "low" },
    { type: "Strength Training", durationMinutes: randomBetween(25, 60), intensity: "high" },
    { type: "Cycling", durationMinutes: randomBetween(20, 50), intensity: "moderate" },
  ];
  const count = Math.random() > 0.7 ? 2 : 1;
  return types.sort(() => Math.random() - 0.5).slice(0, count);
}

function generateDailyData(date: string, includeWorkouts: boolean): DailyFitnessData {
  const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
  return {
    date,
    steps: isWeekend ? randomBetween(3000, 12000) : randomBetween(2000, 15000),
    heartRateResting: randomBetween(55, 85),
    sleepHours: parseFloat((isWeekend ? randomBetween(6, 9) : randomBetween(5, 8.5)).toFixed(1)),
    activeMinutes: randomBetween(10, 90),
    workouts: includeWorkouts ? generateWorkouts(date) : [],
  };
}

export function seedDemoData(): DailyFitnessData[] {
  const data: DailyFitnessData[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push(generateDailyData(d.toISOString().split("T")[0], i >= 7));
  }
  try { localStorage.setItem(FITNESS_DATA_KEY, JSON.stringify(data)); } catch { /* noop */ }
  return data;
}

export function getFitnessData(): DailyFitnessData[] {
  try {
    const raw = localStorage.getItem(FITNESS_DATA_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  const settings = getFitnessSettings();
  if (settings.demoMode) return seedDemoData();
  return [];
}

export function getFitnessSummary(): FitnessSummary | null {
  const settings = getFitnessSettings();
  if (!settings.connected) return null;
  const data = getFitnessData();
  if (data.length === 0) return null;
  const today = data[data.length - 1];
  const summary: FitnessSummary = {
    today: { steps: 0, activeMinutes: 0, sleepHours: 0 },
    provider: settings.provider,
  };
  if (settings.syncedTypes.includes("steps")) summary.today!.steps = today.steps;
  if (settings.syncedTypes.includes("activeMinutes")) summary.today!.activeMinutes = today.activeMinutes;
  if (settings.syncedTypes.includes("sleep")) summary.today!.sleepHours = today.sleepHours;
  return summary;
}

export function getCorrelationInsight(): CorrelationInsight | null {
  const settings = getFitnessSettings();
  if (!settings.connected) return null;
  const data = getFitnessData();
  if (data.length < 5) return { text: "Keep logging — patterns will emerge as more days are recorded.", type: "insufficient-data" };

  let wellnessEntries: { date: string; energyLevel: number }[] = [];
  try {
    const raw = localStorage.getItem("tangerine_wellness");
    if (raw) wellnessEntries = JSON.parse(raw).map((e: { date: string; energyLevel: number }) => ({ date: e.date, energyLevel: e.energyLevel }));
  } catch { /* noop */ }

  if (wellnessEntries.length < 3) return { text: "As you log your energy each day, connections between your movement and mood will start to appear.", type: "insufficient-data" };

  const energyMap = new Map<string, number>();
  wellnessEntries.forEach((e) => energyMap.set(e.date, e.energyLevel));
  const matchedDays = data.filter((d) => energyMap.has(d.date));
  if (matchedDays.length < 3) return { text: "A few more days of overlap between your check-ins and fitness data will reveal interesting patterns.", type: "insufficient-data" };

  const highSleepDays = matchedDays.filter((d) => d.sleepHours >= 7);
  const highSleepEnergy = highSleepDays.length > 0 ? highSleepDays.reduce((s, d) => s + (energyMap.get(d.date) || 0), 0) / highSleepDays.length : 0;
  const highStepsDays = matchedDays.filter((d) => d.steps >= 7000);
  const highStepsEnergy = highStepsDays.length > 0 ? highStepsDays.reduce((s, d) => s + (energyMap.get(d.date) || 0), 0) / highStepsDays.length : 0;
  const lowStepsDays = matchedDays.filter((d) => d.steps < 7000);
  const lowStepsEnergy = lowStepsDays.length > 0 ? lowStepsDays.reduce((s, d) => s + (energyMap.get(d.date) || 0), 0) / lowStepsDays.length : 0;

  const avgEnergy = matchedDays.reduce((s, d) => s + (energyMap.get(d.date) || 0), 0) / matchedDays.length;
  const sleepDiff = highSleepEnergy - avgEnergy;
  const stepsDiff = highStepsEnergy - lowStepsEnergy;

  if (sleepDiff > 0.3 && highSleepDays.length >= 3) {
    return { text: `On days you log 7+ hours of sleep, your energy averages ${highSleepEnergy.toFixed(1)}/5 — noticeably higher than on shorter nights.`, type: "sleep-energy" };
  }
  if (stepsDiff > 0.3 && highStepsDays.length >= 3 && lowStepsDays.length >= 3) {
    return { text: `Your step count and energy levels tend to rise together. On more active days, your energy averages ${highStepsEnergy.toFixed(1)}/5.`, type: "steps-energy" };
  }
  return { text: `Across ${matchedDays.length} days of tracking, your average energy level is ${avgEnergy.toFixed(1)}/5. The more you log, the clearer your patterns become.`, type: "insufficient-data" };
}

export async function simulateOAuthFlow(provider: TrackerProvider): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
  const settings = getFitnessSettings();
  settings.connected = true;
  settings.provider = provider;
  settings.lastSync = new Date().toISOString();
  saveFitnessSettings(settings);
  if (settings.demoMode || getFitnessData().length === 0) seedDemoData();
  return true;
}

export async function disconnectTracker(): Promise<void> {
  const settings = getFitnessSettings();
  settings.connected = false;
  settings.provider = null;
  settings.lastSync = null;
  saveFitnessSettings(settings);
}

export async function syncNow(): Promise<string> {
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
  const settings = getFitnessSettings();
  const now = new Date().toISOString();
  settings.lastSync = now;
  saveFitnessSettings(settings);
  const today = new Date().toISOString().split("T")[0];
  const data = getFitnessData();
  if (!data.some((d) => d.date === today)) {
    data.push(generateDailyData(today, true));
    localStorage.setItem(FITNESS_DATA_KEY, JSON.stringify(data));
  }
  return now;
}

export function toggleDataType(type: DataType): void {
  const settings = getFitnessSettings();
  settings.syncedTypes = settings.syncedTypes.includes(type)
    ? settings.syncedTypes.filter((t) => t !== type)
    : [...settings.syncedTypes, type];
  saveFitnessSettings(settings);
}

export function toggleDemoMode(): boolean {
  const settings = getFitnessSettings();
  settings.demoMode = !settings.demoMode;
  saveFitnessSettings(settings);
  if (settings.demoMode) seedDemoData();
  return settings.demoMode;
}

export function getLastSyncText(): string | null {
  const settings = getFitnessSettings();
  if (!settings.lastSync) return null;
  const diff = Date.now() - new Date(settings.lastSync).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? "s" : ""} ago`;
}

export const PROVIDER_LABELS: Record<string, string> = { "apple-health": "Apple Health", garmin: "Garmin Connect" };
export const PROVIDER_ICONS: Record<string, string> = { "apple-health": "❤️", garmin: "⌚" };
export const DATA_TYPE_LABELS: Record<DataType, { label: string; icon: string }> = {
  steps: { label: "Steps", icon: "👣" },
  heartRate: { label: "Heart Rate", icon: "💓" },
  sleep: { label: "Sleep", icon: "🌙" },
  workouts: { label: "Workouts", icon: "🏋️" },
  activeMinutes: { label: "Active Minutes", icon: "⏱️" },
};
