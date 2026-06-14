import { useCallback, useEffect, useState } from "react";
import { fetchRoutineData } from "./api/routines.js";
import { fetchLastSavedRoutine, syncTodayRoutine, toggleTask } from "./api/routineLog.js";
import AuthPage from "./components/AuthPage.jsx";
import UserBar from "./components/UserBar.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import {
  buildSchedule,
  getCurrentSlot,
  getNextSlot,
  isSlotActive,
} from "./utils/schedule.js";
import { groupByPhase, getActivePhaseId, getPastPhaseIds } from "./utils/phases.js";
import { countCompleted, formatLocalDate, scheduleToTasks, taskId } from "./utils/tasks.js";
import "./App.css";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function categoryIcon(tags = []) {
  if (tags.includes("health"))        return "🥗";
  if (tags.includes("coding"))        return "💻";
  if (tags.includes("system-design")) return "🏗️";
  if (tags.includes("learning"))      return "📚";
  if (tags.includes("career"))        return "🚀";
  if (tags.includes("family"))        return "❤️";
  if (tags.includes("relationships")) return "💬";
  if (tags.includes("planning"))      return "📋";
  if (tags.includes("atomic-habits")) return "⚙️";
  if (tags.includes("finance"))       return "💰";
  if (tags.includes("mental-health")) return "🧘";
  return "✦";
}

function tagClass(tag) {
  const known = new Set([
    "health", "career", "learning", "family", "relationships",
    "planning", "personal",
  ]);
  return known.has(tag) ? `card__tag--${tag}` : "card__tag--default";
}

// ─── InfoCard ─────────────────────────────────────────────────────────────────

