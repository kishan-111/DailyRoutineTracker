import { toMin } from "./schedule.js";

/**
 * Phase definitions for weekdays and weekends.
 * Each phase has an id, label, icon, and time boundaries (HH:MM).
 */
const WEEKDAY_PHASES = [
  { id: "morning",  label: "Morning Kick-off",  icon: "🌅", from: "07:00", to: "09:30" },
  { id: "office",   label: "Office Hours",       icon: "🏢", from: "09:30", to: "17:30" },
  { id: "wrapup",   label: "End-of-Day Wrap-up", icon: "📝", from: "17:30", to: "18:00" },
  { id: "growth",   label: "Evening Growth",     icon: "📖", from: "18:00", to: "19:15" },
  { id: "home",     label: "Home & Rest",        icon: "🏠", from: "19:15", to: "24:00" },
];

const WEEKEND_PHASES = [
  { id: "morning",   label: "Morning",   icon: "🌅", from: "07:00", to: "12:00" },
  { id: "midday",    label: "Midday",    icon: "🍳", from: "12:00", to: "15:00" },
  { id: "afternoon", label: "Afternoon", icon: "🎯", from: "15:00", to: "20:00" },
  { id: "evening",   label: "Evening",   icon: "🌙", from: "20:00", to: "24:00" },
];

/**
 * Returns the phase definitions for a given day-of-week.
 * @param {number} dayOfWeek – 0 (Sun) … 6 (Sat)
 */
export function getPhaseDefs(dayOfWeek) {
  return dayOfWeek >= 1 && dayOfWeek <= 5 ? WEEKDAY_PHASES : WEEKEND_PHASES;
}

/**
 * Groups a flat schedule array into phases.
 * Tasks that don't fit any phase window fall into a catch-all "other" group.
 *
 * @param {object[]} schedule  – array of task objects { start, end, title, … }
 * @param {number}   dayOfWeek
 * @returns {{ phase: object, tasks: object[] }[]}
 */
export function groupByPhase(schedule, dayOfWeek) {
  const defs = getPhaseDefs(dayOfWeek);

  // Initialise buckets
  const buckets = defs.map((phase) => ({ phase, tasks: [] }));
  const overflow = [];

  for (const task of schedule) {
    const taskStart = toMin(task.start);
    const matched = buckets.find(({ phase }) => {
      const from = toMin(phase.from);
      const to   = toMin(phase.to);
      return taskStart >= from && taskStart < to;
    });
    if (matched) matched.tasks.push(task);
    else overflow.push(task);
  }

  // Drop empty phases but keep order; append overflow if any
  const result = buckets.filter((b) => b.tasks.length > 0);

  if (overflow.length > 0) {
    result.push({
      phase: { id: "other", label: "Other", icon: "✦", from: null, to: null },
      tasks: overflow,
    });
  }

  return result;
}

/**
 * Returns the phase id that contains the current time, or null.
 * @param {number} dayOfWeek
 * @param {Date}   now
 */
export function getActivePhaseId(dayOfWeek, now = new Date()) {
  const curMin = now.getHours() * 60 + now.getMinutes();
  const defs = getPhaseDefs(dayOfWeek);
  const active = defs.find((p) => curMin >= toMin(p.from) && curMin < toMin(p.to));
  return active ? active.id : null;
}

/**
 * Returns the phase id that is "past" — the last phase whose end <= now.
 * Used to decide which phases to auto-collapse.
 */
export function getPastPhaseIds(dayOfWeek, now = new Date()) {
  const curMin = now.getHours() * 60 + now.getMinutes();
  const defs = getPhaseDefs(dayOfWeek);
  return defs
    .filter((p) => toMin(p.to) <= curMin)
    .map((p) => p.id);
}
