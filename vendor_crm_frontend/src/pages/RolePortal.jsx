import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { layers } from "../data/layers";
import { getDesigners, getProducts, getOrders, getReturns, getSettlements, API_BASE_URL, apiFetch } from "../services/api";
import "../styles/RolePortal.css";
import Home from "./Home";

const portals = {
  admin: { title: "Admin Portal", description: "Oversee vendors, approvals and business operations.", action: ["Open Command Centre", "/command-centre"], sources: ["vendors", "products", "orders"], tasks: [["Manage employees", "Create accounts and assign workspace roles.", "/employees"], ["Review vendor accounts", "Select a vendor to inspect their business portal.", "/vendor-portal"], ["Review approvals", "Resolve approvals and operational exceptions.", "/command-centre"]] },
  merchandiser: { title: "Merchandising Portal", description: "Move vendor leads through onboarding, KYC and contracts.", action: ["Open vendor pipeline", "/vendor-crm"], sources: ["vendors"], tasks: [["Add a vendor", "Register a new business in the pipeline.", "/vendor-crm/new"], ["Review onboarding", "Follow up on KYC and unsigned contracts.", "/vendor-crm"], ["View settlements", "Follow vendor settlement progress.", "/settlement"]] },
  qa: { title: "Catalogue QA Portal", description: "Review product specifications, imagery and catalogue readiness.", action: ["Open review queue", "/catalogueqa"], sources: ["products"], tasks: [["Review submissions", "Approve products or request corrections.", "/catalogueqa"], ["Browse catalogue", "Inspect product details, variants and pricing.", "/catalogue"]] },
  inventory: { title: "Operations Portal", description: "Coordinate stock, dispatch, delivery and returns.", action: ["Open inventory", "/inventory"], sources: ["orders", "returns"], tasks: [["Manage stock", "Review available stock and inventory adjustments.", "/inventory"], ["Coordinate dispatch", "Track orders through fulfillment.", "/orders"], ["Track deliveries", "Review shipment progress.", "/delivery"], ["Process returns", "Inspect returns and update their progress.", "/returns"]] },
  finance: { title: "Finance Portal", description: "Review vendor payouts, reconciliation and financial performance.", action: ["Open settlements", "/settlement"], sources: ["settlements"], tasks: [["Review payouts", "Review settlement amounts and payment status.", "/settlement"], ["Inspect orders", "Check the orders behind vendor settlements.", "/orders"], ["View financial reports", "Explore business performance and export reports.", "/analytics"]] },
  media: { title: "Media Portal", description: "Turn vendor photography into finished product imagery.", action: ["Open Media Studio", "/media"], sources: ["media"], tasks: [["Manage creative work", "Edit originals, deliver finished images and review feedback.", "/media"]] },
};
const collection = value => Array.isArray(value) ? value : value?.results || value?.data?.results || value?.data || [];
const status = row => String(row.status || row.order_status || "").toUpperCase();
const loaders = { vendors: getDesigners, products: getProducts, orders: getOrders, returns: getReturns, settlements: getSettlements, media: async () => {
  const response = await apiFetch(`${API_BASE_URL}/products/media/`);
  if (!response.ok) throw new Error("Unable to load media work.");
  return response.json();
} };
function metrics(role, data) {
  const count = (source, predicate) => !data[source] ? null : predicate ? data[source].filter(predicate).length : data[source].length;
  const vendors = [["Vendors", count("vendors"), "/vendor-crm"], ["KYC pending", count("vendors", v => v.kyc_status === "PENDING"), "/vendor-crm"], ["Unsigned contracts", count("vendors", v => !v.contract_signed), "/vendor-crm"]];
  if (role === "merchandiser") return vendors;
  if (role === "admin") return [vendors[0], ["Active vendors", count("vendors", v => ["LIVE", "ACTIVE"].includes(v.stage)), "/vendor-crm"], ["Pending QA", count("products", p => status(p) === "PENDING_QA"), "/catalogueqa"], ["Orders", count("orders"), "/orders"]];
  if (role === "qa") return [["Pending QA", count("products", p => status(p) === "PENDING_QA"), "/catalogueqa"], ["Needs correction", count("products", p => status(p) === "CORRECTION"), "/catalogueqa"], ["Approved products", count("products", p => ["APPROVED", "LIVE"].includes(status(p))), "/catalogue"]];
  if (role === "inventory") return [["Orders", count("orders"), "/orders"], ["Open orders", count("orders", o => !["DELIVERED", "CANCELLED", "RETURNED"].includes(status(o))), "/orders"], ["Return requests", count("returns"), "/returns"]];
  if (role === "finance") return [["Settlements", count("settlements"), "/settlement"], ["Awaiting payout", count("settlements", s => ["PENDING", "APPROVED"].includes(status(s))), "/settlement"], ["Paid / reconciled", count("settlements", s => ["PAID", "RECONCILED"].includes(status(s))), "/settlement"]];
  return [["Creative jobs", count("media"), "/media"], ["In progress", count("media", m => ["QUEUED", "IN_PROGRESS", "CHANGES_REQUESTED"].includes(status(m))), "/media"], ["Vendor review", count("media", m => status(m) === "IN_REVIEW"), "/media"]];
}

