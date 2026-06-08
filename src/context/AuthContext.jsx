import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearStoredToken,
  fetchMe,
  getStoredToken,
  login as loginRequest,
  register as registerRequest,
  setStoredToken,
} from "../api/auth.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback((authResponse) => {
    setStoredToken(authResponse.token);
    setUser(authResponse.user);
    return authResponse.user;
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  const login = useCallback(
    async (credentials) => {
      const response = await loginRequest(credentials);
      return applyAuth(response);
    },
    [applyAuth]
  );

  const register = useCallback(
    async (details) => {
      const response = await registerRequest(details);
      return applyAuth(response);
    },
    [applyAuth]
  );

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    fetchMe(token)
      .then((profile) => setUser(profile))
      .catch(() => clearStoredToken())
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
