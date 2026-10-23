import { useEffect, useState } from "react";
import { workspaceRequest } from "../services/vendorWorkspaces";
import "../styles/VendorWorkspaces.css";
const label = (value = "PENDING") => value.toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
function VerificationCard({ vendor, onSaved }) {
  const [gst, setGst] = useState(vendor.gst_number || vendor.verification?.gst_number || "");
  const [pan, setPan] = useState(vendor.verification?.pan_number || "");
  const [panName, setPanName] = useState(vendor.verification?.pan_name || "");
  const [panDob, setPanDob] = useState(vendor.verification?.pan_dob || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    setGst(vendor.gst_number || vendor.verification?.gst_number || "");
    setPan(vendor.verification?.pan_number || "");
    setPanName(vendor.verification?.pan_name || "");
    setPanDob(vendor.verification?.pan_dob || "");
  }, [vendor.gst_number, vendor.verification?.pan_number, vendor.verification?.pan_name, vendor.verification?.pan_dob]);
  async function requestDetails() {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      onSaved(await workspaceRequest(`${vendor.id}/kyc-request/`, "POST", {}));
      setMessage("KYC notification sent to the vendor portal. The vendor can now submit their PAN details.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function submit(event, verify) {
    event.preventDefault(); if (busy) return;
    if (verify && (!panName.trim() || !panDob)) {
      setError("Enter the PAN holder name and date of birth before verifying.");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const saved = await workspaceRequest(`${vendor.id}/kyc/`, "PATCH", { gst_number: gst.trim().toUpperCase(), pan_number: pan.trim().toUpperCase(), pan_name: panName.trim(), pan_dob: panDob || null });
      onSaved(saved);
      if (verify) {
        const result = await workspaceRequest(`${vendor.id}/kyc/`, "POST", {});
        onSaved(result); setMessage(`Provider check completed. KYC: ${label(result.kyc_status)}.`);
      } else setMessage("Details saved. Provider verification is still required.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <article className="vw-card"><div className="vw-section-heading"><div><h2>{vendor.brand_name || vendor.vendor_name}</h2><p>{vendor.vendor_name} · {vendor.stage}</p></div><span className={`vw-status ${vendor.kyc_status.toLowerCase()}`}>{label(vendor.kyc_status)}</span></div>
    <div className="vw-request-panel">
      <div><strong>Collect PAN details from vendor</strong><p>{vendor.kyc_request?.status === "SUBMITTED" ? `Vendor submitted details on ${new Date(vendor.kyc_request.submitted_at).toLocaleString()}. Review them below.` : vendor.kyc_request?.status === "REQUESTED" ? "Waiting for the vendor to submit PAN details." : "Notify the vendor that KYC has started and ask them to submit PAN details securely in their portal."}</p></div>
      <button type="button" className="secondary" disabled={busy || vendor.kyc_request?.status === "REQUESTED"} onClick={requestDetails}>{vendor.kyc_request?.status === "REQUESTED" ? "Notification sent" : vendor.kyc_request?.status === "SUBMITTED" ? "Request updated PAN details" : "Send KYC notification"}</button>
    </div>
    <form className="vw-form" onSubmit={(event) => submit(event, event.nativeEvent.submitter?.value === "verify")}><fieldset disabled={busy}>
      <label>GSTIN<input required maxLength={15} value={gst} onChange={(event) => setGst(event.target.value.toUpperCase())} spellCheck={false} placeholder="15-character GSTIN" /><small>Provider result: {label(vendor.verification?.gst_status)}</small></label>
      <label>PAN<input required maxLength={10} value={pan} onChange={(event) => setPan(event.target.value.toUpperCase())} spellCheck={false} placeholder="10-character PAN" /><small>Provider result: {label(vendor.verification?.pan_status)}</small></label>
      <label>Name as printed on PAN<input maxLength={255} value={panName} onChange={(event) => setPanName(event.target.value)} autoComplete="off" /></label>
      <label>Date of birth as per PAN<input type="date" value={panDob} onChange={(event) => setPanDob(event.target.value)} /></label>
      <div className="vw-actions vw-wide"><button name="action" value="verify">{busy ? "Processing…" : "Verify with provider"}</button><button className="secondary" name="action" value="save">Save details</button></div>
    </fieldset></form>
    {vendor.verification?.checked_at && <p className="vw-meta">Last checked: {new Date(vendor.verification.checked_at).toLocaleString()} · Reference: {vendor.verification.provider_reference}</p>}
    {error && <p role="alert" className="vw-error">{error}</p>}{message && <p role="status" className="vw-success">{message}</p>}
  </article>;
}
export default function VendorKYC() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    try { setVendors(await workspaceRequest("kyc/")); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const filtered = vendors.filter((vendor) => (!status || vendor.kyc_status === status) && `${vendor.vendor_name} ${vendor.brand_name}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="vw-page"><header className="vw-heading"><div><span className="vw-eyebrow">15 · Compliance</span><h1>Vendor KYC Verification</h1><p>Check vendor GST and PAN details with your verification provider.</p></div><span className="vw-count">{vendors.filter((vendor) => vendor.kyc_status === "VERIFIED").length} verified / {vendors.length}</span></header>
    <p className="vw-note">Saving or matching the format of an identifier does not verify it. ApiTxt must confirm the PAN, name and date of birth, and find an active GSTIN linked to that PAN. Each verification uses the provider’s paid API calls.</p>
    <div className="vw-filters"><label>Find vendor<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or brand" /></label><label>KYC status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{["PENDING", "VERIFIED", "REJECTED"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label><button className="secondary" disabled={loading} onClick={load}>Refresh</button></div>
    {error && <p role="alert" className="vw-error">{error}</p>}{loading ? <p role="status">Loading vendors…</p> : filtered.length ? <div className="vw-grid">{filtered.map((vendor) => <VerificationCard key={vendor.id} vendor={vendor} onSaved={(updated) => setVendors((previous) => previous.map((item) => item.id === updated.id ? updated : item))} />)}</div> : <p className="vw-empty">No vendors match your filters.</p>}
  </main>;
}