export default function RolePortal() {
  const { currentUser } = useAuth();
  return currentUser?.id === "admin" ? <Home /> : <StaffPortal />;
}

function StaffPortal() {
  const { currentUser, canAccessPath, hasAccess } = useAuth();
  const role = currentUser?.id;
  const portal = portals[role];
  const [data, setData] = useState({});
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!portal) return;
    let active = true;
    setLoading(true); setData({}); setErrors([]);
    Promise.allSettled(portal.sources.map(source => loaders[source]())).then(results => {
      if (!active) return;
      const next = {}; const failed = [];
      results.forEach((result, i) => {
        const source = portal.sources[i];
        if (result.status === "fulfilled" && Array.isArray(collection(result.value))) next[source] = collection(result.value);
        else failed.push(source);
      });
      setData(next); setErrors(failed); setLoading(false);
    });
    return () => { active = false; };
  }, [portal, revision]);
  if (role === "designer") return <Navigate to="/vendor-dashboard" replace />;
  if (!portal) return <Navigate to="/login" replace />;
  return <main className={`role-portal role-portal-${role}`}>
    <header className="role-portal-header"><div><span className="role-portal-eyebrow">ZIPPY · {currentUser.shortRole.toUpperCase()}</span><h1>{portal.title}</h1><p>Welcome, {currentUser.user}. {portal.description}</p></div><Link className="role-portal-primary" to={portal.action[1]}>{portal.action[0]} →</Link></header>
    <div className="role-portal-toolbar"><span>Workspace snapshot · Current records</span><button onClick={() => setRevision(v => v + 1)} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button></div>
    {errors.length > 0 && <p className="role-portal-error" role="alert">Unable to load {errors.join(", ")}. Refresh to retry. Unavailable counts appear as —.</p>}
    <section className="role-portal-metrics" aria-label="Workspace metrics" aria-busy={loading}>{metrics(role, data).map(([label, value, path]) => <Link key={label} to={path}><span>{label}</span><strong>{loading || value === null ? "—" : value.toLocaleString("en-IN")}</strong><small>View details →</small></Link>)}</section>
    <section className="role-portal-section"><h2>Your next actions</h2><div className="role-portal-actions">{portal.tasks.filter(task => canAccessPath(task[2])).map(([title, description, path]) => <Link key={title} to={path}><h3>{title} <span aria-hidden="true">↗</span></h3><p>{description}</p></Link>)}</div></section>
    <section className="role-portal-section"><h2>Your workspaces</h2><div className="role-portal-modules">{layers.filter(layer => hasAccess(layer.n)).map(layer => <Link key={layer.n} to={layer.path}><span>{layer.group}</span><h3>{layer.name}</h3><p>{layer.blurb}</p><small>Open workspace →</small></Link>)}</div></section>
  </main>;
}
