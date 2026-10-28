import { useEffect, useState, useMemo, useCallback } from "react";
import { workspaceRequest } from "../services/vendorWorkspaces";
import { isCompanyGst } from "../utils/gstUtils";
import "../styles/VendorKYC.css";

function Icon({ name, width = 16, height = 16, style = {}, className = "", ...props }) {
  const mergedProps = {
    width,
    height,
    className,
    style: { width: `${width}px`, height: `${height}px`, flexShrink: 0, ...style },
    ...props,
  };
  const icons = {
    shield: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    shieldCheck: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    check: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    ),
    clock: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    send: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
    refresh: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
    download: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    search: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    grid: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    list: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
    copy: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    ),
    info: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    chevronDown: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    ),
    sparkles: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
      </svg>
    ),
    close: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    user: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...mergedProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  };
  return icons[name] || null;
}

const label = (value = "PENDING") =>
  value ? value.toLowerCase().replace(/^./, (letter) => letter.toUpperCase()) : "Pending";

function formatDate(dateVal) {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  } catch {
    return "—";
  }
}

function VerificationCard({ vendor, onSaved }) {
  const cleanInitialGst =
    vendor.verification?.gst_number ||
    (isCompanyGst(vendor.gst_number) ? "" : vendor.gst_number) ||
    "";

  const [gst, setGst] = useState(cleanInitialGst);
  const [pan, setPan] = useState(vendor.verification?.pan_number || "");
  const [panName, setPanName] = useState(vendor.verification?.pan_name || "");
  const [panDob, setPanDob] = useState(vendor.verification?.pan_dob || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    const freshGst =
      vendor.verification?.gst_number ||
      (isCompanyGst(vendor.gst_number) ? "" : vendor.gst_number) ||
      "";
    setGst(freshGst);
    setPan(vendor.verification?.pan_number || "");
    setPanName(vendor.verification?.pan_name || "");
    setPanDob(vendor.verification?.pan_dob || "");
  }, [
    vendor.gst_number,
    vendor.verification?.gst_number,
    vendor.verification?.pan_number,
    vendor.verification?.pan_name,
    vendor.verification?.pan_dob,
  ]);

  async function requestDetails() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await workspaceRequest(`${vendor.id}/kyc-request/`, "POST", {});
      onSaved(updated);
      setMessage("KYC request notification sent to the vendor portal. When email delivery is configured, the vendor also receives a secure submission link valid for 48 hours.");
    } catch (err) {
      setError(err.message || "Failed to send KYC request notification.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (busy) return;

    if (!pan.trim()) {
      setError("Please enter the 10-character PAN number before verifying.");
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.trim())) {
      setError("Please enter a valid PAN format (5 letters, 4 digits, 1 letter, e.g. ABCDE1234F).");
      return;
    }
    if (!panName.trim()) {
      setError("Enter the PAN holder legal name before running provider verification.");
      return;
    }
    if (!panDob) {
      setError("Enter the date of birth or date of incorporation before running provider verification.");
      return;
    }
    if (new Date(panDob) > new Date()) {
      setError("Date of birth / incorporation cannot be in the future.");
      return;
    }

    if (gst.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst.trim())) {
      setError("GSTIN must be a valid 15-character identifier (e.g. 29ABCDE1234F1Z5) or left blank if exempt.");
      return;
    }

    if (gst.trim() && gst.trim().length >= 12 && pan.trim().length === 10) {
      if (gst.trim().slice(2, 12).toUpperCase() !== pan.trim().toUpperCase()) {
        setError(`GSTIN characters 3 to 12 must match your PAN (${pan.trim().toUpperCase()}).`);
        return;
      }
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      // Step 1: Save details
      const saved = await workspaceRequest(`${vendor.id}/kyc/`, "PATCH", {
        gst_number: gst.trim().toUpperCase(),
        pan_number: pan.trim().toUpperCase(),
        pan_name: panName.trim(),
        pan_dob: panDob || null,
      });
      onSaved(saved);

      // Step 2: Trigger provider verification
      const result = await workspaceRequest(`${vendor.id}/kyc/`, "POST", {});
      onSaved(result);
      setMessage(`Provider verification completed successfully. Status: ${label(result.kyc_status)}.`);
    } catch (err) {
      setError(err.message || "Verification failed. Check API compliance credentials.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveOnly(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (busy) return;

    if (pan.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.trim())) {
      setError("PAN must be 10 characters formatted as 5 letters, 4 digits, 1 letter.");
      return;
    }
    if (panDob && new Date(panDob) > new Date()) {
      setError("Date of birth / incorporation cannot be in the future.");
      return;
    }
    if (gst.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst.trim())) {
      setError("GSTIN must be a valid 15-character identifier or left blank if exempt.");
      return;
    }
    if (gst.trim() && gst.trim().length >= 12 && pan.trim().length === 10) {
      if (gst.trim().slice(2, 12).toUpperCase() !== pan.trim().toUpperCase()) {
        setError(`GSTIN characters 3 to 12 must match your PAN (${pan.trim().toUpperCase()}).`);
        return;
      }
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const saved = await workspaceRequest(`${vendor.id}/kyc/`, "PATCH", {
        gst_number: gst.trim().toUpperCase(),
        pan_number: pan.trim().toUpperCase(),
        pan_name: panName.trim(),
        pan_dob: panDob || null,
      });
      onSaved(saved);
      setMessage("KYC details saved. You can trigger provider verification when ready.");
    } catch (err) {
      setError(err.message || "Failed to save details.");
    } finally {
      setBusy(false);
    }
  }

  const fallbackCopy = (text) => {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyRef = (ref) => {
    if (!ref) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ref)
        .then(() => {
          setCopiedRef(true);
          setTimeout(() => setCopiedRef(false), 2000);
        })
        .catch(() => fallbackCopy(ref));
    } else {
      fallbackCopy(ref);
    }
  };

  const isVerified = vendor.kyc_status === "VERIFIED";
  const reqStatus = vendor.kyc_request?.status;
  const isSubmitted = reqStatus === "SUBMITTED";
  const isRequested = reqStatus === "REQUESTED" && !vendor.kyc_request?.expired;

  const isPanFormatValid = !pan || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
  const isGstMatching =
    !gst.trim() ||
    !pan.trim() ||
    gst.trim().length < 12 ||
    gst.trim().slice(2, 12).toUpperCase() === pan.trim().toUpperCase();

  const brandInitial = (vendor.brand_name || vendor.vendor_name || "V")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <article className={`vkyc-card ${isSubmitted ? "status-submitted" : ""}`}>
      {/* Card Header */}
      <div className="vkyc-card-header">
        <div className="vkyc-vendor-profile">
          <div className={`vkyc-avatar ${isVerified ? "verified" : ""}`}>
            {vendor.logo ? (
              <img
                src={vendor.logo}
                alt={vendor.brand_name || vendor.vendor_name || "Vendor logo"}
                className="vkyc-avatar-img"
              />
            ) : (
              brandInitial
            )}
          </div>
          <div className="vkyc-vendor-names">
            <h3 className="vkyc-vendor-brand">{vendor.brand_name || vendor.vendor_name}</h3>
            <div className="vkyc-vendor-sub">
              <span>{vendor.vendor_name}</span>
              <span className="vkyc-stage-pill">{vendor.stage}</span>
            </div>
          </div>
        </div>

        <span className={`vkyc-status-pill ${vendor.kyc_status.toLowerCase()}`}>
          {isVerified ? <Icon name="shieldCheck" /> : <Icon name="clock" />}
          <span>{label(vendor.kyc_status)}</span>
        </span>
      </div>

      {/* Workflow Notification Banner */}
      <div
        className={`vkyc-flow-banner ${
          isSubmitted
            ? "submitted"
            : isRequested
            ? "requested"
            : isVerified
            ? "verified"
            : "uninitiated"
        }`}
      >
        <div className="vkyc-flow-text">
          {isSubmitted ? (
            <>
              <strong>
                <Icon name="sparkles" />
                <span>Vendor Details Submitted</span>
              </strong>
              <span>
                Received {formatDate(vendor.kyc_request?.submitted_at)}. Ready for compliance verification.
              </span>
            </>
          ) : isRequested ? (
            <>
              <strong>
                <Icon name="clock" />
                <span>Awaiting Vendor Input</span>
              </strong>
              <span>
                KYC notification sent {formatDate(vendor.kyc_request?.requested_at)}.
              </span>
            </>
          ) : isVerified ? (
            <>
              <strong>
                <Icon name="check" />
                <span>Compliant & Approved</span>
              </strong>
              <span>Statutory KYC completed under Section 194-O. Payouts and orders enabled.</span>
            </>
          ) : (
            <>
              <strong>
                <Icon name="info" />
                <span>KYC Not Yet Dispatched</span>
              </strong>
              <span>Request PAN details directly into the vendor portal.</span>
            </>
          )}
        </div>

        <button
          type="button"
          className="vkyc-flow-btn"
          disabled={busy || isRequested}
          onClick={requestDetails}
          title={isRequested ? "Notification already pending in vendor portal" : "Send or re-send notification"}
        >
          <Icon name="send" />
          <span>
            {isRequested
              ? "Notification Sent"
              : isSubmitted
              ? "Request Updated PAN"
              : "Send KYC Request"}
          </span>
        </button>
      </div>

      {/* Form Fields Grid */}
      <form className="vkyc-form" onSubmit={handleVerify}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="vkyc-form-grid">
            {/* PAN Field */}
            <div className="vkyc-field">
              <div className="vkyc-field-header">
                <label className="vkyc-label" htmlFor={`pan-${vendor.id}`}>
                  PAN Number
                </label>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span className="vkyc-char-count">{pan.length}/10</span>
                  {pan.length === 10 && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan) && (
                    <span className="vkyc-valid-check" title="Valid PAN format">
                      <Icon name="check" /> Valid
                    </span>
                  )}
                  <span className="vkyc-tag req">Required</span>
                  {vendor.verification?.pan_status && (
                    <span className={`vkyc-provider-badge ${vendor.verification.pan_status.toLowerCase()}`}>
                      {label(vendor.verification.pan_status)}
                    </span>
                  )}
                </div>
              </div>
              <div className={`vkyc-input-wrap ${vendor.verification?.pan_status === "VERIFIED" ? "verified" : ""}`}>
                <input
                  id={`pan-${vendor.id}`}
                  className="vkyc-input mono"
                  maxLength={10}
                  required
                  spellCheck={false}
                  placeholder="ABCDE1234F"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                />
              </div>
              {!isPanFormatValid && (
                <div className="vkyc-inline-warn">
                  <Icon name="alert" />
                  <span>Format: 5 letters, 4 digits, 1 letter</span>
                </div>
              )}
            </div>

            {/* GSTIN Field */}
            <div className="vkyc-field">
              <div className="vkyc-field-header">
                <label className="vkyc-label" htmlFor={`gst-${vendor.id}`}>
                  GSTIN
                </label>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span className="vkyc-char-count">{gst.length}/15</span>
                  {gst.length === 15 && isGstMatching && (
                    <span className="vkyc-valid-check" title="Matches PAN">
                      <Icon name="check" /> Linked
                    </span>
                  )}
                  <span className="vkyc-tag opt">Optional</span>
                  {vendor.verification?.gst_status && gst.trim() && (
                    <span className={`vkyc-provider-badge ${vendor.verification.gst_status.toLowerCase()}`}>
                      {label(vendor.verification.gst_status)}
                    </span>
                  )}
                </div>
              </div>
              <div className={`vkyc-input-wrap ${vendor.verification?.gst_status === "VERIFIED" ? "verified" : ""}`}>
                <input
                  id={`gst-${vendor.id}`}
                  className="vkyc-input mono"
                  maxLength={15}
                  spellCheck={false}
                  placeholder="15-digit GSTIN (optional)"
                  value={gst}
                  onChange={(e) => setGst(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15))}
                />
              </div>
              {!isGstMatching && (
                <div className="vkyc-inline-warn">
                  <Icon name="alert" />
                  <span>Chars 3-12 ({gst.slice(2, 12)}) do not match PAN</span>
                </div>
              )}
            </div>

            {/* Legal Name on PAN */}
            <div className="vkyc-field">
              <div className="vkyc-field-header">
                <label className="vkyc-label" htmlFor={`name-${vendor.id}`}>
                  Name as Printed on PAN
                </label>
                <span className="vkyc-tag req">Required</span>
              </div>
              <div className="vkyc-input-wrap">
                <input
                  id={`name-${vendor.id}`}
                  className="vkyc-input"
                  maxLength={255}
                  placeholder="Full Legal Name"
                  value={panName}
                  onChange={(e) => setPanName(e.target.value)}
                />
              </div>
            </div>

            {/* Date of Birth / Incorporation */}
            <div className="vkyc-field">
              <div className="vkyc-field-header">
                <label className="vkyc-label" htmlFor={`dob-${vendor.id}`}>
                  Date of Birth / Inc.
                </label>
                <span className="vkyc-tag req">Required</span>
              </div>
              <div className="vkyc-input-wrap">
                <input
                  id={`dob-${vendor.id}`}
                  type="date"
                  className="vkyc-input"
                  max={new Date().toISOString().split("T")[0]}
                  value={panDob}
                  onChange={(e) => setPanDob(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="vkyc-actions-row">
            <button
              type="submit"
              className="vkyc-btn-verify"
              disabled={busy}
              title="Runs official NSDL / ApiTxt provider verification"
            >
              <Icon name="shieldCheck" />
              <span>{busy ? "Processing Provider Check…" : "Verify with Provider"}</span>
            </button>

            <button
              type="button"
              className="vkyc-btn-save"
              disabled={busy}
              onClick={handleSaveOnly}
              title="Saves details without triggering paid API call"
            >
              <span>Save Details</span>
            </button>
          </div>
        </fieldset>
      </form>

      {/* Audit Trail Metadata */}
      {vendor.verification?.checked_at && (
        <div className="vkyc-audit-meta">
          <span>Checked: {formatDate(vendor.verification.checked_at)}</span>
          {vendor.verification.provider_reference && (
            <button
              type="button"
              className="vkyc-ref-copy"
              onClick={() => handleCopyRef(vendor.verification.provider_reference)}
              title="Click to copy provider reference"
            >
              <span>Ref: {vendor.verification.provider_reference.slice(0, 16)}…</span>
              <Icon name={copiedRef ? "check" : "copy"} />
            </button>
          )}
        </div>
      )}

      {/* Inline Feedback Alerts */}
      {error && (
        <div className="vkyc-msg-alert error" role="alert">
          <Icon name="alert" />
          <span>{error}</span>
          <button type="button" className="vkyc-alert-dismiss" onClick={() => setError("")} aria-label="Dismiss error" title="Dismiss error">
            <Icon name="close" />
          </button>
        </div>
      )}
      {message && (
        <div className="vkyc-msg-alert success" role="status">
          <Icon name="check" />
          <span>{message}</span>
          <button type="button" className="vkyc-alert-dismiss" onClick={() => setMessage("")} aria-label="Dismiss message" title="Dismiss message">
            <Icon name="close" />
          </button>
        </div>
      )}
    </article>
  );
}

