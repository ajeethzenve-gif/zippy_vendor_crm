import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth, ROLES } from "../context/AuthContext";
import { layers } from "../data/layers";

function LockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function ProtectedRoute({ layer, children, loginPath = "/login" }) {
  const { currentUser, hasAccess } = useAuth();

  if (!currentUser) return <Navigate to={loginPath} replace />;
  const isAuthorized = layer == null || hasAccess(layer);

  if (isAuthorized) {
    return children;
  }

  // Find layer info
  const layerInfo = layers.find((l) => l.n === layer) || { n: layer, name: `Layer ${layer}`, group: "Operations" };

  // Find which roles have clearance for this layer
  const authorizedRoles = ROLES.filter((r) => r.clearance.includes(layer));

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--paper, #f8f6f1)",
      color: "var(--ink, #14181f)",
      fontFamily: "var(--sans, 'Inter', sans-serif)",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* ACCESS RESTRICTED CARD CONTAINER */}
      <main style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}>
        <div style={{
          maxWidth: "540px",
          width: "100%",
          background: "var(--panel, #fffdfa)",
          border: "1px solid #e2ddd5",
          borderRadius: "12px",
          padding: "36px 32px",
          boxShadow: "0 10px 28px rgba(48, 37, 28, 0.06)",
          textAlign: "center",
        }}>
          <div style={{
            width: "52px",
            height: "52px",
            margin: "0 auto 20px",
            borderRadius: "50%",
            background: "#f7ebe8",
            color: "#a34c3f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <LockIcon />
          </div>

          <span style={{
            fontSize: "11px",
            fontWeight: "600",
            letterSpacing: "1.8px",
            textTransform: "uppercase",
            color: "#a34c3f",
            display: "block",
            marginBottom: "8px",
          }}>
            Access Clearance Insufficient
          </span>

          <h1 style={{
            fontFamily: "var(--serif, Georgia, serif)",
            fontSize: "24px",
            fontWeight: "500",
            margin: "0 0 10px",
            color: "#120e0a",
          }}>
            {layerInfo.n} {layerInfo.name}
          </h1>

          <p style={{
            fontSize: "14px",
            color: "#6c6258",
            lineHeight: "1.55",
            margin: "0 0 24px",
          }}>
            You are currently signed in as <strong>{currentUser?.user}</strong> (<em>{currentUser?.name}</em>). This operational layer is partitioned and requires clearance.
          </p>

          <div style={{
            background: "#fbf9f4",
            border: "1px solid #e8e2d8",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "28px",
            textAlign: "left",
          }}>
            <span style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "1.2px", textTransform: "uppercase", color: "#7a6f64", display: "block", marginBottom: "8px" }}>
              Authorized Designations:
            </span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {authorizedRoles.map((r) => (
                <span key={r.id} style={{
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: "600",
                  background: "#ece5d8",
                  color: "#3a2d1f",
                }}>
                  {r.shortRole}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Link
              to="/login"
              style={{
                height: "44px",
                borderRadius: "6px",
                background: "#251b14",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                fontSize: "13.5px",
                textDecoration: "none",
              }}
            >
              Switch to an Authorized Persona →
            </Link>

            <Link
              to={currentUser?.landingPath || "/"}
              style={{
                height: "42px",
                borderRadius: "6px",
                border: "1px solid #ded8cf",
                background: "#fffdfa",
                color: "#352b22",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "500",
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              Return to My Authorized Workspace ({currentUser?.shortRole})
            </Link>

            <Link
              to="/"
              style={{
                fontSize: "12.5px",
                color: "#786d63",
                textDecoration: "none",
                marginTop: "4px",
              }}
            >
              ← Back to All Layers Overview
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
