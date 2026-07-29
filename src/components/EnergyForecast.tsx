import { useEffect, useState } from "react";
import { analyzeEnergyPatterns, generateWeeklyReport, getTaskEnergyHints, type EnergyForecast, type WeeklyEnergyReport, type TaskEnergyHint } from "~/lib/energyForecast";
import { Link } from "@tanstack/react-router";

// ── Energy Forecast Card ──
export function EnergyForecastCard() {
  const [forecast, setForecast] = useState<EnergyForecast | null>(null);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  useEffect(() => {
    setForecast(analyzeEnergyPatterns());
  }, []);

  if (!forecast) return null;
  const now = new Date().getHours();

  // Cold start / learning state
  if (forecast.status === "cold-start") {
    return (
      <div className="card-elevated bg-gradient-to-br from-brand-cream/40 to-brand-warm/10" data-premium="energy-forecast">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔮</span>
          <h3 className="font-serif text-sm font-semibold text-brand-dark">Today's Energy Forecast</h3>
          <span className="ml-auto rounded-full bg-brand-gold/10 px-2 py-0.5 text-[10px] font-medium text-brand-deep">Premium</span>
        </div>
        <p className="text-sm text-brand-muted">Log your energy a few more times and patterns will start to emerge. Every check-in teaches us a little more about your rhythm.</p>
        <Link to="/wellness" className="btn-ghost text-xs mt-3 inline-block">Log your first check-in 🌿</Link>
      </div>
    );
  }

  if (forecast.status === "learning") {
    return (
      <div className="card-elevated bg-gradient-to-br from-brand-cream/40 to-brand-warm/10" data-premium="energy-forecast">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔮</span>
          <h3 className="font-serif text-sm font-semibold text-brand-dark">Today's Energy Forecast</h3>
          <span className="ml-auto rounded-full bg-brand-gold/10 px-2 py-0.5 text-[10px] font-medium text-brand-deep">Premium</span>
        </div>
        <p className="text-sm text-brand-muted">Still learning your patterns — {forecast.dataPoints} check-ins so far. A few more and we'll start seeing your unique rhythm.</p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-brand-cream/30"><div className="h-1.5 rounded-full bg-brand-gold transition-all" style={{ width: `${Math.min((forecast.dataPoints / 5) * 100, 100)}%` }} /></div>
      </div>
    );
  }

  // Ready state with predictions
  const preds = forecast.hourlyPredictions || [];
  const maxLevel = 5;

  return (
    <div className="card-elevated bg-gradient-to-br from-brand-cream/40 to-brand-warm/10" data-premium="energy-forecast">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🔮</span>
        <h3 className="font-serif text-sm font-semibold text-brand-dark">Today's Energy Forecast</h3>
        <span className="ml-auto rounded-full bg-brand-gold/10 px-2 py-0.5 text-[10px] font-medium text-brand-deep">Premium</span>
      </div>

      {/* Hourly bar chart */}
      <div className="flex items-end gap-[2px] h-24 mb-3">
        {preds.map(p => (
          <div key={p.hour} className="flex-1 flex flex-col items-center group relative"
            onMouseEnter={() => setHoveredHour(p.hour)} onMouseLeave={() => setHoveredHour(null)}>
            <div className="flex-1 w-full flex items-end">
              <div
                className={`w-full rounded-sm transition-all ${p.hour === now ? "bg-brand-deep" : p.confidence > 0.5 ? "bg-brand-gold/70" : "bg-brand-cream/50"}`}
                style={{ height: `${(p.level / maxLevel) * 100}%` }}
              />
            </div>
            {/* Time label every 3 hours */}
            {p.hour % 3 === 0 && <span className="text-[9px] text-brand-muted/50 mt-1">{p.hour > 12 ? p.hour - 12 : p.hour}{p.hour >= 12 ? "p" : "a"}</span>}
            {/* Hover tooltip */}
            {hoveredHour === p.hour && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg bg-brand-dark px-2 py-1 text-[10px] text-white whitespace-nowrap z-10">
                {p.hour > 12 ? p.hour - 12 : p.hour}{p.hour >= 12 ? "pm" : "am"}: {p.level}/5
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Now indicator */}
      {preds.find(p => p.hour === now) && (
        <div className="flex items-center gap-2 mb-4 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-deep animate-gentle-pulse" />
          <span className="text-brand-muted">Now · forecast level: <span className="font-medium text-brand-dark">{preds.find(p => p.hour === now)!.level}/5</span></span>
        </div>
      )}

      {/* Recommendation */}
      {forecast.recommendation && (
        <div className="rounded-xl bg-brand-warm/30 p-3 border border-brand-light/10">
          <p className="text-xs leading-relaxed text-brand-dark">{forecast.recommendation.message}</p>
          {forecast.recommendation.action && (
            <Link to={forecast.recommendation.action.href} className="btn-ghost text-xs mt-2 inline-block">
              {forecast.recommendation.action.label} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Weekly Energy Report ──
export function WeeklyEnergyReport() {
  const [report, setReport] = useState<WeeklyEnergyReport | null>(null);
  useEffect(() => { setReport(generateWeeklyReport()); }, []);
  if (!report) return null;

  const dayAbbr = (dn: string) => dn.slice(0, 3);
  const maxLevel = 5;
  const hasData = report.days.some(d => d.hasEntry);

  if (!hasData) return (
    <div className="card-elevated bg-gradient-to-br from-brand-cream/40 to-white" data-premium="weekly-report">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <h3 className="font-serif text-sm font-semibold text-brand-dark">Your Energy Week</h3>
      </div>
      <p className="text-sm text-brand-muted">No energy check-ins this week yet. A quick log each day helps uncover your unique patterns.</p>
    </div>
  );

  return (
    <div className="card-elevated bg-gradient-to-br from-brand-cream/40 to-white" data-premium="weekly-report">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📊</span>
        <h3 className="font-serif text-sm font-semibold text-brand-dark">Your Energy Week</h3>
      </div>

      {/* Day bars */}
      <div className="flex items-end gap-1.5 h-20 mb-4">
        {report.days.map(d => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex-1 w-full flex items-end">
              {d.hasEntry ? (
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: `${(d.level / maxLevel) * 100}%`,
                    background: d.level <= 2 ? "#f5c6c0" : d.level === 3 ? "#f5d5a8" : d.level >= 4 ? "#a3c9a8" : "#f0e6d3",
                  }}
                />
              ) : (
                <div className="w-full rounded-sm h-1 bg-brand-cream/20" />
              )}
            </div>
            <span className="text-[9px] text-brand-muted/50">{dayAbbr(d.dayName)}</span>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {report.insights.mostProductiveDay && (
            <span className="rounded-full bg-brand-leaf/10 px-2 py-0.5 text-brand-leaf font-medium">✨ {report.insights.mostProductiveDay}</span>
          )}
          {report.insights.lowestEnergyDay && (
            <span className="rounded-full bg-brand-rose/10 px-2 py-0.5 text-brand-rose font-medium">🌧 {report.insights.lowestEnergyDay}</span>
          )}
          {report.insights.dominantMood && (
            <span className="rounded-full bg-brand-warm/30 px-2 py-0.5 text-brand-dark font-medium">💭 {report.insights.dominantMood}</span>
          )}
        </div>
        <p className="text-xs text-brand-muted italic leading-relaxed">{report.insights.insightMessage}</p>
      </div>
    </div>
  );
}

// ── Smart Scheduling Hints (for task views) ──
export function SmartSchedulingHint({ taskId }: { taskId: string }) {
  const [hint, setHint] = useState<TaskEnergyHint | null>(null);
  useEffect(() => {
    const { hints } = getTaskEnergyHints();
    setHint(hints.find(h => h.taskId === taskId) || null);
  }, [taskId]);
  if (!hint?.timingBadge) return null;

  const colors = {
    peak: "bg-brand-warm/30 text-brand-dark border-brand-light/20",
    caution: "bg-brand-rose/5 text-brand-rose border-brand-rose/10",
    neutral: "bg-brand-cream/20 text-brand-muted border-brand-cream/20",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${colors[hint.timingBadge.type]}`} data-premium="scheduling-hint">
      {hint.timingBadge.type === "peak" ? "⚡ " : hint.timingBadge.type === "caution" ? "🌤 " : ""}
      {hint.timingBadge.label}
    </span>
  );
}

export function GlobalSchedulingNudge() {
  const [nudge, setNudge] = useState<string | undefined>(undefined);
  useEffect(() => {
    const { globalNudge } = getTaskEnergyHints();
    setNudge(globalNudge);
  }, []);
  if (!nudge) return null;

  return (
    <div className="card-warm text-xs text-brand-dark leading-relaxed flex items-start gap-2" data-premium="global-nudge">
      <span className="text-base mt-0.5">💡</span>
      <p>{nudge}</p>
    </div>
  );
}
