import { useEffect, useState } from "react";
import { workspaceRequest } from "../services/vendorWorkspaces";
import "../styles/VendorWorkspaces.css";

const statuses = ["DRAFT", "REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "CANCELLED"];
const platforms = ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "YOUTUBE", "X"];
const label = (value) => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const empty = { vendor: "", title: "", platform: "INSTAGRAM", caption: "", creative_url: "", scheduled_at: "", status: "DRAFT", published_url: "" };
function localDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export default function SocialMedia() {
  const [posts, setPosts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    const [rows, brands] = await Promise.all([workspaceRequest("social-posts/"), workspaceRequest("workspace-vendors/")]);
    setPosts(rows); setVendors(brands);
  }
  useEffect(() => { load().catch((err) => setError(err.message)).finally(() => setLoading(false)); }, []);
  const change = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));
  async function save(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const payload = { ...form, vendor: Number(form.vendor), scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null };
      const post = await workspaceRequest(editing ? `social-posts/${editing}/` : "social-posts/", editing ? "PATCH" : "POST", payload);
      setPosts((previous) => [post, ...previous.filter((item) => item.id !== post.id)]);
      setForm(empty); setEditing(null); setMessage("Social media post saved.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function edit(post) {
    setEditing(post.id); setForm(Object.fromEntries(Object.keys(empty).map((key) => [key, key === "scheduled_at" ? localDate(post[key]) : post[key] || ""])));
    setMessage(""); setError("");
  }
  return <main className="vw-page">
    <header className="vw-heading"><div><span className="vw-eyebrow">14 · Marketing</span><h1>Social Media</h1><p>Plan campaigns, review creatives, and track posts for each vendor.</p></div><span className="vw-count">{posts.length} posts</span></header>
    <p className="vw-note">Manage your publishing plan here. Publish through the social platform, then add its live post link; scheduling here does not automatically publish.</p>
    {error && <p className="vw-error" role="alert">{error}</p>}{message && <p className="vw-success" role="status">{message}</p>}
    <section className="vw-card"><h2>{editing ? "Edit post" : "Create a post"}</h2>
      <form className="vw-form" onSubmit={save}><fieldset disabled={busy || loading}>
        <label>Vendor<select required value={form.vendor} onChange={change("vendor")}><option value="">Select vendor</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.brand_name} · {vendor.vendor_name}</option>)}</select></label>
        <label>Platform<select value={form.platform} onChange={change("platform")}>{platforms.map((platform) => <option key={platform}>{platform}</option>)}</select></label>
        <label className="vw-wide">Post title<input required maxLength={180} value={form.title} onChange={change("title")} /></label>
        <label className="vw-wide">Caption<textarea rows={3} value={form.caption} onChange={change("caption")} /></label>
        <label>Creative link<input type="url" placeholder="https://..." value={form.creative_url} onChange={change("creative_url")} /></label>
        <label>Planned date & time<input type="datetime-local" required={form.status === "SCHEDULED"} value={form.scheduled_at} onChange={change("scheduled_at")} /></label>
        <label>Status<select value={form.status} onChange={change("status")}>{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
        <label>Live post URL<input type="url" required={form.status === "PUBLISHED"} value={form.published_url} onChange={change("published_url")} /></label>
        <div className="vw-actions vw-wide"><button disabled={busy}>{busy ? "Saving…" : "Save post"}</button>{editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setForm(empty); }}>Cancel edit</button>}</div>
      </fieldset></form>
    </section>
    <section className="vw-card"><div className="vw-section-heading"><h2>Publishing plan</h2><label>Filter status<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label></div>
      {loading ? <p role="status">Loading posts…</p> : posts.filter((post) => !filter || post.status === filter).length === 0 ? <p className="vw-empty">No posts to show. Create your first vendor campaign above.</p> : <div className="vw-table-wrap"><table><thead><tr><th>Post / vendor</th><th>Platform</th><th>Planned date</th><th>Status</th><th>Links</th><th>Action</th></tr></thead><tbody>{posts.filter((post) => !filter || post.status === filter).map((post) => <tr key={post.id}><td><strong>{post.title}</strong><small>{post.brand_name} · {post.vendor_name}</small></td><td>{label(post.platform)}</td><td>{post.scheduled_at ? new Date(post.scheduled_at).toLocaleString() : "Not scheduled"}</td><td><span className={`vw-status ${post.status.toLowerCase()}`}>{label(post.status)}</span></td><td>{post.creative_url && <a href={post.creative_url} target="_blank" rel="noreferrer">Creative ↗</a>} {post.published_url && <a href={post.published_url} target="_blank" rel="noreferrer">Live post ↗</a>}</td><td><button className="secondary" disabled={busy} onClick={() => edit(post)}>Edit</button></td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
