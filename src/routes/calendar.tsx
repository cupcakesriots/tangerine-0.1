import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppLayout } from "~/components/AppLayout";
import { isOnboardingComplete, getTasks, type Task } from "~/lib/storage";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
});

type ViewMode = "week" | "day" | "agenda" | "month";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("week");
  const [today] = useState(new Date());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isOnboardingComplete()) {
      navigate({ to: "/", replace: true });
      return;
    }
    setTasks(getTasks().filter((t) => t.status !== "draft"));
    setReady(true);
  }, []);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  const isToday = (d: Date) => formatDate(d) === formatDate(today);

  const getWeekDates = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const getMonthDates = () => {
    const year = weekStart.getFullYear();
    const month = weekStart.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days: Date[] = [];
    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, month, -startPad + i + 1);
      days.push(d);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1];
      const next = new Date(last);
      next.setDate(last.getDate() + 1);
      days.push(next);
    }
    return days;
  };

  const getTasksForDate = (date: Date): Task[] => {
    return tasks.filter((t) => t.date === formatDate(date) && t.status !== "completed");
  };

  const navigateWeek = (dir: number) => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + dir * 7);
    setWeekStart(newStart);
  };

  const navigateMonth = (dir: number) => {
    const newStart = new Date(weekStart);
    newStart.setMonth(newStart.getMonth() + dir);
    newStart.setDate(1);
    const day = newStart.getDay();
    newStart.setDate(newStart.getDate() - day);
    setWeekStart(newStart);
  };

  const goToToday = () => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    setWeekStart(d);
  };

  const monthLabel = weekStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const renderAgendaView = () => {
    const weekDates = getWeekDates();
    return (
      <div className="space-y-3">
        {weekDates.map((date) => {
          const dayTasks = getTasksForDate(date);
          if (dayTasks.length === 0) return null;
          return (
            <div key={formatDate(date)} className="card">
              <h3 className={`mb-2 font-serif text-base font-medium ${isToday(date) ? "text-brand-deep" : "text-brand-dark"}`}>
                {date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                {isToday(date) && <span className="ml-2 text-xs text-brand-deep">· Today</span>}
              </h3>
              <div className="space-y-1.5">
                {dayTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 rounded-lg bg-brand-cream/20 px-3 py-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${task.priority === "high" ? "bg-red-400" : task.priority === "medium" ? "bg-amber-400" : "bg-green-400"}`} />
                    <span className="flex-1 text-sm text-brand-dark">{task.name}</span>
                    <span className="text-xs text-brand-muted">{task.projectType}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {weekDates.every((d) => getTasksForDate(d).length === 0) && (
          <div className="card py-8 text-center">
            <p className="text-brand-muted">No tasks this week. Enjoy the open space! 🌿</p>
          </div>
        )}
      </div>
    );
  };

  if (!ready) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-brand-dark sm:text-3xl">Calendar</h1>
            <p className="text-sm text-brand-muted">{monthLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goToToday} className="btn-secondary text-xs">
              Today
            </button>
            {["day", "week", "month", "agenda"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v as ViewMode)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  view === v
                    ? "bg-brand-deep text-white shadow-sm"
                    : "bg-brand-cream/30 text-brand-muted hover:bg-brand-cream/50"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => (view === "month" ? navigateMonth(-1) : navigateWeek(-1))}
            className="btn-ghost"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
            Previous
          </button>
          <h2 className="font-serif text-lg font-medium text-brand-dark">
            {view === "month"
              ? monthLabel
              : `${getWeekDates()[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${getWeekDates()[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
          </h2>
          <button
            onClick={() => (view === "month" ? navigateMonth(1) : navigateWeek(1))}
            className="btn-ghost"
          >
            Next
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>

        {/* Agenda View */}
        {view === "agenda" && renderAgendaView()}

        {/* Day View */}
        {view === "day" && (
          <div className="space-y-4">
            {getWeekDates()
              .filter((_, i) => i === 0)
              .map((date) => (
                <div key={formatDate(date)} className="card">
                  <h3 className={`mb-3 font-serif text-lg font-medium ${isToday(date) ? "text-brand-deep" : "text-brand-dark"}`}>
                    {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    {isToday(date) && <span className="ml-2 text-sm text-brand-light">· Today</span>}
                  </h3>
                  <div className="space-y-2">
                    {getTasksForDate(date).length === 0 ? (
                      <p className="py-4 text-center text-sm text-brand-muted">A blank canvas day. What would feel good?</p>
                    ) : (
                      getTasksForDate(date).map((task) => (
                        <div key={task.id} className="flex items-center gap-3 rounded-xl border border-brand-cream/40 px-4 py-3">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${task.priority === "high" ? "bg-red-400" : task.priority === "medium" ? "bg-amber-400" : "bg-green-400"}`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-brand-dark">{task.name}</p>
                            <p className="text-xs text-brand-muted">{task.projectType} · {task.energyRequired ? '⚡'.repeat(task.energyRequired) : ''}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Week View */}
        {view === "week" && (
          <div className="grid grid-cols-7 gap-2">
            {getWeekDates().map((date) => {
              const dayTasks = getTasksForDate(date);
              return (
                <div key={formatDate(date)} className="min-h-[120px]">
                  <div className={`mb-1 text-center text-xs font-medium ${isToday(date) ? "text-brand-deep" : "text-brand-muted"}`}>
                    <div>{DAYS[date.getDay()]}</div>
                    <div className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm ${isToday(date) ? "bg-brand-deep text-white" : ""}`}>
                      {date.getDate()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className={`truncate rounded-md px-1.5 py-1 text-[10px] font-medium ${
                          task.priority === "high"
                            ? "bg-red-50 text-red-600"
                            : task.priority === "medium"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-green-50 text-green-700"
                        }`}
                      >
                        {task.name}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <p className="text-center text-[10px] text-brand-muted">+{dayTasks.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Month View */}
        {view === "month" && (
          <div>
            <div className="mb-2 grid grid-cols-7 gap-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-brand-muted">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {getMonthDates().map((date) => {
                const dayTasks = getTasksForDate(date);
                const isCurrentMonth = date.getMonth() === weekStart.getMonth();
                return (
                  <div
                    key={formatDate(date)}
                    className={`min-h-[80px] rounded-xl border p-1.5 transition-all ${
                      isToday(date)
                        ? "border-brand-deep bg-brand-warm/30"
                        : isCurrentMonth
                          ? "border-brand-cream/30 bg-white/50"
                          : "border-transparent bg-transparent opacity-40"
                    }`}
                  >
                    <div className={`mb-0.5 text-center text-xs font-medium ${isToday(date) ? "text-brand-deep" : isCurrentMonth ? "text-brand-muted" : "text-brand-muted/40"}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className="truncate rounded px-1 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor:
                              task.priority === "high"
                                ? "#fef2f2"
                                : task.priority === "medium"
                                  ? "#fffbeb"
                                  : "#f0fdf4",
                            color:
                              task.priority === "high"
                                ? "#dc2626"
                                : task.priority === "medium"
                                  ? "#d97706"
                                  : "#16a34a",
                          }}
                        >
                          {task.name}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <p className="text-center text-[9px] text-brand-muted">+{dayTasks.length - 2}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}