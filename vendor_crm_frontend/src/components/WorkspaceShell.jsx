import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { layers } from "../data/layers";
import { useAuth } from "../context/AuthContext";
import zippyLogo from "../assest/logo/zippy_logo.jpeg";
import "../styles/Workspace.css";

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

  return <div className={`crm-theme ${standalone ? "crm-standalone" : "crm-workspace"}`}>
    {!standalone && <>
      <div className="workspace-mobile-bar">
        <Link to="/" className="workspace-mobile-brand" aria-label="Zippy Vendor CRM">
          <img src={zippyLogo} alt="Zippy Logo" className="workspace-mobile-logo" />
          <div className="workspace-mobile-brand-copy">
            <span className="workspace-mobile-title">Vendor CRM</span>
          </div>
        </Link>
        <button type="button" aria-expanded={expanded} aria-controls="workspace-navigation" onClick={() => setExpanded(!expanded)}>{expanded ? "Close" : "Menu"}</button>
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
          <NavLink to="/" end onClick={() => setExpanded(false)}><span className="workspace-nav-icon">◫</span><span>Overview</span></NavLink>
          {visibleLayers.map(layer => <NavLink key={layer.n} to={layer.path} onClick={() => setExpanded(false)}><span className="workspace-nav-icon">{layer.n}</span><span>{layer.name}</span></NavLink>)}
        </nav>
        <div className="workspace-account"><span className="workspace-avatar">{(currentUser?.user || "Z").charAt(0).toUpperCase()}</span><div><strong>{currentUser?.user || "Your workspace"}</strong><small>{currentUser?.shortRole || "Sign in to access your layers"}</small></div></div>
        {currentUser ? <button className="workspace-signout" onClick={handleLogout}>Sign out</button> : <Link className="workspace-signout" to="/login">Sign in →</Link>}
      </aside>
    </>}
    <div className="workspace-content">{children}</div>
  </div>;
}
