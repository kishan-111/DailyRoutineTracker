import { apiRequest } from "./client.js";
import { clearStoredToken, getStoredToken, setStoredToken } from "./token.js";

export { clearStoredToken, getStoredToken, setStoredToken };

export async function register({ email, password, name }) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function login({ email, password }) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe(token) {
  return apiRequest("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
