import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/VendorLogin.css";

// Geometric folded diamond / ribbon logo for VendorHub
function VendorHubLogo() {
  return (
    <svg className="vl-brand-logo" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vhTealGrad" x1="12" y1="12" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00d2aa" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="vhBlueGrad" x1="26" y1="26" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e90ff" />
          <stop offset="1" stopColor="#0052cc" />
        </linearGradient>
      </defs>
      {/* Top-left rounded folded quadrilateral / petal */}
      <rect x="15" y="8" width="22" height="32" rx="9" transform="rotate(-30 15 8)" fill="url(#vhTealGrad)" />
      {/* Bottom-right rounded folded quadrilateral / petal */}
      <rect x="30" y="16" width="22" height="32" rx="9" transform="rotate(-30 30 16)" fill="url(#vhBlueGrad)" />
    </svg>
  );
}

function Icon({ name, ...props }) {
  const icons = {
    user: (
      <>
        <circle cx="12" cy="8" r="4.2" />
        <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10.5" width="16" height="11" rx="2.5" />
        <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
        <circle cx="12" cy="16" r="1.2" fill="currentColor" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeSlash: (
      <>
        <path d="m3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a19 19 0 0 1-3.1 3.9M6.2 6.2A22 22 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.8-1.8M10 10a3 3 0 0 0 4 4" />
      </>
    ),
    arrowRight: (
      <>
        <path d="M5 12h14M12 5l7 7-7 7" />
      </>
    ),
    phone: (
      <>
        <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
        <path d="M11 18h2" />
      </>
    ),
    box: (
      <>
        <path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z" />
        <path d="m3 8 9 5 9-5M12 13v9" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="7.5" r="3.2" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.5a3 3 0 0 1 0 5.5M19 19.5a5.5 5.5 0 0 0-3-4.5" />
      </>
    ),
    clipboardChart: (
      <>
        <rect x="4" y="4" width="16" height="17" rx="2.5" />
        <path d="M9 4V2.5h6V4M8 16l2.5-3 2.5 1.5L16 10" />
      </>
    ),
    pin: (
      <>
        <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z" fill="currentColor" />
        <circle cx="12" cy="9" r="2.5" fill="#fff" />
      </>
    ),
    truck: (
      <>
        <path d="M1 3h15v13H1z" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </>
    ),
    chartBars: (
      <>
        <path d="M18 20V10M12 20V4M6 20v-6" strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
    checklist: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="m8.5 10 1.8 1.8 4-4M8.5 15.5l1.8 1.8 4-4" />
      </>
    ),
    secureLock: (
      <>
        <path d="M12 2 4 5.5V11c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5.5L12 2Z" />
        <path d="m9 11.5 2 2 4-4" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {icons[name] || null}
    </svg>
  );
}

export default function VendorLogin() {
  const { loginCustom, sendVendorOtp, loginVendorOtp } = useAuth();
  const navigate = useNavigate();

  const [loginMethod, setLoginMethod] = useState("credentials"); // "credentials" | "otp"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpChallenge, setOtpChallenge] = useState("");
  const [resendAfter, setResendAfter] = useState(0);
  useEffect(() => {
    if (!resendAfter) return;
    const timer = setTimeout(() => setResendAfter(previous => Math.max(0, previous - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendAfter]);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState("");

  const requestOtp = async () => {
    if (isSubmitting || resendAfter) return;
    setIsSubmitting(true); setErrorMessage(""); setForgotPasswordMsg("");
    try {
      const result = await sendVendorOtp(phoneNumber.trim());
      setOtpChallenge(result.challenge); setOtpCode(""); setOtpSent(true);
      setResendAfter(result.retry_after || 60);
      setForgotPasswordMsg(result.message);
    } catch (error) {
      setErrorMessage(error.message || "Unable to send OTP.");
    } finally { setIsSubmitting(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage("");
    setForgotPasswordMsg("");

    if (loginMethod === "credentials") {
      if (!username.trim() || !password) {
        setErrorMessage("Please enter both user name and password.");
        return;
      }
      setIsSubmitting(true);
      try {
        await loginCustom(username.trim(), password, { vendorOnly: true });
        navigate("/", { replace: true });
      } catch (err) {
        setErrorMessage(err.message || "Invalid credentials. Please verify and try again.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Mobile OTP flow
      if (!otpSent) {
        if (!phoneNumber.trim() || phoneNumber.trim().length < 10) {
          setErrorMessage("Please enter a valid 10-digit registered mobile number.");
          return;
        }
        await requestOtp();
      } else {
        if (!otpCode.trim() || otpCode.trim().length < 4) {
          setErrorMessage("Please enter the 4 or 6-digit OTP sent to your phone.");
          return;
        }
        setIsSubmitting(true);
        try {
          const user = await loginVendorOtp(otpChallenge, otpCode.trim());
          navigate(user.landingPath, { replace: true });
        } catch (error) {
          setErrorMessage(error.message || "OTP verification failed.");
        } finally {
          setIsSubmitting(false);
        }
      }
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setForgotPasswordMsg(
      "Password reset instructions have been dispatched to the account manager, or you can contact support at support@vendorhub.com."
    );
  };

  return (
    <div className="vl-container">
      <div className="vl-layout">
        {/* LEFT SIDE: Branding, Headline, and Value Proposition */}
        <section className="vl-story">
          <div>
            <div className="vl-brand">
              <VendorHubLogo />
              <div className="vl-brand-text">
                <span className="vl-brand-title">VendorHub</span>
                <span className="vl-brand-tagline">Connect · Collaborate · Grow</span>
              </div>
            </div>

            <div className="vl-intro">
              <h1 className="vl-headline">
                Your Partner
                <span className="vl-headline-accent">in Progress</span>
              </h1>
              <p className="vl-description">
                Easily access your vendor account, manage orders, and stay connected with us — all in one place.
              </p>

              <ul className="vl-features">
                <li className="vl-feature-item">
                  <div className="vl-feature-icon-badge">
                    <Icon name="box" />
                  </div>
                  <span className="vl-feature-label">
                    Manage<br />Orders
                  </span>
                </li>
                <li className="vl-feature-item">
                  <div className="vl-feature-icon-badge">
                    <Icon name="users" />
                  </div>
                  <span className="vl-feature-label">
                    Connect<br />with Buyers
                  </span>
                </li>
                <li className="vl-feature-item">
                  <div className="vl-feature-icon-badge">
                    <Icon name="clipboardChart" />
                  </div>
                  <span className="vl-feature-label">
                    Grow<br />Your Business
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FLOATING 3D GLASS LOGISTICS TILES (Matching the scene in mockup) */}
        <div className="vl-scene-elements" aria-hidden="true">
          <svg className="vl-glowing-path" viewBox="0 0 320 380" fill="none">
            <defs>
              <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M 94 32 C 30 70, 0 120, 125 185 C 190 220, 80 250, 44 280"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray="6 6"
              filter="url(#glowEffect)"
              opacity="0.85"
            />
          </svg>

          {/* 📍 Floating Location Pin */}
          <div className="vl-glass-card pin" title="Warehouse Location">
            <Icon name="pin" />
          </div>

          {/* 🚚 Floating Truck Glass Tile */}
          <div className="vl-glass-card truck" title="Order Dispatch">
            <Icon name="truck" />
          </div>

          {/* 📊 Floating Analytics Chart Glass Tile */}
          <div className="vl-glass-card chart" title="Business Growth">
            <Icon name="chartBars" />
          </div>

          {/* 📋 Floating Checklist Glass Tile */}
          <div className="vl-glass-card checklist" title="Inventory Checklist">
            <Icon name="checklist" />
          </div>
        </div>

        {/* RIGHT SIDE: Vendor Login Card */}
        <div className="vl-card-wrap">
          <main className="vl-login-card">
            {/* Header with Circular Avatar Icon */}
            <header className="vl-card-header">
              <div className="vl-avatar-badge" aria-hidden="true">
                <Icon name="user" />
              </div>
              <h2 className="vl-card-title">Vendor Login</h2>
              <p className="vl-card-subtitle">Choose your preferred method to sign in</p>
            </header>

            {/* Segmented Tab Selector */}
            <div className="vl-tabs-container" role="tablist" aria-label="Sign-in method">
              <button
                type="button"
                role="tab"
                aria-selected={loginMethod === "credentials"}
                className={`vl-tab-btn ${loginMethod === "credentials" ? "active" : ""}`}
                onClick={() => {
                  setLoginMethod("credentials");
                  setErrorMessage("");
                }}
              >
                <Icon name="user" />
                <span>User Name & Password</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={loginMethod === "otp"}
                className={`vl-tab-btn ${loginMethod === "otp" ? "active" : ""}`}
                onClick={() => {
                  setLoginMethod("otp");
                  setErrorMessage("");
                }}
              >
                <Icon name="phone" />
                <span>Mobile OTP</span>
              </button>
            </div>

            {/* Form */}
            <form className="vl-form" onSubmit={handleSubmit} noValidate>
              {loginMethod === "credentials" ? (
                <>
                  {/* User Name Field */}
                  <div className="vl-field">
                    <label className="vl-label" htmlFor="vl-username">
                      User Name
                    </label>
                    <div className="vl-input-box">
                      <Icon name="user" className="vl-input-icon" />
                      <input
                        id="vl-username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your user name"
                        className="vl-input"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="vl-field">
                    <label className="vl-label" htmlFor="vl-password">
                      Password
                    </label>
                    <div className="vl-input-box">
                      <Icon name="lock" className="vl-input-icon" />
                      <input
                        id="vl-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="vl-input"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="vl-eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <Icon name={showPassword ? "eyeSlash" : "eye"} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Mobile OTP Fields */}
                  <div className="vl-field">
                    <label className="vl-label" htmlFor="vl-phone">
                      Mobile Number
                    </label>
                    <div className="vl-input-box">
                      <Icon name="phone" className="vl-input-icon" />
                      <input
                        id="vl-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Enter your 10-digit mobile number"
                        className="vl-input"
                        disabled={isSubmitting || otpSent}
                      />
                    </div>
                  </div>

                  {otpSent && (
                    <div className="vl-field">
                      <label className="vl-label" htmlFor="vl-otp">
                        One Time Password (OTP)
                      </label>
                      <div className="vl-input-box">
                        <Icon name="lock" className="vl-input-icon" />
                        <input
                          id="vl-otp"
                          name="otp"
                          type="text"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          maxLength={10}
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="Enter OTP code"
                          className="vl-input"
                          disabled={isSubmitting}
                          autoFocus
                        />
                      </div>
                      <div className="vl-otp-actions">
                        <button type="button" disabled={isSubmitting || resendAfter > 0} onClick={requestOtp}>{resendAfter ? `Resend OTP in ${resendAfter}s` : "Resend OTP"}</button>
                        <button type="button" disabled={isSubmitting} onClick={() => { setOtpSent(false); setOtpChallenge(""); setOtpCode(""); setResendAfter(0); setErrorMessage(""); setForgotPasswordMsg(""); }}>Change number</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Feedback messages */}
              {errorMessage && (
                <div className="vl-error-alert" role="alert">
                  <span>{errorMessage}</span>
                </div>
              )}

              {forgotPasswordMsg && (
                <div className="vl-info-alert" role="status">
                  <span>{forgotPasswordMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button type="submit" className="vl-submit-btn" disabled={isSubmitting}>
                <span>
                  {isSubmitting
                    ? "Signing in…"
                    : loginMethod === "otp" && !otpSent
                    ? "Send OTP"
                    : "Login"}
                </span>
                {!isSubmitting && <Icon name="arrowRight" />}
              </button>

              {/* Forgot Password */}
              <button type="button" className="vl-forgot-link" onClick={handleForgotPassword}>
                Forgot Password?
              </button>

              {/* OR Divider */}
              <div className="vl-divider" aria-hidden="true">
                OR
              </div>

              {/* Security trust badge footer */}
              <footer className="vl-security-footer">
                <Icon name="secureLock" />
                <span>Your information is secure with us</span>
              </footer>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
}
