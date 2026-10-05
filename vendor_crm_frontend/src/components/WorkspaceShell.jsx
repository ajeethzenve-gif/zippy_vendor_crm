import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { layers } from "../data/layers";
import { useAuth } from "../context/AuthContext";
import zippyLogo from "../assest/logo/zippy_logo.jpeg";
import "../styles/Workspace.css";
import Swal from "sweetalert2";
import { getDesignerAccountDetails } from "../services/api";

export default function WorkspaceShell({ children }) {
  const { currentUser, hasAccess, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const standalone = !currentUser || pathname === "/login" || pathname === "/vendor-login" || pathname === "/register";
  const visibleLayers = layers.filter(layer => hasAccess(layer.n));

  const handleLogout = () => {
    const loginPath = currentUser?.id === "designer" ? "/vendor-login" : "/login";
    logout();
    navigate(loginPath);
  };

  const handleProfileClick = (e) => {
    e.preventDefault();
    if (currentUser?.id === "designer") {
      navigate("/vendor-dashboard");
    } else {
      navigate("/");
    }
  };

  return <div className={`crm-theme ${standalone ? "crm-standalone" : "crm-workspace"}`}>
    {!standalone && <>
      <div className="workspace-mobile-bar">
        <Link to="/" className="workspace-mobile-brand" aria-label="Zippy Vendor CRM">
          <img src={zippyLogo} alt="Zippy Logo" className="workspace-mobile-logo" />
          <div className="workspace-mobile-brand-copy">
            <span className="workspace-mobile-title">Vendor CRM</span>
          </div>
        </Link>
        <button type="button" className="workspace-mobile-menu-btn" aria-expanded={expanded} aria-controls="workspace-navigation" onClick={() => setExpanded(!expanded)}>
          {expanded ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          )}
        </button>
      </div>
      <aside className={`workspace-sidebar ${expanded ? "is-expanded" : ""}`}>
        <div className="workspace-brand">
          <Link to="/" className="workspace-brand-link" aria-label="Zippy Vendor CRM">
            <img src={zippyLogo} alt="Zippy Logo" className="workspace-brand-logo" />
            <div className="workspace-brand-copy">
              <span className="workspace-brand-title">Vendor CRM</span>
              <span className="workspace-brand-subtitle">Connect · Collaborate · Grow</span>
            </div>
          </Link>
        </div>
        <nav id="workspace-navigation" aria-label="Workspace navigation">
          <NavLink to={currentUser?.id === "designer" ? "/vendor-dashboard" : "/"} end onClick={() => setExpanded(false)}><span className="workspace-nav-icon">◫</span><span>{currentUser?.shortRole || "Workspace"} dashboard</span></NavLink>
          {visibleLayers.map((layer, index) => {
            const displayNum = currentUser?.id === "designer" ? String(index + 1).padStart(2, '0') : layer.n;
            return <NavLink key={layer.n} to={layer.path} onClick={() => setExpanded(false)}><span className="workspace-nav-icon">{displayNum}</span><span>{layer.name}</span></NavLink>;
          })}
        </nav>
        <div className="workspace-mobile-icons" style={{ gap: "10px", padding: "10px 6px" }}>
          <button onClick={() => { navigate(currentUser?.id === "designer" ? "/vendor-dashboard?view=media" : "/?view=media"); setExpanded(false); }} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }} aria-label="Media">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          </button>
          <button onClick={() => { navigate(currentUser?.id === "designer" ? "/vendor-dashboard?view=profile" : "/?view=profile"); setExpanded(false); }} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }} aria-label="Profile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </button>
          <button onClick={() => { navigate(currentUser?.id === "designer" ? "/vendor-dashboard?view=notifications" : "/?view=notifications"); setExpanded(false); }} style={{ padding: "8px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: 1, position: "relative" }} aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            <span style={{ position: "absolute", top: "-4px", right: "-4px", background: "#dc2626", color: "white", fontSize: "10px", fontWeight: "bold", padding: "1px 5px", borderRadius: "10px" }}>1</span>
          </button>
        </div>
        <div className="workspace-account" onClick={handleProfileClick} style={{ cursor: "pointer" }}><span className="workspace-avatar">{(currentUser?.user || "Z").charAt(0).toUpperCase()}</span><div><strong>{currentUser?.user || "Your workspace"}</strong><small>{currentUser?.shortRole || "Sign in to access your layers"}</small></div></div>
        {currentUser ? <button className="workspace-signout" onClick={handleLogout}>Sign out</button> : <Link className="workspace-signout" to="/login">Sign in →</Link>}
      </aside>
    </>}
    <div className="workspace-content">{children}</div>
  </div>;
}
