import { useAuth } from "../context/AuthContext.jsx";
import "./UserBar.css";

export default function UserBar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const displayName = user.name?.trim() || user.email;
  // Initials for avatar: up to 2 chars from name words, fallback to email first char
  const initials = user.name
    ? user.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : (user.email?.[0] ?? "?").toUpperCase();

  return (
    <div className="user-bar">
      <div className="user-bar__info">
        <div className="user-bar__avatar" aria-hidden="true">{initials}</div>
        <div className="user-bar__text">
          <span className="user-bar__label">Signed in as</span>
          <span className="user-bar__name">{displayName}</span>
        </div>
      </div>
      <button type="button" className="user-bar__logout" onClick={logout}>
        Sign out
      </button>
    </div>
  );
}
