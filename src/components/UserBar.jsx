import { useAuth } from "../context/AuthContext.jsx";
import "./UserBar.css";

export default function UserBar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const displayName = user.name?.trim() || user.email;

  return (
    <div className="user-bar">
      <div className="user-bar__info">
        <span className="user-bar__label">Signed in as</span>
        <span className="user-bar__name">{displayName}</span>
      </div>
      <button type="button" className="user-bar__logout" onClick={logout}>
        Sign out
      </button>
    </div>
  );
}
