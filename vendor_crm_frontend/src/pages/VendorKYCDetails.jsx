import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { workspaceRequest } from "../services/vendorWorkspaces";
import "../styles/VendorWorkspaces.css";

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
    if (!vendorId) { setLoading(false); return; }
    let active = true;
    workspaceRequest(`${vendorId}/kyc-submission/`).then((result) => {
      if (!active) return;
      setData(result);
      setForm({ pan_number: result.verification?.pan_number || "", pan_name: result.verification?.pan_name || "", pan_dob: result.verification?.pan_dob || "", gst_number: result.gst_number || "" });
    }).catch((err) => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [vendorId]);
  const change = (field) => (event) => setForm((previous) => ({ ...previous, [field]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await workspaceRequest(`${vendorId}/kyc-submission/`, "POST", { ...form, pan_number: form.pan_number.trim().toUpperCase(), gst_number: form.gst_number.trim().toUpperCase(), pan_name: form.pan_name.trim() });
      setData(result); setMessage("Your PAN details have been submitted. Our team will verify them and update your KYC status.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="vw-page"><header className="vw-heading"><div><span className="vw-eyebrow">Vendor account · KYC</span><h1>Submit PAN details</h1><p>Provide the details printed on your PAN card so our team can complete verification.</p></div><Link to="/vendor-dashboard">Back to dashboard</Link></header>
    {error && <p className="vw-error" role="alert">{error}</p>}{message && <p className="vw-success" role="status">{message}</p>}
    {loading ? <p role="status">Loading your KYC request…</p> : !vendorId ? <p className="vw-note">This form is for a linked vendor login.</p> : data?.kyc_request?.status === "SUBMITTED" ? <section className="vw-card"><h2>PAN details submitted</h2><p>Submitted on {new Date(data.kyc_request.submitted_at).toLocaleString()}. Your details are awaiting staff review and provider verification.</p><Link to="/vendor-dashboard">Return to dashboard →</Link></section> : data?.kyc_request?.status !== "REQUESTED" ? <p className="vw-note">There is no open request for PAN details. Your account team will notify you when submission is needed.</p> : <section className="vw-card"><h2>{data.brand_name || data.vendor_name}</h2><p className="vw-note">Your KYC verification has started. Submitting this form sends your details to the verification team; it does not automatically approve KYC.</p>
      <form className="vw-form" onSubmit={submit}><fieldset disabled={busy}>
        <label>PAN number<input required autoComplete="off" spellCheck={false} maxLength={10} value={form.pan_number} onChange={change("pan_number")} placeholder="ABCDE1234F" /></label>
        <label>Name as printed on PAN<input required autoComplete="off" maxLength={255} value={form.pan_name} onChange={change("pan_name")} /></label>
        <label>Date of birth as per PAN<input required type="date" value={form.pan_dob} onChange={change("pan_dob")} /></label>
        <label>GSTIN (if registered)<input spellCheck={false} maxLength={15} autoComplete="off" value={form.gst_number} onChange={change("gst_number")} /><small>If supplied, GSTIN must belong to the same PAN.</small></label>
        <div className="vw-actions vw-wide"><button disabled={busy}>{busy ? "Submitting…" : "Submit PAN details"}</button></div>
      </fieldset></form>
    </section>}
  </main>;
}
