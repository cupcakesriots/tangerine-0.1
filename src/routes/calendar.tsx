import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "~/components/AppLayout";
import { isOnboardingComplete, getTasks, type Task } from "~/lib/storage";
import {
  getCalendarSyncState,
  getCalendarEvents,
  getEventsForDate,
  type CalendarEvent,
} from "~/lib/calendarSync";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
});

type ViewMode = "week" | "day" | "agenda" | "month";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Provider-specific styles
const PROVIDER_COLORS: Record<string, { dot: string; bg: string; text: string; icon: string }> = {
  google: { dot: "bg-blue-400", bg: "bg-blue-50", text: "text-blue-700", icon: "📅" },
  outlook: { dot: "bg-sky-400", bg: "bg-sky-50", text: "text-sky-700", icon: "📧" },
  apple: { dot: "bg-gray-400", bg: "bg-gray-50", text: "text-gray-600", icon: "🍎" },
};

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
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [hasCalendars, setHasCalendars] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isOnboardingComplete()) {
      navigate({ to: "/", replace: true });
      return;
    }
    setTasks(getTasks().filter((t) => t.status !== "draft"));
    setReady(true);
  }, []);

  const fetchExternalEvents = useCallback(async (start: Date, end: Date) => {
    const state = getCalendarSyncState();
    const connected =
      state.providers.google === "connected" || state.providers.outlook === "connected";
    setHasCalendars(connected);

    if (!connected) {
      setExternalEvents([]);
      return;
    }

    setEventsLoading(true);
    try {
      const fmt = (d: Date) => d.toISOString().split("T")[0];
      const events = await getCalendarEvents(fmt(start), fmt(end));
      setExternalEvents(events);
    } catch {
      setExternalEvents([]);
    }
    setEventsLoading(false);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + (view === "month" ? 35 : 6));
    fetchExternalEvents(weekStart, weekEnd);
  }, [ready, weekStart, view, fetchExternalEvents]);

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

  const getEventsForDateEx = (date: Date): CalendarEvent[] => {
    return getEventsForDate(formatDate(date), externalEvents);
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

  // ── External Event Renderers ──

  const ExternalEventBadge = ({ event }: { event: CalendarEvent }) => {
    const style = PROVIDER_COLORS[event.source] || PROVIDER_COLORS.google;
    return (
      <div className={`flex items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-[10px] font-medium ${style.bg} ${style.text}`}>
        <span className="text-xs">{style.icon}</span>
        <span className="truncate">{event.title}</span>
      </div>
    );
  };

  const ExternalEventRow = ({ event }: { event: CalendarEvent }) => {
    const style = PROVIDER_COLORS[event.source] || PROVIDER_COLORS.google;
    return (
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border border-dashed ${style.bg} ${style.text}`}>
        <span className="text-sm">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{event.title}</p>
          {event.startTime && (
            <p className="text-xs opacity-70">
              {event.startTime}{event.endTime ? ` – ${event.endTime}` : ""}
            </p>
          )}
        </div>
        {event.location && (
          <span className="text-xs opacity-60 truncate max-w-[100px]">{event.location}</span>
        )}
      </div>
    );
  };

  // ── View Renderers ──

  const renderAgendaView = () => {
    const weekDates = getWeekDates();
    return (
      <div className="space-y-3">
        {weekDates.map((date) => {
          const dayTasks = getTasksForDate(date);
          const dayEvents = getEventsForDateEx(date);
          if (dayTasks.length === 0 && dayEvents.length === 0) return null;
          return (
            <div key={formatDate(date)} className="card">
              <h3 className={`mb-2 font-serif text-base font-medium ${isToday(date) ? "text-brand-deep" : "text-brand-dark"}`}>
                {date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                {isToday(date) && <span className="ml-2 text-xs text-brand-deep">· Today</span>}
              </h3>

              {/* External events */}
              {dayEvents.map((event) => (
                <div key={event.id} className="mb-1.5">
                  <ExternalEventRow event={event} />
                </div>
              ))}

              {/* Task events */}
              {dayTasks.length > 0 && dayEvents.length > 0 && (
                <p className="mb-1 text-[10px] uppercase tracking-wide text-brand-muted/70">Tangerine Tasks</p>
              )}
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
        {weekDates.every((d) => getTasksForDate(d).length === 0 && getEventsForDateEx(d).length === 0) && (
          <div className="card py-8 text-center">
            <p className="text-brand-muted">No tasks or events this week. Enjoy the open space! 🌿</p>
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
            <p className="text-sm text-brand-muted">
              {monthLabel}
              {hasCalendars && (
                <span className="ml-2 text-[10px] text-brand-warm">
                  · Synced with your calendars
                </span>
              )}
            </p>
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
              .map((date) => {
                const dayTasks = getTasksForDate(date);
                const dayEvents = getEventsForDateEx(date);
                return (
                  <div key={formatDate(date)} className="card">
                    <h3 className={`mb-3 font-serif text-lg font-medium ${isToday(date) ? "text-brand-deep" : "text-brand-dark"}`}>
                      {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                      {isToday(date) && <span className="ml-2 text-sm text-brand-light">· Today</span>}
                    </h3>

                    {/* External events */}
                    {dayEvents.map((event) => (
                      <div key={event.id} className="mb-2">
                        <ExternalEventRow event={event} />
                      </div>
                    ))}

                    {dayTasks.length === 0 && dayEvents.length === 0 ? (
                      <p className="py-4 text-center text-sm text-brand-muted">A blank canvas day. What would feel good?</p>
                    ) : (
                      <div className="space-y-2">
                        {dayTasks.length > 0 && dayEvents.length > 0 && (
                          <p className="text-[10px] uppercase tracking-wide text-brand-muted/70">Tasks</p>
                        )}
                        {dayTasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-3 rounded-xl border border-brand-cream/40 px-4 py-3">
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${task.priority === "high" ? "bg-red-400" : task.priority === "medium" ? "bg-amber-400" : "bg-green-400"}`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-brand-dark">{task.name}</p>
                              <p className="text-xs text-brand-muted">{task.projectType} · {task.energyRequired ? '⚡'.repeat(task.energyRequired) : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Week View */}
        {view === "week" && (
          <div className="grid grid-cols-7 gap-2">
            {getWeekDates().map((date) => {
              const dayTasks = getTasksForDate(date);
              const dayEvents = getEventsForDateEx(date);
              return (
                <div key={formatDate(date)} className="min-h-[120px]">
                  <div className={`mb-1 text-center text-xs font-medium ${isToday(date) ? "text-brand-deep" : "text-brand-muted"}`}>
                    <div>{DAYS[date.getDay()]}</div>
                    <div className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm ${isToday(date) ? "bg-brand-deep text-white" : ""}`}>
                      {date.getDate()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {/* External events first */}
                    {dayEvents.slice(0, 2).map((event) => (
                      <ExternalEventBadge key={event.id} event={event} />
                    ))}
                    {/* Tasks */}
                    {dayTasks.slice(0, 3 - dayEvents.slice(0, 2).length).map((task) => (
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
                    {dayTasks.length + dayEvents.length > 3 && (
                      <p className="text-center text-[10px] text-brand-muted">
                        +{dayTasks.length + dayEvents.length - 3} more
                      </p>
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
                const dayEvents = getEventsForDateEx(date);
                const isCurrentMonth = date.getMonth() === weekStart.getMonth();
                const totalItems = dayEvents.length + dayTasks.length;
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
                      {/* External events — show as small provider dots */}
                      {dayEvents.slice(0, 2).map((event) => {
                        const style = PROVIDER_COLORS[event.source] || PROVIDER_COLORS.google;
                        return (
                          <div key={event.id} className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
                            <span className="text-xs">{style.icon}</span> {event.title}
                          </div>
                        );
                      })}
                      {/* Tasks */}
                      {dayTasks.slice(0, Math.max(0, 2 - dayEvents.slice(0, 2).length)).map((task) => (
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
                      {totalItems > 2 && (
                        <p className="text-center text-[9px] text-brand-muted">+{totalItems - 2}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {eventsLoading && (
          <div className="fixed bottom-4 right-4 rounded-full bg-brand-deep px-4 py-2 text-xs text-white shadow-lg animate-pulse">
            Syncing calendars…
          </div>
        )}
      </div>
    </AppLayout>
  );
}
