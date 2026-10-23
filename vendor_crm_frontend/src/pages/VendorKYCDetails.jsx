import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { workspaceRequest } from "../services/vendorWorkspaces";
import zenveLogo from "../assest/logo/zenve_logo.png";
import "../styles/VendorKYCDetails.css";

function Icon({ name }) {
  const icons = {
    shield: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    check: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    idCard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="9" cy="10" r="2" />
        <line x1="15" y1="8" x2="17" y2="8" />
        <line x1="15" y1="12" x2="17" y2="12" />
        <line x1="7" y1="16" x2="17" y2="16" />
      </svg>
    ),
    user: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    building: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="9" y1="22" x2="9" y2="2" />
        <line x1="8" y1="6" x2="8.01" y2="6" />
        <line x1="16" y1="6" x2="16.01" y2="6" />
        <line x1="16" y1="10" x2="16.01" y2="10" />
        <line x1="16" y1="14" x2="16.01" y2="14" />
        <line x1="16" y1="18" x2="16.01" y2="18" />
      </svg>
    ),
    arrowLeft: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    ),
    arrowRight: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    ),
    alertCircle: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    lock: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  };
  return icons[name] || null;
}

export default function VendorKYCDetails() {
  const { currentUser } = useAuth();
  const vendorId = currentUser?.vendorId;
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ pan_number: "", pan_name: "", pan_dob: "", gst_number: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!vendorId) {
      setLoading(false);
      return;
    }
    let active = true;
    workspaceRequest(`${vendorId}/kyc-submission/`)
      .then((result) => {
        if (!active) return;
        setData(result);
        const savedGst = result.verification?.gst_number || "";
        const isMasterOrDummyGst = result.gst_number === "29AABCZ1234F1Z8" || !result.gst_number;
        const initialGst = savedGst || (isMasterOrDummyGst ? "" : result.gst_number);

        setForm({
          pan_number: result.verification?.pan_number || "",
          pan_name: result.verification?.pan_name || "",
          pan_dob: result.verification?.pan_dob || "",
          gst_number: initialGst,
        });
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load KYC status.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [vendorId]);

  const change = (field) => (event) => {
    let value = event.target.value;
    if (field === "pan_number") {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    } else if (field === "gst_number") {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
    }
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const isPanValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan_number.trim());
  const isGstEntered = !!form.gst_number.trim();
  const isGstValid = !isGstEntered || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(form.gst_number.trim());
  const isGstMatching =
    !isGstEntered ||
    !form.pan_number.trim() ||
    (form.gst_number.length >= 12 &&
      form.gst_number.slice(2, 12).toUpperCase() === form.pan_number.trim().toUpperCase());

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    if (!isPanValid) {
      setError("Please enter a valid 10-character PAN number (e.g. ABCDE1234F).");
      return;
    }

    if (!form.pan_name.trim()) {
      setError("Please enter the name exactly as printed on your PAN card.");
      return;
    }

    if (!form.pan_dob) {
      setError("Please enter your date of birth or date of incorporation.");
      return;
    }

    if (isGstEntered && !isGstValid) {
      setError("Please enter a valid 15-character GSTIN format (e.g. 29ABCDE1234F1Z5) or leave blank if exempt.");
      return;
    }

    if (isGstEntered && form.pan_number.trim() && !isGstMatching) {
      setError("The GSTIN characters 3 to 12 must match your PAN number.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await workspaceRequest(`${vendorId}/kyc-submission/`, "POST", {
        ...form,
        pan_number: form.pan_number.trim().toUpperCase(),
        gst_number: form.gst_number.trim().toUpperCase(),
        pan_name: form.pan_name.trim(),
      });
      setData(result);
      setMessage("Your PAN details have been securely submitted. Our compliance team will review and verify them shortly.");
    } catch (err) {
      setError(err.message || "Submission failed. Please check your information and try again.");
    } finally {
      setBusy(false);
    }
  }

  const maskPan = (pan) => {
    if (!pan || pan.length < 10) return pan;
    return `${pan.slice(0, 5)}****${pan.slice(9)}`;
  };

  return (
    <div className="vkd-root">
      {/* Top Portal Navigation Bar (No Sidebar) */}
      <header className="vkd-nav">
        <div className="vkd-nav-inner">
          <Link to="/vendor-dashboard" className="vkd-nav-brand" aria-label="Vendor Portal">
            <img src={zenveLogo} alt="Zenve Logo" className="vkd-nav-logo" />
            <div className="vkd-nav-copy">
              <span className="vkd-nav-title">
                Zenve Vendor Portal
                <span className="vkd-nav-badge">KYC Gateway</span>
              </span>
              <span className="vkd-nav-sub">Identity & Tax Verification</span>
            </div>
          </Link>

          <div className="vkd-nav-actions">
            <div className="vkd-nav-security">
              <Icon name="shield" />
              <span>256-Bit Encrypted</span>
            </div>
            <Link to="/vendor-dashboard" className="vkd-nav-back">
              <Icon name="arrowLeft" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="vkd-container">
        {/* Onboarding Stepper */}
        <nav className="vkd-stepper" aria-label="Onboarding Progress">
          <div className="vkd-step completed">
            <span className="vkd-step-num"><Icon name="check" /></span>
            <span>Business Registration</span>
          </div>
          <div className="vkd-step-divider" />
          <div className="vkd-step active">
            <span className="vkd-step-num">2</span>
            <span>PAN & KYC Details</span>
          </div>
          <div className="vkd-step-divider" />
          <div className="vkd-step">
            <span className="vkd-step-num">3</span>
            <span>Staff & API Check</span>
          </div>
          <div className="vkd-step-divider" />
          <div className="vkd-step">
            <span className="vkd-step-num">4</span>
            <span>Selling Clearance</span>
          </div>
        </nav>

        {/* Hero Title */}
        <section className="vkd-hero">
          <span className="vkd-hero-eyebrow">
            <Icon name="shield" />
            Statutory Compliance
          </span>
          <h1>Submit PAN & Identity Details</h1>
          <p>
            To complete your vendor clearance and comply with marketplace tax regulations,
            provide your details exactly as printed on your government-issued PAN card.
          </p>
        </section>

        {/* Global Alert Messages */}
        {error && (
          <div className="vkd-alert error" role="alert">
            <Icon name="alertCircle" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="vkd-alert success" role="status">
            <Icon name="check" />
            <span>{message}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="vkd-loading-card">
            <div className="vkd-btn-spinner vkd-loading-spinner" />
            <p className="vkd-loading-text">Loading your KYC verification status…</p>
          </div>
        ) : !vendorId ? (
          <div className="vkd-card" style={{ textAlign: "center", padding: "40px" }}>
            <h2>Vendor Account Required</h2>
            <p style={{ color: "#64748b", margin: "10px 0 20px" }}>
              Please sign in with a linked vendor account to access this KYC verification gateway.
            </p>
            <Link to="/vendor-login" className="vkd-return-btn">
              Go to Vendor Login →
            </Link>
          </div>
        ) : data?.kyc_status === "VERIFIED" ? (
          /* Already Verified Card */
          <div className="vkd-submitted-card">
            <div className="vkd-submitted-icon">
              <Icon name="check" />
            </div>
            <h2>KYC Verified & Compliant</h2>
            <p>
              Your business identity and tax credentials have been successfully confirmed.
              Your account has full selling and settlement clearance.
            </p>

            <div className="vkd-summary-box">
              <div className="vkd-summary-title">Verified Credentials</div>
              <div className="vkd-summary-grid">
                <div className="vkd-summary-item">
                  <span className="vkd-summary-label">PAN Number</span>
                  <span className="vkd-summary-val mono">{maskPan(data.verification?.pan_number || form.pan_number)}</span>
                </div>
                <div className="vkd-summary-item">
                  <span className="vkd-summary-label">Name on PAN</span>
                  <span className="vkd-summary-val">{data.verification?.pan_name || form.pan_name || "Verified"}</span>
                </div>
                {data.gst_number && (
                  <div className="vkd-summary-item">
                    <span className="vkd-summary-label">GSTIN</span>
                    <span className="vkd-summary-val mono">{data.gst_number}</span>
                  </div>
                )}
                <div className="vkd-summary-item">
                  <span className="vkd-summary-label">KYC Status</span>
                  <span className="vkd-summary-val" style={{ color: "#059669" }}>Active / Approved</span>
                </div>
              </div>
            </div>

            <Link to="/vendor-dashboard" className="vkd-return-btn">
              Return to Vendor Dashboard →
            </Link>
          </div>
        ) : data?.kyc_request?.status === "SUBMITTED" ? (
          /* Details Submitted Card */
          <div className="vkd-submitted-card">
            <div className="vkd-submitted-icon">
              <Icon name="check" />
            </div>
            <h2>PAN Details Submitted for Review</h2>
            <p>
              Your information was received on{" "}
              <strong>{new Date(data.kyc_request.submitted_at || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>.
              Our compliance team and verification partner are validating your records.
            </p>

            <div className="vkd-summary-box">
              <div className="vkd-summary-title">Submission Summary</div>
              <div className="vkd-summary-grid">
                <div className="vkd-summary-item">
                  <span className="vkd-summary-label">PAN Number</span>
                  <span className="vkd-summary-val mono">{maskPan(form.pan_number || data.verification?.pan_number)}</span>
                </div>
                <div className="vkd-summary-item">
                  <span className="vkd-summary-label">PAN Holder Name</span>
                  <span className="vkd-summary-val">{form.pan_name || data.verification?.pan_name}</span>
                </div>
                <div className="vkd-summary-item">
                  <span className="vkd-summary-label">Date of Birth / Inc.</span>
                  <span className="vkd-summary-val">{form.pan_dob || data.verification?.pan_dob || "—"}</span>
                </div>
                <div className="vkd-summary-item">
                  <span className="vkd-summary-label">GSTIN</span>
                  <span className="vkd-summary-val mono">
                    {form.gst_number ||
                      (data.gst_number && data.gst_number !== "29AABCZ1234F1Z8"
                        ? data.gst_number
                        : "Not provided (Exempt)")}
                  </span>
                </div>
              </div>
            </div>

            <div className="vkd-timeline">
              <div className="vkd-timeline-step done">
                <span className="vkd-timeline-dot">✓</span>
                <span>PAN Details Submitted</span>
              </div>
              <div className="vkd-timeline-step active">
                <span className="vkd-timeline-dot">●</span>
                <span>Automated Database Verification (ApiTxt / NSDL)</span>
              </div>
              <div className="vkd-timeline-step pending">
                <span className="vkd-timeline-dot">○</span>
                <span>Vendor Clearance & Storefront Activation</span>
              </div>
            </div>

            <Link to="/vendor-dashboard" className="vkd-return-btn">
              Return to Vendor Dashboard →
            </Link>
          </div>
        ) : (
          /* Active Form + Guidance Layout */
          <div className="vkd-grid">
            {/* Main Form Column */}
            <section className="vkd-card">
              <div className="vkd-card-header">
                <div className="vkd-vendor-brand">
                  <h2>{data.brand_name || data.vendor_name}</h2>
                  <span className="vkd-vendor-sub">
                    Legal Name: {data.vendor_name} · Stage: {data.stage || "Onboarding"}
                  </span>
                </div>
                <span className={`vkd-status-pill ${data?.kyc_request?.status === "REQUESTED" ? "action-req" : ""}`}>
                  {data?.kyc_request?.status === "REQUESTED" ? "● Action Required" : "● KYC Onboarding"}
                </span>
              </div>

              <div className="vkd-notice-box">
                <Icon name="shield" />
                <div>
                  <strong>Official Identity Check:</strong> Submitting this form sends your PAN and GST credentials
                  to the compliance team. Once verified via official database records, your selling permissions will be cleared.
                </div>
              </div>

              <form className="vkd-form" onSubmit={submit}>
                {/* PAN Number Field */}
                <div className="vkd-field">
                  <div className="vkd-label-row">
                    <label className="vkd-label" htmlFor="vkd-pan">
                      Permanent Account Number (PAN)
                      <span className="vkd-required">*</span>
                    </label>
                    {isPanValid ? (
                      <span className="vkd-valid-badge">
                        <Icon name="check" /> Valid Format
                      </span>
                    ) : (
                      <span className="vkd-tag-req">10 Characters</span>
                    )}
                  </div>
                  <div className={`vkd-input-wrap ${form.pan_number && !isPanValid ? "has-error" : ""}`}>
                    <span className="vkd-input-icon"><Icon name="idCard" /></span>
                    <input
                      id="vkd-pan"
                      name="pan_number"
                      type="text"
                      className="vkd-input mono"
                      maxLength={10}
                      autoComplete="off"
                      spellCheck={false}
                      required
                      value={form.pan_number}
                      onChange={change("pan_number")}
                      placeholder="e.g. ABCDE1234F"
                      disabled={busy}
                    />
                  </div>
                  <span className="vkd-hint">Format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).</span>
                </div>

                {/* Name on PAN */}
                <div className="vkd-field">
                  <div className="vkd-label-row">
                    <label className="vkd-label" htmlFor="vkd-name">
                      Name as Printed on PAN Card
                      <span className="vkd-required">*</span>
                    </label>
                    <span className="vkd-tag-req">Required</span>
                  </div>
                  <div className="vkd-input-wrap">
                    <span className="vkd-input-icon"><Icon name="user" /></span>
                    <input
                      id="vkd-name"
                      name="pan_name"
                      type="text"
                      className="vkd-input"
                      maxLength={255}
                      autoComplete="name"
                      required
                      value={form.pan_name}
                      onChange={change("pan_name")}
                      placeholder="e.g. Rajesh Kumar Sharma"
                      disabled={busy}
                    />
                  </div>
                  <span className="vkd-hint">Must match the legal name on the physical PAN card exactly.</span>
                </div>

                {/* Date of Birth / Incorporation */}
                <div className="vkd-field">
                  <div className="vkd-label-row">
                    <label className="vkd-label" htmlFor="vkd-dob">
                      Date of Birth / Date of Incorporation
                      <span className="vkd-required">*</span>
                    </label>
                    <span className="vkd-tag-req">Required</span>
                  </div>
                  <div className="vkd-input-wrap">
                    <span className="vkd-input-icon"><Icon name="calendar" /></span>
                    <input
                      id="vkd-dob"
                      name="pan_dob"
                      type="date"
                      className="vkd-input"
                      required
                      max={new Date().toISOString().split("T")[0]}
                      value={form.pan_dob}
                      onChange={change("pan_dob")}
                      disabled={busy}
                    />
                  </div>
                  <span className="vkd-hint">Date of birth for individual / proprietor, or incorporation date for company / LLP.</span>
                </div>

                {/* GSTIN Field */}
                <div className="vkd-field">
                  <div className="vkd-label-row">
                    <label className="vkd-label" htmlFor="vkd-gst">
                      GSTIN (Goods and Services Tax Number)
                    </label>
                    <span className="vkd-tag-opt">Optional</span>
                  </div>
                  <div className={`vkd-input-wrap ${isGstEntered && form.pan_number.trim() && !isGstMatching ? "has-error" : ""}`}>
                    <span className="vkd-input-icon"><Icon name="building" /></span>
                    <input
                      id="vkd-gst"
                      name="gst_number"
                      type="text"
                      className="vkd-input mono"
                      maxLength={15}
                      spellCheck={false}
                      autoComplete="off"
                      value={form.gst_number}
                      onChange={change("gst_number")}
                      placeholder="Enter 15-digit GSTIN (optional)"
                      disabled={busy}
                    />
                  </div>
                  {isGstEntered && form.pan_number.trim() && !isGstMatching ? (
                    <span className="vkd-hint warn">
                      ⚠️ Note: Characters 3 to 12 of GSTIN must match your PAN ({form.pan_number}).
                    </span>
                  ) : (
                    <span className="vkd-hint">
                      Optional: If you have a GSTIN registered under this PAN, enter it here. Otherwise, leave blank.
                    </span>
                  )}
                </div>

                {/* Submit Action */}
                <div className="vkd-actions">
                  <button type="submit" className="vkd-submit-btn" disabled={busy}>
                    {busy ? (
                      <>
                        <span className="vkd-btn-spinner" />
                        <span>Submitting KYC Details…</span>
                      </>
                    ) : (
                      <>
                        <span>Submit PAN Details for Verification</span>
                        <Icon name="arrowRight" />
                      </>
                    )}
                  </button>
                  <Link to="/vendor-dashboard" className="vkd-cancel-btn">
                    Cancel
                  </Link>
                  <span className="vkd-actions-security">
                    <Icon name="lock" />
                    <span>256-Bit TLS Encrypted</span>
                  </span>
                </div>
              </form>
            </section>

            {/* Right Guidance & Trust Sidebar */}
            <aside className="vkd-sidebar">
              {/* Guidelines Card */}
              <div className="vkd-sidecard">
                <div className="vkd-sidecard-title">
                  <Icon name="idCard" />
                  <span>Document Guidelines</span>
                </div>
                <p>Ensure all values are entered accurately to avoid verification delays or rejection:</p>
                <ul className="vkd-sidecard-list">
                  <li>
                    <Icon name="check" />
                    <span><strong>PAN spelling:</strong> Must match the full name on the physical card.</span>
                  </li>
                  <li>
                    <Icon name="check" />
                    <span><strong>DOB verification:</strong> Matches the official Income Tax database record.</span>
                  </li>
                  <li>
                    <Icon name="check" />
                    <span><strong>GSTIN link:</strong> Must be registered under the specified PAN.</span>
                  </li>
                </ul>
              </div>

              {/* Why KYC Card */}
              <div className="vkd-sidecard">
                <div className="vkd-sidecard-title">
                  <Icon name="building" />
                  <span>Why is PAN Required?</span>
                </div>
                <p>
                  As an authorized marketplace vendor, statutory compliance under Section 194O of the
                  Indian Income Tax Act requires mandatory PAN registration before payouts and settlements.
                </p>
              </div>

              {/* Security Card */}
              <div className="vkd-sidecard security">
                <div className="vkd-sidecard-title">
                  <Icon name="lock" />
                  <span>Privacy & Encryption</span>
                </div>
                <p>
                  Your credentials are transmitted over encrypted TLS channels and validated directly
                  through NSDL / ApiTxt compliance services.
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