export default function VendorKYC() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState("ALL");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [inspectVendor, setInspectVendor] = useState(null);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    setError("");
    try {
      const data = await workspaceRequest("kyc/");
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load vendor compliance list.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Modal Escape key & body scroll lock handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setInspectVendor(null);
      }
    };
    if (inspectVendor) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = origOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [inspectVendor]);

  // Compute live queue counts
  const stats = useMemo(() => {
    const total = vendors.length;
    const verified = vendors.filter((v) => v.kyc_status === "VERIFIED").length;
    const submitted = vendors.filter(
      (v) => v.kyc_request?.status === "SUBMITTED" && v.kyc_status !== "VERIFIED"
    ).length;
    const requested = vendors.filter(
      (v) => v.kyc_request?.status === "REQUESTED" && v.kyc_status !== "VERIFIED"
    ).length;
    const rejected = vendors.filter((v) => v.kyc_status === "REJECTED").length;
    const uninitiated = vendors.filter(
      (v) => !v.kyc_request?.status && v.kyc_status !== "VERIFIED" && v.kyc_status !== "REJECTED"
    ).length;

    return { total, verified, submitted, requested, rejected, uninitiated };
  }, [vendors]);

  // Filtered List
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (activeTab === "submitted" && (v.kyc_request?.status !== "SUBMITTED" || v.kyc_status === "VERIFIED")) {
        return false;
      }
      if (activeTab === "requested" && (v.kyc_request?.status !== "REQUESTED" || v.kyc_status === "VERIFIED")) {
        return false;
      }
      if (activeTab === "verified" && v.kyc_status !== "VERIFIED") {
        return false;
      }
      if (activeTab === "rejected" && v.kyc_status !== "REJECTED") {
        return false;
      }
      if (activeTab === "uninitiated" && (v.kyc_request?.status || v.kyc_status === "VERIFIED" || v.kyc_status === "REJECTED")) {
        return false;
      }

      if (selectedStage !== "ALL" && v.stage !== selectedStage) {
        return false;
      }

      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const vendorName = (v.vendor_name || "").toLowerCase();
        const brandName = (v.brand_name || "").toLowerCase();
        const pan = (v.verification?.pan_number || "").toLowerCase();
        const panName = (v.verification?.pan_name || "").toLowerCase();
        const gst = (v.gst_number || v.verification?.gst_number || "").toLowerCase();
        const ref = (v.verification?.provider_reference || "").toLowerCase();
        const idStr = String(v.id);
        return (
          vendorName.includes(query) ||
          brandName.includes(query) ||
          pan.includes(query) ||
          panName.includes(query) ||
          gst.includes(query) ||
          ref.includes(query) ||
          idStr.includes(query)
        );
      }

      return true;
    });
  }, [vendors, activeTab, selectedStage, search]);

  const handleVendorSaved = (updated) => {
    setVendors((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    if (inspectVendor?.id === updated.id) {
      setInspectVendor(updated);
    }
  };

  const handleExportCSV = () => {
    if (!filteredVendors.length) return;
    const headers = [
      "Seller ID",
      "Brand Name",
      "Legal Name",
      "Stage",
      "KYC Status",
      "PAN Number",
      "PAN Holder Name",
      "DOB / Inc",
      "GSTIN",
      "Request Status",
      "Provider Reference",
      "Last Verified At",
    ];

    const rows = filteredVendors.map((v) => [
      v.id,
      `"${(v.brand_name || "").replace(/"/g, '""')}"`,
      `"${(v.vendor_name || "").replace(/"/g, '""')}"`,
      v.stage,
      v.kyc_status,
      v.verification?.pan_number || "",
      `"${(v.verification?.pan_name || "").replace(/"/g, '""')}"`,
      v.verification?.pan_dob || "",
      v.verification?.gst_number || (v.gst_number === "29AABCZ1234F1Z8" ? "" : v.gst_number) || "",
      v.kyc_request?.status || "UNINITIATED",
      v.verification?.provider_reference || "",
      v.verification?.checked_at ? new Date(v.verification.checked_at).toISOString() : "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `zenve_compliance_kyc_report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const stages = useMemo(() => {
    const set = new Set(vendors.map((v) => v.stage).filter(Boolean));
    return ["ALL", ...Array.from(set)];
  }, [vendors]);

  return (
    <main className="vkyc-page">
      {/* Page Header */}
      <header className="vkyc-header">
        <div className="vkyc-header-copy">
          <div className="vkyc-layer-badge">
            <Icon name="shield" />
            <span>Layer 15 · Regulatory Compliance</span>
          </div>
          <h1 className="vkyc-title">Vendor KYC Verification Hub</h1>
          <p className="vkyc-subtitle">
            Validate merchant PAN credentials, legal names, DOB, and optional GSTIN against official Income Tax databases (NSDL / ApiTxt) for Section 194-O statutory compliance.
          </p>
        </div>

        <div className="vkyc-header-actions">
          <button
            type="button"
            className="vkyc-btn-secondary"
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            title="Toggle statutory verification guidelines"
          >
            <Icon name="info" />
            <span>{isGuideOpen ? "Hide Specs" : "Compliance Specs"}</span>
          </button>

          <button
            type="button"
            className="vkyc-btn-export"
            onClick={handleExportCSV}
            title="Download active compliance list as CSV"
            disabled={!filteredVendors.length}
          >
            <Icon name="download" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            className={`vkyc-btn-refresh ${isRefreshing ? "is-spinning" : ""}`}
            disabled={loading || isRefreshing}
            onClick={loadData}
            title="Refresh vendor verification status"
          >
            <Icon name="refresh" />
            <span>{isRefreshing ? "Refreshing…" : "Refresh Data"}</span>
          </button>
        </div>
      </header>

      {/* Global Error Banner */}
      {error && vendors.length > 0 && (
        <div className="vkyc-msg-alert error" role="alert">
          <Icon name="alert" />
          <span>{error}</span>
          <button
            type="button"
            className="vkyc-alert-retry-btn"
            onClick={loadData}
            title="Retry connecting to server"
          >
            <Icon name="refresh" />
            <span>Retry Connection</span>
          </button>
          <button
            type="button"
            className="vkyc-alert-dismiss"
            onClick={() => setError("")}
            aria-label="Dismiss error"
            title="Dismiss error"
          >
            <Icon name="close" />
          </button>
        </div>
      )}

      {/* KPI Metrics Grid */}
      <section className="vkyc-stats-grid" aria-label="KYC summary metrics">
        <div
          className={`vkyc-stat-card ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveTab("all"); } }}
          role="button"
          tabIndex={0}
          aria-pressed={activeTab === "all"}
        >
          <div className="vkyc-stat-icon blue">
            <Icon name="user" width={22} height={22} />
          </div>
          <div className="vkyc-stat-body">
            <span className="vkyc-stat-val">{stats.total}</span>
            <span className="vkyc-stat-label">Total Sellers</span>
            <span className="vkyc-stat-sub">Under KYC governance</span>
          </div>
        </div>

        <div
          className={`vkyc-stat-card ${activeTab === "submitted" ? "active" : ""}`}
          onClick={() => setActiveTab("submitted")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveTab("submitted"); } }}
          role="button"
          tabIndex={0}
          aria-pressed={activeTab === "submitted"}
        >
          <div className="vkyc-stat-icon indigo">
            <Icon name="sparkles" width={22} height={22} />
          </div>
          <div className="vkyc-stat-body">
            <span className="vkyc-stat-val" style={{ color: "#4f46e5" }}>
              {stats.submitted}
            </span>
            <span className="vkyc-stat-label">Submitted by Vendor</span>
            <span className="vkyc-stat-sub">Ready for verification check</span>
          </div>
        </div>

        <div
          className={`vkyc-stat-card ${activeTab === "requested" ? "active" : ""}`}
          onClick={() => setActiveTab("requested")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveTab("requested"); } }}
          role="button"
          tabIndex={0}
          aria-pressed={activeTab === "requested"}
        >
          <div className="vkyc-stat-icon amber">
            <Icon name="clock" width={22} height={22} />
          </div>
          <div className="vkyc-stat-body">
            <span className="vkyc-stat-val" style={{ color: "#d97706" }}>
              {stats.requested}
            </span>
            <span className="vkyc-stat-label">Waiting on Vendor</span>
            <span className="vkyc-stat-sub">Notification dispatched</span>
          </div>
        </div>

        <div
          className={`vkyc-stat-card ${activeTab === "verified" ? "active" : ""}`}
          onClick={() => setActiveTab("verified")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveTab("verified"); } }}
          role="button"
          tabIndex={0}
          aria-pressed={activeTab === "verified"}
        >
          <div className="vkyc-stat-icon emerald">
            <Icon name="shieldCheck" width={22} height={22} />
          </div>
          <div className="vkyc-stat-body">
            <span className="vkyc-stat-val" style={{ color: "#059669" }}>
              {stats.verified}
            </span>
            <span className="vkyc-stat-label">Verified & Compliant</span>
            <span className="vkyc-stat-sub">Payouts & orders enabled</span>
          </div>
        </div>

        <div
          className={`vkyc-stat-card ${activeTab === "uninitiated" ? "active" : ""}`}
          onClick={() => setActiveTab("uninitiated")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveTab("uninitiated"); } }}
          role="button"
          tabIndex={0}
          aria-pressed={activeTab === "uninitiated"}
        >
          <div className="vkyc-stat-icon slate">
            <Icon name="send" width={22} height={22} />
          </div>
          <div className="vkyc-stat-body">
            <span className="vkyc-stat-val" style={{ color: "#64748b" }}>
              {stats.uninitiated}
            </span>
            <span className="vkyc-stat-label">Uninitiated</span>
            <span className="vkyc-stat-sub">Needs notification dispatch</span>
          </div>
        </div>

        {stats.rejected > 0 && (
          <div
            className={`vkyc-stat-card ${activeTab === "rejected" ? "active" : ""}`}
            onClick={() => setActiveTab("rejected")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveTab("rejected"); } }}
            role="button"
            tabIndex={0}
            aria-pressed={activeTab === "rejected"}
          >
            <div className="vkyc-stat-icon rose">
              <Icon name="alert" width={22} height={22} />
            </div>
            <div className="vkyc-stat-body">
              <span className="vkyc-stat-val" style={{ color: "#e11d48" }}>
                {stats.rejected}
              </span>
              <span className="vkyc-stat-label">Rejected / Non-Compliant</span>
              <span className="vkyc-stat-sub">Action or re-check required</span>
            </div>
          </div>
        )}
      </section>

      {/* Compliance Guidelines Accordion */}
      <section className="vkyc-guide-card">
        <div
          className="vkyc-guide-header"
          onClick={() => setIsGuideOpen(!isGuideOpen)}
          role="button"
          tabIndex={0}
        >
          <div className="vkyc-guide-title">
            <Icon name="info" />
            <span>Compliance Rules & Provider Verification Guidelines</span>
          </div>
          <div className={`vkyc-guide-toggle ${isGuideOpen ? "is-open" : ""}`}>
            <span>{isGuideOpen ? "Hide Guidelines" : "View Guidelines"}</span>
            <Icon name="chevronDown" />
          </div>
        </div>

        {isGuideOpen && (
          <div className="vkyc-guide-content">
            <div className="vkyc-guide-item">
              <strong>1. Mandatory PAN Verification (Section 194-O)</strong>
              <span>
                Marketplace sellers must have an active PAN registered with the Income Tax Department. The provider verifies exact spelling of legal name and DOB.
              </span>
            </div>
            <div className="vkyc-guide-item">
              <strong>2. Optional GSTIN Registration</strong>
              <span>
                Vendors operating below state turnover thresholds or in composition schemes can complete full KYC verification without a GSTIN. If provided, GSTIN must match PAN.
              </span>
            </div>
            <div className="vkyc-guide-item">
              <strong>3. Provider API Usage & Safeguards</strong>
              <span>
                Clicking &quot;Verify with Provider&quot; executes real-time external API queries. Use &quot;Save Details&quot; to stage manual corrections without consuming API quotas.
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Controls Bar & Filters */}
      <section className="vkyc-controls-wrap">
        <div className="vkyc-tabs-row">
          <div className="vkyc-tabs" role="tablist">
            <button
              type="button"
              className={`vkyc-tab ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              <span>All Sellers</span>
              <span className="vkyc-tab-count">{stats.total}</span>
            </button>

            <button
              type="button"
              className={`vkyc-tab ${activeTab === "submitted" ? "active" : ""}`}
              onClick={() => setActiveTab("submitted")}
            >
              <span>Submitted for Review</span>
              <span className={`vkyc-tab-count ${stats.submitted > 0 ? "urgent" : ""}`}>
                {stats.submitted}
              </span>
            </button>

            <button
              type="button"
              className={`vkyc-tab ${activeTab === "requested" ? "active" : ""}`}
              onClick={() => setActiveTab("requested")}
            >
              <span>Waiting on Vendor</span>
              <span className="vkyc-tab-count">{stats.requested}</span>
            </button>

            <button
              type="button"
              className={`vkyc-tab ${activeTab === "verified" ? "active" : ""}`}
              onClick={() => setActiveTab("verified")}
            >
              <span>Verified & Compliant</span>
              <span className="vkyc-tab-count">{stats.verified}</span>
            </button>

            <button
              type="button"
              className={`vkyc-tab ${activeTab === "uninitiated" ? "active" : ""}`}
              onClick={() => setActiveTab("uninitiated")}
            >
              <span>Uninitiated</span>
              <span className="vkyc-tab-count">{stats.uninitiated}</span>
            </button>

            {stats.rejected > 0 && (
              <button
                type="button"
                className={`vkyc-tab ${activeTab === "rejected" ? "active" : ""}`}
                onClick={() => setActiveTab("rejected")}
              >
                <span>Rejected</span>
                <span className="vkyc-tab-count urgent">{stats.rejected}</span>
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="vkyc-view-toggle">
            <button
              type="button"
              className={`vkyc-view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Cards Grid View"
            >
              <Icon name="grid" />
            </button>
            <button
              type="button"
              className={`vkyc-view-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Compact Table View"
            >
              <Icon name="list" />
            </button>
          </div>
        </div>

        {/* Search & Stage Filter Row */}
        <div className="vkyc-filter-inputs">
          <div className="vkyc-search-wrap">
            <span className="vkyc-search-icon">
              <Icon name="search" />
            </span>
            <input
              type="text"
              className="vkyc-search-input"
              placeholder="Search by vendor, brand, PAN, or GSTIN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
            {search && (
              <button
                type="button"
                className="vkyc-search-clear"
                onClick={() => setSearch("")}
                title="Clear search"
                aria-label="Clear search"
              >
                <Icon name="close" />
              </button>
            )}
          </div>

          <select
            className="vkyc-select"
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            aria-label="Filter by vendor stage"
          >
            {stages.map((stage) => (
              <option key={stage} value={stage}>
                {stage === "ALL" ? "All Stages" : `Stage: ${stage}`}
              </option>
            ))}
          </select>

          <div className="vkyc-filter-summary">
            <span>
              Showing <strong>{filteredVendors.length}</strong> of <strong>{vendors.length}</strong> sellers
            </span>
            {(search || selectedStage !== "ALL" || activeTab !== "all") && (
              <button
                type="button"
                className="vkyc-btn-reset-filters"
                onClick={() => {
                  setSearch("");
                  setSelectedStage("ALL");
                  setActiveTab("all");
                }}
                title="Reset active search and filters"
              >
                <Icon name="close" width={12} height={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      {loading ? (
        <div className="vkyc-empty-state">
          <div className="vkyc-btn-refresh is-spinning" style={{ display: "inline-flex", border: 0, padding: 0 }}>
            <Icon name="refresh" />
          </div>
          <h3 style={{ marginTop: "16px" }}>Loading Vendor Compliance Records…</h3>
          <p>Connecting to secure compliance registry.</p>
        </div>
      ) : error && vendors.length === 0 ? (
        <div className="vkyc-empty-state error-state">
          <div className="vkyc-empty-icon error">
            <Icon name="alert" />
          </div>
          <h3>Failed to Connect to Verification Service</h3>
          <p>{error}</p>
          <button
            type="button"
            className={`vkyc-btn-refresh ${isRefreshing ? "is-spinning" : ""}`}
            onClick={() => {
              setLoading(true);
              loadData();
            }}
            disabled={isRefreshing}
          >
            <Icon name="refresh" />
            <span>{isRefreshing ? "Connecting…" : "Retry Connection"}</span>
          </button>
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="vkyc-empty-state">
          <div className="vkyc-empty-icon">
            <Icon name="search" />
          </div>
          <h3>No Vendors Found</h3>
          <p>No vendor records match your active search and status filter criteria.</p>
          <button
            type="button"
            className="vkyc-btn-refresh"
            onClick={() => {
              setSearch("");
              setSelectedStage("ALL");
              setActiveTab("all");
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* Cards Grid View */
        <div className="vkyc-grid">
          {filteredVendors.map((vendor) => (
            <VerificationCard
              key={vendor.id}
              vendor={vendor}
              onSaved={handleVendorSaved}
            />
          ))}
        </div>
      ) : (
        /* High-Density Table View */
        <div className="vkyc-table-container">
          <table className="vkyc-table">
            <thead>
              <tr>
                <th>Seller & Brand</th>
                <th>Stage</th>
                <th>KYC Status</th>
                <th>Workflow Status</th>
                <th>PAN Details</th>
                <th>GSTIN</th>
                <th>Audit / Ref</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((vendor) => {
                const isV = vendor.kyc_status === "VERIFIED";
                const isSub = vendor.kyc_request?.status === "SUBMITTED";
                const isReq = vendor.kyc_request?.status === "REQUESTED";

                return (
                  <tr key={vendor.id}>
                    <td>
                      <div className="vkyc-table-vendor">
                        <div
                          className={`vkyc-avatar ${isV ? "verified" : ""}`}
                          style={{ width: "36px", height: "36px", fontSize: "14px" }}
                        >
                          {vendor.logo ? (
                            <img
                              src={vendor.logo}
                              alt={vendor.brand_name || vendor.vendor_name || "Vendor logo"}
                              className="vkyc-avatar-img"
                            />
                          ) : (
                            (vendor.brand_name || vendor.vendor_name || "V").charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <strong>{vendor.brand_name || vendor.vendor_name}</strong>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>{vendor.vendor_name}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="vkyc-stage-pill">{vendor.stage}</span>
                    </td>

                    <td>
                      <span className={`vkyc-status-pill ${vendor.kyc_status.toLowerCase()}`}>
                        {isV ? <Icon name="shieldCheck" /> : <Icon name="clock" />}
                        <span>{label(vendor.kyc_status)}</span>
                      </span>
                    </td>

                    <td>
                      {isSub ? (
                        <span style={{ color: "#1d4ed8", fontWeight: 700, fontSize: "12px" }}>
                          ⚡ Submitted by Vendor
                        </span>
                      ) : isReq ? (
                        <span style={{ color: "#d97706", fontWeight: 600, fontSize: "12px" }}>
                          ⏳ Awaiting Submission
                        </span>
                      ) : isV ? (
                        <span style={{ color: "#059669", fontWeight: 650, fontSize: "12px" }}>
                          ✓ Approved
                        </span>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: "12px" }}>Not Requested</span>
                      )}
                    </td>

                    <td>
                      <div style={{ fontFamily: "ui-monospace, monospace", fontWeight: 600, fontSize: "12.5px" }}>
                        {vendor.verification?.pan_number || "—"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        {vendor.verification?.pan_name || "No name set"}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "12.5px", color: vendor.verification?.gst_number ? "#0f172a" : "#94a3b8" }}>
                        {vendor.verification?.gst_number || (isCompanyGst(vendor.gst_number) ? "Exempt / None" : vendor.gst_number || "Exempt")}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        {vendor.verification?.checked_at ? formatDate(vendor.verification.checked_at) : "Not checked"}
                      </div>
                      {vendor.verification?.provider_reference && (
                        <span style={{ fontSize: "10.5px", color: "#0284c7", fontFamily: "ui-monospace, monospace" }}>
                          Ref: {vendor.verification.provider_reference.slice(0, 14)}…
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div className="vkyc-table-actions" style={{ justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="vkyc-table-btn primary"
                          onClick={() => setInspectVendor(vendor)}
                          title="Open full verification review card"
                        >
                          <Icon name="shieldCheck" />
                          <span>Review & Verify</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspect & Review Modal (From Table View) */}
      {inspectVendor && (
        <div
          className="vkyc-modal-overlay"
          onClick={() => setInspectVendor(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="vkyc-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="vkyc-modal-close-round"
              onClick={() => setInspectVendor(null)}
              aria-label="Close review modal (Esc)"
              title="Close modal (Esc)"
            >
              <Icon name="close" />
            </button>
            <VerificationCard
              vendor={inspectVendor}
              onSaved={handleVendorSaved}
            />
          </div>
        </div>
      )}
    </main>
  );
}
