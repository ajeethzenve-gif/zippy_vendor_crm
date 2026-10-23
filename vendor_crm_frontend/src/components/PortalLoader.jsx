import "../styles/PortalLoader.css";

export default function PortalLoader({ label = "Loading your workspace…", compact = false }) {
  return (
    <div className={`portal-loader${compact ? " portal-loader--compact" : ""}`} role="status" aria-live="polite">
      <span className="portal-loader__spinner" aria-hidden="true" />
      <span className="portal-loader__label">{label}</span>
      {!compact && <div className="portal-loader__skeleton" aria-hidden="true">
        <span /><span /><span />
      </div>}
    </div>
  );
}
