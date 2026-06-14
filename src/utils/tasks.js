export function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Stable ID derived from a task's time window and title. */
export function taskId(start, end, label) {
  return `${start}|${end}|${label}`;
}

/**
 * Convert a schedule array of task objects into the flat task list
 * that the rest of the app (and backend) works with.
 *
 * Input items: { start, end, title, description, tags, priority }
 * Output items: { id, start, end, label, done }
 */
export function scheduleToTasks(schedule) {
  return schedule.map((item) => ({
    id: taskId(item.start, item.end, item.title),
    start: item.start,
    end: item.end,
    label: item.title,
    done: false,
  }));
}

export function countCompleted(tasks) {
  const done = tasks.filter((task) => task.done).length;
  return { done, total: tasks.length };
}

export function formatSavedDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
