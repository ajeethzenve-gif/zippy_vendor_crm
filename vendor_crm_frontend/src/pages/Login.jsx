import { useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import zippyLogo from "../assest/logo/zippy_logo.jpeg";
import "../styles/Login.css";

function Icon({ name, ...props }) {
  const paths = {
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    hidden: <><path d="m3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a19 19 0 0 1-3.1 3.9M6.2 6.2A22 22 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.8-1.8M10 10a3 3 0 0 0 4 4" /></>,
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
    box: <><path d="m12 3 9 5v9l-9 5-9-5V8l9-5Zm-9 5 9 5 9-5M12 13v9M7.5 5.5l9 5v5" /></>,
    people: <><circle cx="9" cy="7" r="3" /><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 4a3 3 0 0 1 0 6m3 4a6 6 0 0 1 3 5v2" /></>,
    growth: <><rect x="4" y="5" width="16" height="17" rx="2" /><path d="M9 5V3h6v2M8 17l3-3 3 1 3-5m-4 0h4v4" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export default function Login({ audience = "staff" }) {
  const isVendor = audience === "vendor";
  const { loginCustom } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");
  const viewportRef = useRef(null);
  const layoutRef = useRef(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const layout = layoutRef.current;
    const fitLayout = () => {
      // Scale the original design together, including any sign-in error.
      const scale = Math.min(1, viewport.clientHeight / layout.scrollHeight, viewport.clientWidth / layout.scrollWidth);
      layout.style.setProperty("--login-scale", String(scale));
    };
    fitLayout();
    const observer = new ResizeObserver(fitLayout);
    observer.observe(viewport);
    observer.observe(layout);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setLoginError("");
    try {
      const user = await loginCustom(username.trim(), password, { staffOnly: !isVendor, vendorOnly: isVendor });
      navigate(user.landingPath, { replace: true });
    } catch (error) {
      setLoginError(error.message || "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="crm-login" ref={viewportRef}>
      <div className="crm-login-layout" ref={layoutRef}>
        <section className="crm-login-story" aria-labelledby="crm-welcome-title">
          <div className="crm-login-brand">
            <img src={zippyLogo} alt="Zippy" width="54" height="68" />
            <div><span>{isVendor ? "Zippy VendorHub" : "Zippy CRM"}</span><p>{isVendor ? "Connect · Collaborate · Grow" : "Your team. Connected."}</p></div>
          </div>
          <div className="crm-login-intro">
            <h1 id="crm-welcome-title">{isVendor ? "Your Partner" : "Your Team."}<br /><span>{isVendor ? "in Progress" : "One Workspace."}</span></h1>
            {isVendor ? <p>Easily access your vendor account,<br className="crm-desktop-break" /> manage orders, and stay connected<br className="crm-desktop-break" /> with us — all in one place.</p> : <p>Manage vendors, coordinate operations,<br className="crm-desktop-break" /> and keep your team moving.<br className="crm-desktop-break" /> Sign in to the tools assigned to your role.</p>}
            <ul className="crm-login-benefits" aria-label={isVendor ? "Your vendor workspace" : "Your CRM workspace"}>
              <li><span><Icon name={isVendor ? "box" : "people"} /></span><p>{isVendor ? <>Manage<br />Orders</> : <>Vendor<br />Management</>}</p></li>
              <li><span><Icon name={isVendor ? "people" : "box"} /></span><p>{isVendor ? <>Connect<br />with Buyers</> : <>Order<br />Operations</>}</p></li>
              <li><span><Icon name="growth" /></span><p>{isVendor ? <>Grow<br />Your Business</> : <>Business<br />Insights</>}</p></li>
            </ul>
          </div>
        </section>

        <section className="crm-login-card" aria-labelledby="crm-login-title">
          <header className="crm-login-card-header">
            <div className="crm-login-avatar"><Icon name="user" /></div>
            <h2 id="crm-login-title">{isVendor ? "Vendor Login" : "CRM Login"}</h2>
            <p>{isVendor ? <>Welcome back! Sign in to your vendor account.</> : <>Sign in with your staff account.<br />Your role determines your workspace.</>}</p>
          </header>
          <form className="crm-login-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
            <div className="crm-login-field">
              <label htmlFor="login-username">{isVendor ? "Username or email" : "Username"}</label>
              <div className="crm-login-input-wrap">
                <Icon name="user" />
                <input id="login-username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username} onChange={(event) => setUsername(event.target.value)} placeholder={isVendor ? "Enter your username or email" : "Enter your username"} disabled={isSubmitting} aria-describedby={loginError ? "login-error" : undefined} />
              </div>
            </div>
            <div className="crm-login-field">
              <label htmlFor="login-password">Password</label>
              <div className="crm-login-input-wrap">
                <Icon name="lock" />
                <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" disabled={isSubmitting} aria-describedby={loginError ? "login-error" : undefined} />
                <button className="crm-login-eye" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}><Icon name={showPassword ? "hidden" : "eye"} /></button>
              </div>
            </div>
            {loginError && <p id="login-error" className="crm-login-error" role="alert">{loginError}</p>}
            <button className="crm-login-submit" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? "Signing in…" : "Login"}</span>
              {!isSubmitting && <Icon name="arrow" />}
            </button>
            <span className="crm-login-status" role="status">{isSubmitting ? "Signing in. Please wait." : ""}</span>
          </form>
          <footer className="crm-login-card-footer"><Icon name="lock" /><span>{isVendor ? "Your vendor account. One simple sign-in." : "CRM staff access · Assigned role permissions"}</span></footer>
        </section>
      </div>
    </main>
  );
}
