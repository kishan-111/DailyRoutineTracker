export function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function taskId(start, end, label) {
  return `${start}|${end}|${label}`;
}

export function scheduleToTasks(schedule) {
  return schedule.map(([start, end, label]) => ({
    id: taskId(start, end, label),
    start,
    end,
    label,
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