/** A single item inside an info section — title + description + optional tags */
function InfoCard({ title, description, tags, accent }) {
  return (
    <div className={`info-card info-card--${accent}`}>
      <p className="info-card__title">{title}</p>
      {description && <p className="info-card__desc">{description}</p>}
      {tags && tags.length > 0 && (
        <div className="info-card__tags">
          {tags.map((t) => (
            <span key={t} className={`card__tag ${tagClass(t)}`}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Collapsible section wrapping a list of InfoCards */
function InfoSection({ icon, title, items, accent, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`info-section info-section--${accent}`}>
      <button
        type="button"
        className="info-section__header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="info-section__icon" aria-hidden="true">{icon}</span>
        <span className="info-section__title">{title}</span>
        <span className="info-section__count">{items.length}</span>
        <span className={`phase__chevron${open ? " phase__chevron--open" : ""}`} aria-hidden="true">›</span>
      </button>
      <div className={`phase__body${open ? " phase__body--open" : ""}`}>
        <div className="info-section__body">
          {items.map((item, i) => (
            <InfoCard
              key={i}
              title={item.title}
              description={item.description}
              tags={item.tags}
              accent={accent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ScheduleItem ────────────────────────────────────────────────────────────

function ScheduleItem({
  start, end, label, description, tags, isActive, done, onToggle, disabled, isLast,
}) {
  const [expanded, setExpanded] = useState(false);
  const id = taskId(start, end, label);
  const icon = categoryIcon(tags);
  const hasDetails = description || (tags && tags.length > 0);

  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  return (
    <div className={`card${isActive ? " card--active" : ""}${done ? " card--done" : ""}${isLast ? " card--last" : ""}`}>
      {/* Timeline rail */}
      <div className="card__rail">
        <div className="card__dot" />
        <div className="card__line" />
      </div>

      <div className="card__content">
        <div
          className="card__inner"
          onClick={() => hasDetails && setExpanded((v) => !v)}
          role={hasDetails ? "button" : undefined}
          tabIndex={hasDetails ? 0 : undefined}
          onKeyDown={(e) => {
            if (hasDetails && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
          aria-expanded={hasDetails ? expanded : undefined}
        >
          <div className="card__row">
            <label className="card__check" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={done}
                disabled={disabled}
                onChange={(e) => onToggle(id, e.target.checked)}
                aria-label={`Mark "${label}" as done`}
              />
              <span className="card__checkmark" aria-hidden="true" />
            </label>

            <div className="card__body">
              <div className="card__meta">
                <span className="time-range">{start} – {end}</span>
                {isActive && <span className="now-badge">Now</span>}
                <span className="card__category-icon" aria-hidden="true">{icon}</span>
              </div>
              <p className="card__label">{label}</p>
              {hasDetails && (
                <p className="card__expand-hint">
                  <i className={`card__chevron${expanded ? " card__chevron--open" : ""}`} aria-hidden="true">▾</i>
                  {expanded ? "less" : "details"}
                </p>
              )}
            </div>
          </div>

          {hasDetails && (
            <div className={`card__details${expanded ? " card__details--open" : ""}`}>
              {description && <p className="card__description">{description}</p>}
              {tags && tags.length > 0 && (
                <div className="card__tags" aria-label="Tags">
                  {tags.map((tag) => (
                    <span key={tag} className={`card__tag ${tagClass(tag)}`}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PhaseBlock ──────────────────────────────────────────────────────────────

function PhaseBlock({ phase, tasks, isActive, isPast, doneById, togglingId, routineLocked, onToggle, now }) {
  const doneTasks  = tasks.filter((t) => Boolean(doneById[taskId(t.start, t.end, t.title)]));
  const allDone    = doneTasks.length === tasks.length;
  const phaseDone  = doneTasks.length;
  const phaseTotal = tasks.length;

  // Only the active phase starts open; everything else starts closed
  const [open, setOpen] = useState(isActive);

  // When the clock ticks and a new phase becomes active, open it
  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  const stateClass = isActive ? "phase--active" : isPast ? "phase--past" : "phase--future";

  return (
    <div className={`phase ${stateClass}${allDone ? " phase--done" : ""}`}>
      {/* Phase header — clicking toggles the task list */}
      <button
        type="button"
        className="phase__header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="phase__icon" aria-hidden="true">{phase.icon}</span>
        <span className="phase__label">{phase.label}</span>

        <span className="phase__meta">
          {phase.from && phase.to && (
            <span className="phase__time-range">{phase.from} – {phase.to}</span>
          )}
          <span className="phase__count">
            {allDone
              ? <span className="phase__count--done">✓ All done</span>
              : <span>{phaseDone}/{phaseTotal}</span>
            }
          </span>
        </span>

        <span className={`phase__chevron${open ? " phase__chevron--open" : ""}`} aria-hidden="true">
          ›
        </span>
      </button>

      {/* Mini progress bar under header */}
      <div className="phase__progress-bar" aria-hidden="true">
        <div
          className="phase__progress-fill"
          style={{ width: `${phaseTotal > 0 ? (phaseDone / phaseTotal) * 100 : 0}%` }}
        />
      </div>

      {/* Task list */}
      <div className={`phase__body${open ? " phase__body--open" : ""}`}>
        <div className="phase__tasks">
          {tasks.map((item, idx) => {
            const id = taskId(item.start, item.end, item.title);
            return (
              <ScheduleItem
                key={id}
                start={item.start}
                end={item.end}
                label={item.title}
                description={item.description}
                tags={item.tags}
                isActive={isSlotActive(item, now)}
                done={Boolean(doneById[id])}
                disabled={routineLocked || togglingId === id}
                onToggle={onToggle}
                isLast={idx === tasks.length - 1}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── TaskBanner ──────────────────────────────────────────────────────────────

function TaskBanner({ variant, slot }) {
  const isCurrent = variant === "current";

  const content = isCurrent
    ? slot
      ? {
          icon: "⚡",
          headline: "In progress",
          motto: "One block at a time — make this one count.",
          task: slot.title,
          meta: `${slot.start} – ${slot.end}`,
        }
      : {
          icon: "☀️",
          headline: "Free moment",
          motto: "Rest sharpens focus. Use this gap wisely.",
          task: "No scheduled task right now",
          meta: null,
        }
    : slot
      ? {
          icon: "🎯",
          headline: "Up next",
          motto: "Get ready — your next win is near.",
          task: slot.title,
          meta: `Starts at ${slot.start}`,
        }
      : {
          icon: "🌙",
          headline: "Day complete!",
          motto: "You showed up today. Rest well.",
          task: "No more tasks scheduled",
          meta: null,
        };

  return (
    <div className={`banner banner--${variant}`}>
      <div className="banner__top">
        <span className="banner__icon" aria-hidden="true">{content.icon}</span>
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

// ─── AppShell ────────────────────────────────────────────────────────────────

function AppShell({ children }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="app">
      <header className="header">
        <p className="header__greeting">{greeting}, Kishan 👋</p>
        <h1>Your Day</h1>
        <p className="header__subtitle">One block at a time</p>
      </header>
      <UserBar />
      {children}
    </div>
  );
}

// ─── RoutineDashboard ────────────────────────────────────────────────────────

function RoutineDashboard() {
  const [routineData, setRoutineData] = useState(null);
  const [error, setError]             = useState(null);
  const [tasks, setTasks]             = useState([]);
  const [routineLocked, setRoutineLocked] = useState(false);
  const [syncing, setSyncing]         = useState(true);
  const [togglingId, setTogglingId]   = useState(null);
  const [now, setNow]                 = useState(() => new Date());

  const today     = formatLocalDate(now);
  const dayOfWeek = now.getDay();

  const loadRoutineState = useCallback(async (data, date, dow) => {
    const schedule = buildSchedule(dow, data);
    const taskList = scheduleToTasks(schedule);
    const todayLog = await syncTodayRoutine({ date, dayOfWeek: dow, tasks: taskList });
    setTasks(todayLog.tasks);
    setRoutineLocked(todayLog.status === "saved");
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
        <span className="state-message__icon" aria-hidden="true">!</span>
        <p>{error}</p>
      </div>
    );
  }

  if (!routineData || syncing) {
    return (
      <div className="banner banner--loading" role="status">
        <div className="spinner" aria-hidden="true" />
        <span>Loading your schedule…</span>
      </div>
    );
  }

  const schedule      = buildSchedule(dayOfWeek, routineData);
  const currentSlot   = getCurrentSlot(schedule, now);
  const nextSlot      = getNextSlot(schedule, now);
  const { done, total } = countCompleted(tasks);
  const progress      = total > 0 ? Math.round((done / total) * 100) : 0;
  const doneById      = Object.fromEntries(tasks.map((t) => [t.id, t.done]));

  const phases        = groupByPhase(schedule, dayOfWeek);
  const activePhaseId = getActivePhaseId(dayOfWeek, now);
  const pastPhaseIds  = getPastPhaseIds(dayOfWeek, now);

  return (
    <>
      <div className="banners">
        <TaskBanner variant="current" slot={currentSlot} />
        <TaskBanner variant="next"    slot={nextSlot} />
      </div>

      <section className="schedule-section">
        {/* Day header with overall progress */}
        <div className="day-header">
          <div>
            <h2>{routineData.days[dayOfWeek]}</h2>
            <time className="day-header__date" dateTime={today}>
              {formatDate(now)}
            </time>
          </div>
          <div className="day-header__progress">
            <span className="day-header__progress-label">{done} / {total} done</span>
            <div
              className="progress-bar"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${progress}% of tasks completed`}
            >
              <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Phase accordion */}
        <div className="phases">
          {phases.map(({ phase, tasks: phaseTasks }) => (
            <PhaseBlock
              key={phase.id}
              phase={phase}
              tasks={phaseTasks}
              isActive={phase.id === activePhaseId}
              isPast={pastPhaseIds.includes(phase.id)}
              doneById={doneById}
              togglingId={togglingId}
              routineLocked={routineLocked}
              onToggle={handleToggle}
              now={now}
            />
          ))}
        </div>
      </section>

      {/* ── Mindset & Growth panels ── */}
      <div className="info-panels">
        {routineData.atomicHabits?.length > 0 && (
          <InfoSection
            icon="⚙️"
            title="Atomic Habits"
            items={routineData.atomicHabits}
            accent="habits"
          />
        )}
        {routineData.dailyPrinciples?.length > 0 && (
          <InfoSection
            icon="🧭"
            title="Daily Principles"
            items={routineData.dailyPrinciples}
            accent="principles"
          />
        )}
        {routineData.lifeRules?.length > 0 && (
          <InfoSection
            icon="🌿"
            title="Life Rules"
            items={routineData.lifeRules}
            accent="rules"
          />
        )}
        {routineData.yearlyGoals?.length > 0 && (
          <InfoSection
            icon="🏆"
            title="Yearly Goals"
            items={routineData.yearlyGoals}
            accent="goals"
          />
        )}
      </div>
    </>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function App() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="banner banner--loading" role="status" style={{ width: "100%", maxWidth: 320 }}>
          <div className="spinner" aria-hidden="true" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <AuthPage />;

  return (
    <AppShell>
      <RoutineDashboard />
    </AppShell>
  );
}
