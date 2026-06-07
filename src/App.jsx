import { useEffect, useState } from "react";
import { fetchRoutineData } from "./api/routines.js";
import {
  buildSchedule,
  getCurrentSlot,
  getNextSlot,
  isSlotActive,
} from "./utils/schedule.js";
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
      {children}
    </div>
  );
}

export default function App() {
  const [routineData, setRoutineData] = useState(null);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    fetchRoutineData()
      .then(setRoutineData)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
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

  const dayOfWeek = now.getDay();
  const schedule = buildSchedule(dayOfWeek, routineData);
  const currentSlot = getCurrentSlot(schedule, now);
  const nextSlot = getNextSlot(schedule, now);

  return (
    <AppShell>
      <div className="banners">
        <TaskBanner variant="current" slot={currentSlot} />
        <TaskBanner variant="next" slot={nextSlot} />
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
