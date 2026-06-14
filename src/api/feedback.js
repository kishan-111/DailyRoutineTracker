import { apiRequest } from "./client.js";

/**
 * Fetch LLM-generated feedback for the given date.
 * Returns { motivation: string, improvement: string }
 */
export async function fetchFeedback(date) {
  return apiRequest(`/api/feedback?date=${encodeURIComponent(date)}`);
}
