import { useCallback, useEffect, useState } from "react";
import { fetchRoutineData } from "./api/routines.js";
import { fetchLastSavedRoutine, syncTodayRoutine, toggleTask } from "./api/routineLog.js";
import AuthPage from "./components/AuthPage.jsx";
import LastDaySummary from "./components/LastDaySummary.jsx";
import UserBar from "./components/UserBar.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import {
  buildSchedule,
  getCurrentSlot,
  getNextSlot,
  isSlotActive,
} from "./utils/schedule.js";
import { countCompleted, formatLocalDate, scheduleToTasks, taskId } from "./utils/tasks.js";
import "./App.css";

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ScheduleItem({ start, end, label, isActive, done, onToggle, disabled }) {
  const id = taskId(start, end, label);

  return (
    <div
      className={`card${isActive ? " card--active" : ""}${done ? " card--done" : ""}`}
    >
      <div className="card__row">
        <label className="card__check">
          <input
            type="checkbox"
            checked={done}
            disabled={disabled}
            onChange={(e) => onToggle(id, e.target.checked)}
            aria-label={`Mark ${label} as done`}
          />
          <span className="card__checkmark" aria-hidden="true" />
        </label>
        <div className="card__body">
          <div className="card__time">
            <span className="time-range">
              {start} – {end}
            </span>
            {isActive && <span className="now-badge">Now</span>}
          </div>
          <p className="card__label">{label}</p>
        </div>
      </div>
    </div>
  );
}

function TaskBanner({ variant, slot }) {
  const isCurrent = variant === "current";

  const content = isCurrent
    ? slot
      ? {
          icon: "⚡",
          headline: "You're on it!",
          motto: "One block at a time — make this one count.",
          task: slot.label,
          meta: `${slot.start} – ${slot.end}`,
        }
      : {
          icon: "☀️",
          headline: "Breathing room",
          motto: "Rest sharpens focus. Use this gap wisely.",
          task: "No scheduled task right now",
          meta: null,
        }
    : slot
      ? {
          icon: "🎯",
          headline: "Up next",
          motto: "Get ready — your next win is around the corner.",
          task: slot.label,
          meta: `Starts at ${slot.start}`,
        }
      : {
          icon: "🌙",
          headline: "Day complete!",
          motto: "You showed up today. Rest well and come back stronger.",
          task: "No more tasks on the schedule",
          meta: null,
        };

  return (
    <div className={`banner banner--${variant}`}>
      <div className="banner__top">
        <span className="banner__icon" aria-hidden="true">
          {content.icon}
        </span>
        <div className="banner__intro">
          <span className="banner__headline">{content.headline}</span>
          <span className="banner__motto">{content.motto}</span>
        </div>
      </div>
      <p className="banner__task">{content.task}</p>
      {content.meta && <span className="banner__meta">{content.meta}</span>}
    </div>
  );
}

function AppShell({ children }) {
  return (
    <div className="app">
      <header className="header">
        <p className="header__owner">Kishan Kumar</p>
        <h1>My Weekly Routine</h1>
        <p className="header__subtitle">Stay on track, one block at a time</p>
      </header>
      <UserBar />
      {children}
    </div>
  );
}

function RoutineDashboard() {
  const [routineData, setRoutineData] = useState(null);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const [routineLocked, setRoutineLocked] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [now, setNow] = useState(() => new Date());

  const today = formatLocalDate(now);
  const dayOfWeek = now.getDay();

  const loadRoutineState = useCallback(async (data, date, dow) => {
    const schedule = buildSchedule(dow, data);
    const taskList = scheduleToTasks(schedule);

    const [todayLog, savedLog] = await Promise.all([
      syncTodayRoutine({ date, dayOfWeek: dow, tasks: taskList }),
      fetchLastSavedRoutine(date),
    ]);

    setTasks(todayLog.tasks);
    setRoutineLocked(todayLog.status === "saved");
    setLastSaved(savedLog);
  }, []);

  useEffect(() => {
    fetchRoutineData()
      .then(setRoutineData)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!routineData) return;

    setSyncing(true);
    loadRoutineState(routineData, today, dayOfWeek)
      .catch((err) => setError(err.message))
      .finally(() => setSyncing(false));
  }, [routineData, today, dayOfWeek, loadRoutineState]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleToggle = async (id, done) => {
    const previous = tasks;
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done } : task))
    );
    setTogglingId(id);

    try {
      const updated = await toggleTask({ date: today, taskId: id, done });
      setTasks(updated.tasks);
      setRoutineLocked(updated.status === "saved");
    } catch (err) {
      setTasks(previous);
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  if (error) {
    return (
      <div className="state-message state-message--error">
        <span className="state-message__icon">!</span>
        <p>{error}</p>
      </div>
    );
  }

  if (!routineData || syncing) {
    return (
      <div className="banner banner--loading">
        <div className="spinner" aria-hidden="true" />
        <span>Loading your schedule…</span>
      </div>
    );
  }

  const schedule = buildSchedule(dayOfWeek, routineData);
  const currentSlot = getCurrentSlot(schedule, now);
  const nextSlot = getNextSlot(schedule, now);
  const { done, total } = countCompleted(tasks);
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const doneById = Object.fromEntries(tasks.map((task) => [task.id, task.done]));

  return (
    <>
      <LastDaySummary routine={lastSaved} />

      <div className="banners">
        <TaskBanner variant="current" slot={currentSlot} />
        <TaskBanner variant="next" slot={nextSlot} />
      </div>

      <section className="schedule-section">
        <div className="day-header">
          <div>
            <h2>{routineData.days[dayOfWeek]}</h2>
            <time className="day-header__date" dateTime={today}>
              {formatDate(now)}
            </time>
          </div>
          <div className="day-header__progress">
            <span className="day-header__progress-label">
              {done}/{total} done
            </span>
            <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="schedule-list">
          {schedule.map(([start, end, label]) => {
            const id = taskId(start, end, label);
            return (
              <ScheduleItem
                key={id}
                start={start}
                end={end}
                label={label}
                isActive={isSlotActive([start, end, label], now)}
                done={Boolean(doneById[id])}
                disabled={routineLocked || togglingId === id}
                onToggle={handleToggle}
              />
            );
          })}
        </div>
      </section>
    </>
  );
}

export default function App() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="auth-page">
        <div className="banner banner--loading">
          <div className="spinner" aria-hidden="true" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <AppShell>
      <RoutineDashboard />
    </AppShell>
  );
}
