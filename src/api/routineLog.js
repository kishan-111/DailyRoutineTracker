import { apiRequest } from "./client.js";

export async function syncTodayRoutine({ date, dayOfWeek, tasks }) {
  return apiRequest("/api/routine/today", {
    method: "PUT",
    body: JSON.stringify({ date, day_of_week: dayOfWeek, tasks }),
  });
}

export async function toggleTask({ date, taskId, done }) {
  return apiRequest("/api/routine/today/tasks", {
    method: "PATCH",
    body: JSON.stringify({ date, task_id: taskId, done }),
  });
}

export async function fetchLastSavedRoutine(beforeDate) {
  try {
    return await apiRequest(`/api/routine/last?before=${encodeURIComponent(beforeDate)}`);
  } catch (error) {
    if (error.message.includes("no saved routine")) {
      return null;
    }
    throw error;
  }
}
