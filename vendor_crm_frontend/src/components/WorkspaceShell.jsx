import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { layers } from "../data/layers";
import { useAuth } from "../context/AuthContext";
import "../styles/Workspace.css";

export default function WorkspaceShell({ children }) {
  const { currentUser, hasAccess, logout } = useAuth();
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState(false);
  const standalone = pathname === "/login" || pathname === "/register";
  const visibleLayers = layers.filter(layer => hasAccess(layer.n));
  return <div className={`crm-theme ${standalone ? "crm-standalone" : "crm-workspace"}`}>
    {!standalone && <>
      <div className="workspace-mobile-bar"><Link to="/" className="workspace-wordmark">zippy<span>WORKSPACE</span></Link><button type="button" aria-expanded={expanded} aria-controls="workspace-navigation" onClick={() => setExpanded(!expanded)}>{expanded ? "Close menu" : "Menu"}</button></div>
      <aside className={`workspace-sidebar ${expanded ? "is-expanded" : ""}`}>
        <div className="workspace-nav-label">WORKSPACE</div>
        <nav id="workspace-navigation" aria-label="Workspace navigation">
          <NavLink to="/" end onClick={() => setExpanded(false)}><span className="workspace-nav-icon">◫</span><span>Overview</span></NavLink>
          {visibleLayers.map(layer => <NavLink key={layer.n} to={layer.path} onClick={() => setExpanded(false)}><span className="workspace-nav-icon">{layer.n}</span><span>{layer.name}</span></NavLink>)}
        </nav>
        <div className="workspace-account"><span className="workspace-avatar">{(currentUser?.user || "Z").charAt(0).toUpperCase()}</span><div><strong>{currentUser?.user || "Your workspace"}</strong><small>{currentUser?.shortRole || "Sign in to access your layers"}</small></div></div>
        {currentUser ? <button className="workspace-signout" onClick={logout}>Sign out</button> : <Link className="workspace-signout" to="/login">Sign in →</Link>}
      </aside>
    </>}
    <div className="workspace-content">{children}</div>
  </div>;
}
