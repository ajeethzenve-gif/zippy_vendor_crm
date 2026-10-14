import { Link } from "react-router-dom";
import zippyLogo from "../assest/logo/zippy_logo.jpeg";
import courierBackground from "../assest/courier-login-background.png";
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
function Brand({ compact = false }) {
  return <div className={`zl-brand ${compact ? "zl-brand-card" : ""}`}>
    <img src={zippyLogo} alt="Zenve Zippy" />
    <div><strong>Zippy<span>Vendor CRM</span></strong><p>Connect · Collaborate · Grow</p></div>
  </div>;
}
export default function LoginLanding({ audience = "vendor", children }) {
  const vendor = audience === "vendor";
  const features = vendor
    ? [["box", "Manage Orders"], ["truck", "Track Deliveries"], ["users", "Connect with Buyers"], ["chart", "Grow Your Business"], ["shield", "Secure Access"], ["headset", "Stay Connected"]]
    : [["users", "Manage Vendors"], ["box", "Order Operations"], ["truck", "Track Deliveries"], ["chart", "Business Insights"], ["shield", "Role Permissions"], ["headset", "Team Collaboration"]];
  return <main className="zl-page" style={{ backgroundImage: `url(${courierBackground})` }}>
    <div className="zl-curve" aria-hidden="true" />
    <div className="zl-layout">
      <section className="zl-story" aria-labelledby="zl-heading">
        <Brand />
        <div className="zl-intro"><h1 id="zl-heading">{vendor ? <>Empowering<br />Vendors for a</> : <>Connecting<br />Your Team for a</>}<br /><span>Smarter Tomorrow</span></h1>
          <p>{vendor ? "Manage orders, track deliveries, connect with buyers, and grow your business — all in one place." : "Manage vendors, coordinate deliveries, and keep your operations moving — together in one workspace."}</p>
          <ul className="zl-features">{features.map(([icon, label]) => <li key={icon}><span className={`zl-feature-icon zl-${icon}`}><FeatureIcon type={icon} /></span><span>{label}</span></li>)}</ul>
        </div>
      </section>
      <div className="zl-card-column">

        <section className="zl-card" aria-labelledby="zl-login-title">
          <Brand compact />
          <header className="zl-card-heading"><h2 id="zl-login-title">{vendor ? "Vendor Login" : "Staff Login"}</h2><p>{vendor ? "Choose your preferred method to sign in" : "Sign in to your assigned workspace"}</p></header>
          {children}
          <footer className="zl-security"><FeatureIcon type="shield" /><span>Your information is secure with us</span></footer>
          {vendor && <Link className="zl-switch" to="/login">Staff login →</Link>}
        </section>
      </div>
    </div>
  </main>;
}
