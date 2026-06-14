export function toMin(t) {
  // Handle "24:00" as end-of-day
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Build today's schedule as an array of task objects:
 * { start, end, title, description, tags, priority }
 *
 * @param {number} dayOfWeek – 0 (Sun) … 6 (Sat)
 * @param {object} data      – parsed routines.json
 */
export function buildSchedule(dayOfWeek, data) {
  const {
    weekdayRoutine,
    learning,
    weekendRoutine,
    weekendExtras,
    weekendExtrasInsertIndex,
  } = data;

  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][dayOfWeek];
    const learnInfo = learning?.[dayName];

    return weekdayRoutine.map((item) => {
      // Replace the generic "Structured Learning" slot with today's specific topic
      if (item.title === "Structured Learning" && learnInfo) {
        return {
          ...item,
          title: learnInfo.title,
          description: learnInfo.description,
        };
      }
      return item;
    });
  }

  // Weekend — merge base + day-specific extras
  const dayName = dayOfWeek === 0 ? "Sunday" : "Saturday";
  const base = [...weekendRoutine];
  const extras = weekendExtras?.[dayName] ?? [];

  const insertAt = weekendExtrasInsertIndex ?? base.length;
  base.splice(insertAt, 0, ...extras);

  return base;
}

/** Returns true if the current time falls within this task's window. */
export function isSlotActive(item, now = new Date()) {
  const curMin = now.getHours() * 60 + now.getMinutes();
  return curMin >= toMin(item.start) && curMin < toMin(item.end);
}

/** Returns the task object currently in progress, or null. */
export function getCurrentSlot(schedule, now = new Date()) {
  const curMin = now.getHours() * 60 + now.getMinutes();
  for (const item of schedule) {
    if (curMin >= toMin(item.start) && curMin < toMin(item.end)) {
      return item;
    }
  }
  return null;
}

/** Returns the next upcoming task object, or null if the day is done. */
export function getNextSlot(schedule, now = new Date()) {
  const curMin = now.getHours() * 60 + now.getMinutes();
  for (const item of schedule) {
    if (curMin < toMin(item.start)) {
      return item;
    }
  }
  return null;
}

/** Convenience: returns the title of the current task or a fallback string. */
export function getCurrentTask(schedule, now = new Date()) {
  const slot = getCurrentSlot(schedule, now);
  return slot ? slot.title : "No scheduled task right now";
}
