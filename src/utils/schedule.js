export function toMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function buildSchedule(dayOfWeek, data) {
  const { weekdayRoutine, learning, weekendBase, weekendExtras, weekendExtrasInsertIndex } =
    data;

  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    const sched = weekdayRoutine.map((x) => x.slice());
    const learn = sched.find((x) => x[2] === "Learning Block");
    if (learn) learn[2] = learning[String(dayOfWeek)];
    return sched;
  }

  const sched = weekendBase.map((x) => x.slice());
  const extras = weekendExtras[String(dayOfWeek)] ?? [];

  extras.forEach((item, i) => {
    sched.splice(weekendExtrasInsertIndex + i, 0, item);
  });

  return sched;
}

export function isSlotActive(item, now = new Date()) {
  const curMin = now.getHours() * 60 + now.getMinutes();
  return curMin >= toMin(item[0]) && curMin < toMin(item[1]);
}

export function getCurrentSlot(schedule, now = new Date()) {
  const curMin = now.getHours() * 60 + now.getMinutes();
  for (const item of schedule) {
    if (curMin >= toMin(item[0]) && curMin < toMin(item[1])) {
      return { start: item[0], end: item[1], label: item[2] };
    }
  }
  return null;
}

export function getNextSlot(schedule, now = new Date()) {
  const curMin = now.getHours() * 60 + now.getMinutes();
  for (const item of schedule) {
    if (curMin < toMin(item[0])) {
      return { start: item[0], end: item[1], label: item[2] };
    }
  }
  return null;
}

export function getCurrentTask(schedule, now = new Date()) {
  const slot = getCurrentSlot(schedule, now);
  return slot ? slot.label : "No scheduled task right now";
}
