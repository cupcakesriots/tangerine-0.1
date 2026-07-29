import { getWellnessEntries, getTasks } from "./storage";

// ── Types ──
export interface EnergyForecast {
  status: "cold-start" | "learning" | "ready";
  dataPoints: number;
  hourlyPredictions?: { hour: number; level: number; confidence: number }[];
  peakWindow?: { start: number; end: number; label: string };
  dipWindow?: { start: number; end: number; label: string };
  recommendation?: ForecastRecommendation;
  insights?: EnergyInsights;
}

export interface ForecastRecommendation {
  type: "dip-warning" | "peak-advice" | "recovery-nudge" | "general";
  message: string;
  action?: { label: string; href: string };
}

export interface EnergyInsights {
  avgEnergy: number;
  trend: "rising" | "falling" | "stable";
  mostProductiveDay?: string;
  lowestEnergyDay?: string;
  dominantMood?: string;
  insightMessage: string;
}

export interface WeeklyEnergyReport {
  days: { date: string; dayName: string; level: number; moods: string[]; hasEntry: boolean }[];
  insights: EnergyInsights;
}

// ── Constants ──
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const COLD_START_THRESHOLD = 5;
const DEFAULT_PEAK_START = 8;
const DEFAULT_PEAK_END = 12;
const DEFAULT_DIP_START = 13;
const DEFAULT_DIP_END = 15;

// ── Pattern Analysis ──

/** Analyze all energy data and return a forecast */
export function analyzeEnergyPatterns(): EnergyForecast {
  const entries = getWellnessEntries();
  if (entries.length < COLD_START_THRESHOLD) {
    return {
      status: entries.length === 0 ? "cold-start" : "learning",
      dataPoints: entries.length,
    };
  }

  const avgEnergy = Math.round((entries.reduce((s, e) => s + e.energyLevel, 0) / entries.length) * 10) / 10;

  // Day-of-week analysis
  const dayStats: Record<string, { total: number; count: number }> = {};
  for (const e of entries) {
    const d = new Date(e.date + "T12:00");
    const name = DAY_NAMES[d.getDay()];
    if (!dayStats[name]) dayStats[name] = { total: 0, count: 0 };
    dayStats[name].total += e.energyLevel;
    dayStats[name].count++;
  }

  let mostProductiveDay = "";
  let lowestEnergyDay = "";
  let bestAvg = 0;
  let worstAvg = 6;
  for (const [day, s] of Object.entries(dayStats)) {
    const avg = s.total / s.count;
    if (avg > bestAvg) { bestAvg = avg; mostProductiveDay = day; }
    if (avg < worstAvg) { worstAvg = avg; lowestEnergyDay = day; }
  }

  // Trend: compare last 7 days vs previous 7
  const recent = entries.slice(-7);
  const older = entries.slice(-14, -7);
  const recentAvg = recent.length > 0 ? recent.reduce((s, e) => s + e.energyLevel, 0) / recent.length : avgEnergy;
  const olderAvg = older.length > 0 ? older.reduce((s, e) => s + e.energyLevel, 0) / older.length : recentAvg;
  const trend: "rising" | "falling" | "stable" =
    recentAvg > olderAvg + 0.3 ? "rising" : recentAvg < olderAvg - 0.3 ? "falling" : "stable";

  // Mood analysis
  const moodCounts: Record<string, number> = {};
  for (const e of entries) {
    for (const m of e.moods || []) {
      moodCounts[m] = (moodCounts[m] || 0) + 1;
    }
  }
  let dominantMood = "";
  let maxMood = 0;
  for (const [m, c] of Object.entries(moodCounts)) {
    if (c > maxMood) { maxMood = c; dominantMood = m; }
  }

  // Hourly predictions — infer from task completion patterns vs energy
  const hourlyPredictions: { hour: number; level: number; confidence: number }[] = [];
  const today = new Date().getDay();
  const todayEntries = entries.filter(e => new Date(e.date + "T12:00").getDay() === today);

  // Build a simplified hourly model: morning (8-12), afternoon (12-17), evening (17-21)
  const peakStart = mostProductiveDay === DAY_NAMES[today] ? 8 : DEFAULT_PEAK_START;
  const peakEnd = peakStart + 4;
  const dipStart = DEFAULT_DIP_START;
  const dipEnd = DEFAULT_DIP_END;

  for (let h = 6; h <= 22; h++) {
    let level = avgEnergy;
    let confidence = 0.4;
    if (h >= peakStart && h <= peakEnd) {
      level = Math.min(5, avgEnergy + 0.8);
      confidence = 0.6;
    } else if (h >= dipStart && h <= dipEnd) {
      level = Math.max(1, avgEnergy - 0.7);
      confidence = 0.5;
    }
    hourlyPredictions.push({ hour: h, level: Math.round(level * 10) / 10, confidence: Math.round(confidence * 100) / 100 });
  }

  // Recommendation
  const recommendation = generateRecommendation(avgEnergy, trend, mostProductiveDay, lowestEnergyDay, today, recent);

  const peakWindow = { start: peakStart, end: peakEnd, label: `Peak energy: ${DAY_NAMES[today]} morning` };
  const dipWindow = { start: dipStart, end: dipEnd, label: "Possible afternoon dip" };

  return {
    status: "ready",
    dataPoints: entries.length,
    hourlyPredictions,
    peakWindow,
    dipWindow,
    recommendation,
    insights: {
      avgEnergy,
      trend,
      mostProductiveDay,
      lowestEnergyDay,
      dominantMood,
      insightMessage: buildInsightMessage(avgEnergy, trend, mostProductiveDay, dominantMood),
    },
  };
}

