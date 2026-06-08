import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import "./AuthPage.css";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isRegister) {
        await register({ email, password, name });
      } else {
        await login({ email, password });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-card__owner">Kishan Kumar</p>
        <h1 className="auth-card__title">Daily Routine Tracker</h1>
        <p className="auth-card__subtitle">
          {isRegister
            ? "Create your account to save and sync your routine."
            : "Sign in with your email to continue."}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tabs__btn${!isRegister ? " auth-tabs__btn--active" : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tabs__btn${isRegister ? " auth-tabs__btn--active" : ""}`}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label className="auth-field">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
          )}

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? "At least 8 characters" : "Your password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 8 : undefined}
              required
            />
          </label>

          {error && <p className="auth-form__error">{error}</p>}

          <button className="auth-form__submit" type="submit" disabled={submitting}>
            {submitting ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
