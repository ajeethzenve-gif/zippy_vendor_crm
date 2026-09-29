import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./styles/SearchBar.css";

// Shared account control retained under the existing import name.
export default function SearchBar() {
  const { currentUser } = useAuth();
  return (
    <div className="search-user-wrapper">
      <Link to="/login" className="home-user" title="Sign in or switch account">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c.8-3.5 3.2-5.5 7-5.5s6.2 2 7 5.5" />
        </svg>
        <span className="home-user-name">{currentUser ? currentUser.user : "Sign In"}</span>
        <span className="home-admin">{currentUser ? currentUser.shortRole : "Role"}</span>
      </Link>
    </div>
  );
}