function generateRecommendation(
  avg: number, trend: "rising" | "falling" | "stable",
  bestDay: string, worstDay: string,
  today: number, recent: { energyLevel: number }[]
): ForecastRecommendation {
  // Check for multi-day low energy
  const last4 = recent.slice(-4);
  const lowStreak = last4.filter(e => e.energyLevel <= 2).length;
  if (lowStreak >= 3) {
    return {
      type: "recovery-nudge",
      message: "We noticed your energy has been low the past few days. This isn't a failure — it's information. A lighter day with more breaks might serve you well.",
      action: { label: "Browse reset sessions", href: "/wellness" },
    };
  }

  // Peak advice
  if (bestDay === DAY_NAMES[today]) {
    return {
      type: "peak-advice",
      message: `${bestDay}s tend to be your most energized days. If there's something that needs focus, the morning hours may be your sweet spot.`,
    };
  }

  // Dip warning
  if (worstDay === DAY_NAMES[today] || trend === "falling") {
    return {
      type: "dip-warning",
      message: "You might notice your energy dipping this afternoon. A 5-minute reset around 2pm could help you move through it with less friction.",
      action: { label: "Open breathing coach", href: "/wellness" },
    };
  }

  // General
  if (trend === "rising") {
    return { type: "general", message: "Your energy trend is rising. Notice what's contributing to that — those conditions are worth protecting." };
  }

  return { type: "general", message: "Your energy patterns are uniquely yours. Pay attention to what feels sustainable and what doesn't." };
}

function buildInsightMessage(avg: number, trend: string, bestDay: string, mood: string): string {
  if (trend === "rising") return "Your energy has been trending upward recently. Whatever you're doing — it seems to be working.";
  if (trend === "falling") return "Your energy has been dipping recently. This isn't a judgment — it might be worth asking what your body needs.";
  if (bestDay) return `${bestDay}s appear to be when you're most energized. Interesting pattern to keep in mind.`;
  if (mood) return `"${mood}" is your most frequent mood lately. That's worth noticing.`;
  return "Still gathering data — the more you check in, the more patterns will emerge.";
}

// ── Weekly Report ──
export function generateWeeklyReport(): WeeklyEnergyReport {
  const entries = getWellnessEntries();
  const today = new Date();
  const days: WeeklyEnergyReport["days"] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const entry = entries.find(e => e.date === dateStr);
    days.push({
      date: dateStr,
      dayName: DAY_NAMES[d.getDay()],
      level: entry?.energyLevel || 0,
      moods: entry?.moods || [],
      hasEntry: !!entry,
    });
  }

  const insights = analyzeEnergyPatterns().insights || {
    avgEnergy: 0, trend: "stable" as const, insightMessage: "Log more energy check-ins to reveal your patterns.",
  };

  return { days, insights };
}

// ── Smart Scheduling ──
export interface TaskEnergyHint {
  taskId: string;
  timingBadge?: { label: string; type: "peak" | "caution" | "neutral" };
}

export function getTaskEnergyHints(): { hints: TaskEnergyHint[]; globalNudge?: string } {
  const forecast = analyzeEnergyPatterns();
  const todayTasks = getTasks().filter(t => t.date === new Date().toISOString().split("T")[0] && (t.status === "active" || t.status === "draft"));

  if (forecast.status !== "ready" || todayTasks.length === 0) return { hints: [] };

  const hints: TaskEnergyHint[] = [];
  const peakWindow = forecast.peakWindow;
  const dipWindow = forecast.dipWindow;
  const now = new Date().getHours();
  const isInDip = dipWindow && now >= dipWindow.start && now <= dipWindow.end;

  let highEffortInDip = 0;

  for (const task of todayTasks) {
    const effort = task.energyRequired || 3;
    const hint: TaskEnergyHint = { taskId: task.id };

    if (effort >= 3 && peakWindow && now < peakWindow.end) {
      hint.timingBadge = { label: `Best before ${peakWindow.end}am`, type: "peak" };
    } else if (effort >= 3 && isInDip) {
      hint.timingBadge = { label: "Energy dip now — gentle pacing advised", type: "caution" };
      highEffortInDip++;
    }

    hints.push(hint);
  }

  let globalNudge: string | undefined;
  if (highEffortInDip >= 2) {
    globalNudge = "You have a few high-effort tasks during a time when your energy typically dips. No pressure — just something to be aware of.";
  }

  return { hints, globalNudge };
}
