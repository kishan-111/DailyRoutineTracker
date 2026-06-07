import { useEffect, useState } from "react";
import { fetchRoutineData } from "./api/routines.js";
import { buildSchedule, getCurrentTask, isSlotActive } from "./utils/schedule.js";
import "./App.css";

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ScheduleItem({ start, end, label, isActive }) {
  return (
    <div className={`card${isActive ? " card--active" : ""}`}>
      <div className="card__time">
        <span className="time-range">
          {start} – {end}
        </span>
        {isActive && <span className="now-badge">Now</span>}
      </div>
      <p className="card__label">{label}</p>
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
      {children}
    </div>
  );
}

export default function App() {
  const [routineData, setRoutineData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRoutineData()
      .then(setRoutineData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <AppShell>
        <div className="state-message state-message--error">
          <span className="state-message__icon">!</span>
          <p>Failed to load routine: {error}</p>
        </div>
      </AppShell>
    );
  }

  if (!routineData) {
    return (
      <AppShell>
        <div className="banner banner--loading">
          <div className="spinner" aria-hidden="true" />
          <span>Loading your schedule…</span>
        </div>
      </AppShell>
    );
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const schedule = buildSchedule(dayOfWeek, routineData);
  const currentTask = getCurrentTask(schedule, now);

  return (
    <AppShell>
      <div className="banner">
        <span className="banner__label">Current task</span>
        <span className="banner__task">{currentTask}</span>
      </div>

      <section className="schedule-section">
        <div className="day-header">
          <h2>{routineData.days[dayOfWeek]}</h2>
          <time className="day-header__date" dateTime={now.toISOString().slice(0, 10)}>
            {formatDate(now)}
          </time>
        </div>

        <div className="schedule-list">
          {schedule.map(([start, end, label]) => (
            <ScheduleItem
              key={`${start}-${end}-${label}`}
              start={start}
              end={end}
              label={label}
              isActive={isSlotActive([start, end, label], now)}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
