import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginLanding from "../components/LoginLanding";

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
  const { loginCustom, loginVendorOtp, sendVendorOtp } = useAuth();
  const navigate = useNavigate();

  const [loginMethod, setLoginMethod] = useState("credentials");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const OTP_LENGTH = 6;
  const [otpCode, setOtpCode] = useState("");
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(""));
  const otpInputRefs = useRef([]);
  const [otpSent, setOtpSent] = useState(false);
  const [otpChallenge, setOtpChallenge] = useState("");
  const [resendAfter, setResendAfter] = useState(0);
  useEffect(() => {
    if (!resendAfter) return;
    const timer = setTimeout(() => setResendAfter(previous => Math.max(0, previous - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendAfter]);

  useEffect(() => {
    if (otpSent && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 60);
    }
  }, [otpSent]);

  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const newDigits = [...otpDigits];
      newDigits[index] = "";
      setOtpDigits(newDigits);
      setOtpCode(newDigits.join(""));
      return;
    }

    if (cleaned.length > 1) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < cleaned.length && index + i < OTP_LENGTH; i++) {
        newDigits[index + i] = cleaned[i];
      }
      setOtpDigits(newDigits);
      setOtpCode(newDigits.join(""));
      const nextFocus = Math.min(index + cleaned.length, OTP_LENGTH - 1);
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleaned[cleaned.length - 1];
    setOtpDigits(newDigits);
    setOtpCode(newDigits.join(""));

    if (index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = "";
        setOtpDigits(newDigits);
        setOtpCode(newDigits.join(""));
        otpInputRefs.current[index - 1]?.focus();
        e.preventDefault();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = "";
        setOtpDigits(newDigits);
        setOtpCode(newDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newDigits = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    setOtpCode(newDigits.join(""));
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpInputRefs.current[focusIndex]?.focus();
  };

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState("");

  const requestOtp = async () => {
    if (isSubmitting || resendAfter) return;
    setIsSubmitting(true); setErrorMessage(""); setForgotPasswordMsg("");
    try {
      const result = loginMethod === "mobile"
        ? await sendVendorOtp(phoneNumber.trim())
        : await loginCustom(username.trim(), password, { vendorOnly: true });
      setOtpChallenge(result.challenge);
      setOtpCode("");
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setOtpSent(true);
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

    if (!otpSent) {
      if (loginMethod === "mobile" && !/^\+?[\d ()-]{10,20}$/.test(phoneNumber.trim())) {
        setErrorMessage("Enter your registered mobile number.");
        return;
      }
      if (loginMethod === "credentials" && (!username.trim() || !password)) {
        setErrorMessage("Please enter your username and password.");
        return;
      }
      await requestOtp();
      return;
    }
    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== OTP_LENGTH) {
      setErrorMessage(`Enter the complete ${OTP_LENGTH}-digit OTP code.`);
      const firstEmpty = otpDigits.findIndex(d => !d);
      if (firstEmpty !== -1) {
        otpInputRefs.current[firstEmpty]?.focus();
      }
      return;
    }
    setIsSubmitting(true);
    try {
      const user = await loginVendorOtp(otpChallenge, fullOtp);
      setPassword("");
      navigate(user.landingPath, { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "OTP verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setForgotPasswordMsg(
      "Contact your account manager to reset your password."
    );
  };

  return <LoginLanding audience="vendor">
            <div className="vl-tabs-container" role="tablist" aria-label="Sign-in method">
              {[["credentials", "user", "User Name & Password"], ["mobile", "phone", "Mobile OTP"]].map(([method, icon, label]) => (
                <button key={method} type="button" role="tab" aria-selected={loginMethod === method}
                  className={`vl-tab-btn ${loginMethod === method ? "active" : ""}`} disabled={isSubmitting}
                  onClick={() => { setLoginMethod(method); setOtpSent(false); setOtpChallenge(""); setOtpCode(""); setOtpDigits(Array(OTP_LENGTH).fill("")); setErrorMessage(""); setForgotPasswordMsg(""); }}>
                  <Icon name={icon} /><span>{label}</span>
                </button>
              ))}
            </div>
            {/* Form */}
            <form className="vl-form" onSubmit={handleSubmit} noValidate>
              {!otpSent && loginMethod === "mobile" && (
                <div className="vl-field">
                  <label className="vl-label" htmlFor="vl-phone">Registered mobile number</label>
                  <div className={`vl-input-box ${errorMessage ? "has-error" : ""}`}>
                    <Icon name="phone" className="vl-input-icon" />
                    <input id="vl-phone" name="phone" type="tel" autoComplete="tel" required
                      value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)}
                      placeholder="Enter your registered mobile number" className="vl-input" disabled={isSubmitting} />
                  </div>
                </div>
              )}
              {!otpSent && loginMethod === "credentials" ? (
                <>
                  {/* User Name Field */}
                  <div className="vl-field">
                    <label className="vl-label" htmlFor="vl-username">
                      User Name
                    </label>
                    <div className={`vl-input-box ${errorMessage ? "has-error" : ""}`}>
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
                    <div className={`vl-input-box ${errorMessage ? "has-error" : ""}`}>
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
                  {otpSent && (
                    <div className="vl-field">
                      <div className="vl-otp-header">
                        <label className="vl-label" htmlFor="vl-otp-0">
                          Enter 6-Digit OTP Code
                        </label>
                        <span className="vl-otp-subtitle">
                          Sent to {phoneNumber ? `+${phoneNumber.replace(/\D/g, "").replace(/^91/, "+91 ")}` : "your registered number"}
                        </span>
                      </div>

                      <div className="vl-otp-container" role="group" aria-label="One Time Password boxes">
                        {otpDigits.map((digit, index) => (
                          <input
                            key={index}
                            id={`vl-otp-${index}`}
                            ref={(el) => (otpInputRefs.current[index] = el)}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={1}
                            autoComplete={index === 0 ? "one-time-code" : "off"}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            onPaste={handleOtpPaste}
                            onFocus={(e) => e.target.select()}
                            className={`vl-otp-box ${digit ? "is-filled" : ""} ${errorMessage ? "has-error" : ""}`}
                            disabled={isSubmitting}
                            aria-label={`Digit ${index + 1} of 6`}
                          />
                        ))}
                      </div>

                      <div className="vl-otp-actions">
                        <button type="button" disabled={isSubmitting || resendAfter > 0} onClick={requestOtp}>
                          {resendAfter ? `Resend OTP in ${resendAfter}s` : "Resend OTP"}
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => {
                            setOtpSent(false);
                            setOtpChallenge("");
                            setOtpCode("");
                            setOtpDigits(Array(OTP_LENGTH).fill(""));
                            setResendAfter(0);
                            setErrorMessage("");
                            setForgotPasswordMsg("");
                          }}
                        >
                          {loginMethod === "mobile" ? "Change number" : "Change credentials"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Feedback messages */}
              {errorMessage && (
                <div className="vl-error-alert" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              {forgotPasswordMsg && (
                <div className="vl-info-alert" role="status">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  <span>{forgotPasswordMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button type="submit" className="vl-submit-btn" disabled={isSubmitting}>
                <span>
                  {isSubmitting
                    ? "Signing in…"
                    : !otpSent
                    ? (loginMethod === "mobile" ? "Send OTP Code" : "Sign In to Vendor Portal")
                    : "Verify OTP & Continue"}
                </span>
                {!isSubmitting && <Icon name="arrowRight" />}
              </button>

              {/* Forgot Password */}
              <button type="button" className="vl-forgot-link" onClick={handleForgotPassword}>
                Forgot Password?
              </button>

            </form>
  </LoginLanding>;
}
