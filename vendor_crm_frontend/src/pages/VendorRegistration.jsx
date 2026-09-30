import React, { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assest/logo/zippy_logo.jpeg";
import { API_BASE_URL } from "../services/api";

const fields = [
  ["owner_name", "Your full name", "text", "e.g. Aditi Sharma", 150],
  ["brand_name", "Business / brand name", "text", "Your business name", 255],
  ["email", "Business email", "email", "you@company.com", 254],
  ["phone", "Phone number", "tel", "+919876543210", 16],
  ["city", "City", "text", "Where you operate", 100],
  ["primary_category", "Primary category", "text", "e.g. Pet accessories", 150],
  ["legal_business_name", "Legal business name", "text", "Registered business name", 255, true],
  ["business_type", "Business type", "select", "Choose business type", 30, true],
  ["alternate_phone", "Alternate phone", "tel", "+919876543210", 16, true],
  ["address_line1", "Address line 1", "text", "Building and street", 255, true],
  ["address_line2", "Address line 2", "text", "Area or landmark", 255, true],
  ["state", "State / province", "text", "State or province", 100, true],
  ["country", "Country", "text", "Country", 100, true],
  ["postal_code", "Postal code", "text", "Postal or ZIP code", 12, true],
  ["gst_number", "GSTIN", "text", "15-character GSTIN, if registered", 15, true],
  ["website", "Website", "url", "https://yourbusiness.com", 200, true],
  ["instagram_url", "Instagram profile", "url", "https://instagram.com/yourbusiness", 200, true],
  ["business_description", "About your business", "textarea", "Tell us about your products and business", 2000, true],
  ["password", "Create password", "password", "Use a strong, unique password", 128],
];

export default function VendorRegistration() {
  const [form, setForm] = useState({ country: "India" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setErrors({});
    try {
      const response = await fetch(`${API_BASE_URL}/vendors/register/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setErrors(Object.keys(data).length ? data : { detail: "Registration failed. Please try again." }); return; }
      setResult(data); setForm({});
    } catch { setErrors({ detail: "We could not reach the server. Please try again." }); }
    finally { setBusy(false); }
  }
  return <div className="zippy-registration">
    <header className="zippy-nav"><Link to="/vendor-login" className="zippy-wordmark">Zippy<span>VENDOR CRM</span></Link><Link to="/vendor-login">Back to sign in ↗</Link></header>
    <main className="zippy-registration-grid">
      <section className="zippy-story"><span className="zippy-eyebrow">GROW WITH ZIPPY</span><h1>Your business.<br />Our next great partner.</h1><p>Bring your products to Zippy. Keep your catalogue, orders and settlements together in one place.</p><img src={logo} alt="Zippy" className="zippy-hero-logo" /><div className="zippy-steps"><span>01 · Register</span><span>02 · Get reviewed</span><span>03 · Start selling</span></div></section>
      <section className="zippy-form-card">
        {result ? <div role="status" className="zippy-success"><span className="zippy-eyebrow">REGISTRATION RECEIVED</span><h2>Welcome to Zippy.</h2><p>Your vendor reference is <strong>{result.vendor_code}</strong>.</p><p>Your business is awaiting onboarding and KYC review. Registration does not activate selling access.</p><Link className="zippy-primary" to="/vendor-login">Sign in to vendor account</Link></div> : <><span className="zippy-eyebrow">BECOME A VENDOR</span><h2>Let’s meet your business.</h2><p className="zippy-form-intro">Tell us a little about yourself to get started.</p>
        <form onSubmit={submit} className="zippy-form" aria-busy={busy}>
          {Object.entries(errors).filter(([key]) => !fields.some(([name]) => name === key)).map(([key, value]) => <p role="alert" className="zippy-error" key={key}>{Array.isArray(value) ? value.join(" ") : String(value)}</p>)}
          {fields.map(([name, label, type, placeholder, maxLength, optional]) => {
            const props = { id: name, name, placeholder, maxLength, required: !optional, value: form[name] || "", onChange: e => setForm({ ...form, [name]: e.target.value }), "aria-invalid": !!errors[name], "aria-describedby": errors[name] ? name + "-error" : undefined };
            return <div className={["password", "business_description"].includes(name) ? "zippy-field zippy-wide" : "zippy-field"} key={name}>
              <label htmlFor={name}>{label}{optional ? " (optional)" : " *"}</label>
              {type === "select" ? <select {...props}><option value="">Choose business type</option><option value="SOLE_PROPRIETOR">Sole proprietor</option><option value="PARTNERSHIP">Partnership</option><option value="LLP">Limited liability partnership</option><option value="COMPANY">Company</option><option value="OTHER">Other</option></select> : type === "textarea" ? <textarea {...props} rows={4} /> : <input {...props} type={type} minLength={name === "password" ? 8 : undefined} pattern={type === "tel" ? "[+]?[0-9]{10,15}" : undefined} autoComplete={name === "password" ? "new-password" : name === "email" ? "email" : type === "tel" ? "tel" : name === "owner_name" ? "name" : undefined} />}
              {errors[name] && <small id={name + "-error"} className="zippy-error" role="alert">{[].concat(errors[name]).join(" ")}</small>}
            </div>;
          })}
          <p className="zippy-wide zippy-note">Fields marked * are required. Your business will be reviewed before selling is activated.</p><button className="zippy-primary zippy-wide" disabled={busy}>{busy ? "Creating your account…" : "Register my business →"}</button>
        </form></>}
      </section>
    </main><footer className="zippy-footer">Zippy Vendor CRM · A simpler way to grow together.</footer>
  </div>;
}
