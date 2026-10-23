import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginLanding from "../components/LoginLanding";

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

  return <LoginLanding audience="staff">
          <form className="crm-login-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
            <div className="crm-login-field">
              <label htmlFor="login-username">{isVendor ? "Username or email" : "Username"}</label>
              <div className={`crm-login-input-wrap ${loginError ? "has-error" : ""}`}>
                <Icon name="user" />
                <input className="vl-input" id="login-username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username} onChange={(event) => setUsername(event.target.value)} placeholder={isVendor ? "Enter your username or email" : "Enter your username"} disabled={isSubmitting} aria-describedby={loginError ? "login-error" : undefined} />
              </div>
            </div>
            <div className="crm-login-field">
              <label htmlFor="login-password">Password</label>
              <div className={`crm-login-input-wrap ${loginError ? "has-error" : ""}`}>
                <Icon name="lock" />
                <input className="vl-input" id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" disabled={isSubmitting} aria-describedby={loginError ? "login-error" : undefined} />
                <button className="crm-login-eye" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}><Icon name={showPassword ? "hidden" : "eye"} /></button>
              </div>
            </div>
            {loginError && (
              <div id="login-error" className="crm-login-error" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>{loginError}</span>
              </div>
            )}
            <button className="crm-login-submit" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? "Signing in…" : "Sign In to Workspace"}</span>
              {!isSubmitting && <Icon name="arrow" />}
            </button>
            <span className="crm-login-status" role="status">{isSubmitting ? "Signing in. Please wait." : ""}</span>
          </form>
  </LoginLanding>;
}
