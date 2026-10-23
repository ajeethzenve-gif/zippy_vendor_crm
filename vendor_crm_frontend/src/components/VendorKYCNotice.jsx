import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { workspaceRequest } from "../services/vendorWorkspaces";
import "../styles/VendorWorkspaces.css";

export default function VendorKYCNotice({ vendorId, request }) {
  const [status, setStatus] = useState(request?.status || null);
  useEffect(() => {
    if (!vendorId) return;
    let active = true;
    const check = () => workspaceRequest(`${vendorId}/kyc-submission/?status_only=1`)
      .then((data) => { if (active) setStatus(data.kyc_request?.status || null); }).catch(() => {});
    check();
    const timer = setInterval(check, 30000);
    window.addEventListener("focus", check);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", check); };
  }, [vendorId, request?.status, request?.requested_at]);
  if (status !== "REQUESTED") return null;
  return <aside className="vw-request-notice" aria-label="KYC details requested"><div><strong>Your KYC verification has started</strong><p>Please submit your PAN number, name as printed on PAN, and date of birth for verification.</p></div><Link to="/vendor-kyc-details">Submit PAN details →</Link></aside>;
}
