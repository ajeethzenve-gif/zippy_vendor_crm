import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import zenveLogo from "../assest/logo/zenve_logo.png";
const backgroundImages = Object.entries(import.meta.glob(
  "../assest/vendorbg/*.{png,jpg,jpeg,webp,avif}",
  { eager: true, query: "?url", import: "default" },
)).sort(([first], [second]) => first.localeCompare(second)).map(([, url]) => url);
import "../styles/LoginLanding.css";

function FeatureIcon({ type }) {
  const paths = {
    box: <><path d="m12 3 9 5v9l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v9M7 5l10 6v4" /></>,
    truck: <><path d="M2 4h12v12H2zM14 8h5l3 4v4h-8" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
    users: <><circle cx="9" cy="7" r="3" /><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 4a3 3 0 0 1 0 6m2 4a6 6 0 0 1 3 5v2" /></>,
    chart: <><path d="M3 21h19M6 17v-5m6 5V8m6 9V4M3 9l6-4 5 2 6-5" /></>,
    shield: <><path d="m12 2 9 4v6c0 5-5 9-9 11-4-2-9-6-9-11V6l9-4Z" /><path d="m8 12 3 3 5-6" /></>,
    headset: <><path d="M3 13v-2a9 9 0 0 1 18 0v2M3 12h4v8H3zm14 0h4v8h-4zM17 20c0 2-3 2-5 2" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}
function Brand({ compact = false, vendor = false }) {
  return <div className={`zl-brand ${compact ? "zl-brand-card" : ""}`}>
    <img src={zenveLogo} alt="Zenve" />
    <div><strong><span>{vendor ? "Zenve Vendor" : "Zenve Vendor CRM"}</span></strong><p>Connect · Collaborate · Grow</p></div>
  </div>;
}
export default function LoginLanding({ audience = "vendor", children }) {
  const vendor = audience === "vendor";
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  useEffect(() => {
    if (backgroundImages.length < 2) return;
    const timer = setInterval(() => {
      setBackgroundIndex((index) => (index + 1) % backgroundImages.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (backgroundImages.length < 2) return;
    // Preload only the next slide, keeping initial loading light.
    const nextImage = new Image();
    nextImage.src = backgroundImages[(backgroundIndex + 1) % backgroundImages.length];
  }, [backgroundIndex]);
  return <main className="zl-page" style={{ backgroundImage: `url("${backgroundImages[backgroundIndex]}")` }}>
    <div className="zl-layout">
      <div className="zl-card-column">

        <section className="zl-card" aria-labelledby="zl-login-title">
          <Brand compact vendor={vendor} />
          <header className="zl-card-heading"><h2 id="zl-login-title">{vendor ? "Vendor Login" : "Staff Login"}</h2><p>{vendor ? "Choose your preferred method to sign in" : "Sign in to your assigned workspace"}</p></header>
          {children}
          <footer className="zl-security"><FeatureIcon type="shield" /><span>Your information is secure with us</span></footer>
          {vendor ? (
            <Link className="zl-switch" to="/crm">Staff login →</Link>
          ) : (
            <Link className="zl-switch" to="/">← Vendor login</Link>
          )}
        </section>
      </div>
    </div>
  </main>;
}
