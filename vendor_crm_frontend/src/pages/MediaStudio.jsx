import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../services/api";
import "../styles/MediaStudio.css";

const labels = { QUEUED: "Ready for media", IN_PROGRESS: "In progress", IN_REVIEW: "Vendor review", CHANGES_REQUESTED: "Changes requested", APPROVED: "Approved" };

async function requestMedia(path, options) {
  const response = await fetch(`${API_BASE_URL}/products/${path}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || Object.values(data).flat().join(" "));
  return data;
}

function Gallery({ images, label }) {
  return <div className="media-gallery">{images.map((image, index) => <a key={image.id} href={image.image} target="_blank" rel="noreferrer">
    <img src={image.image} alt={`${label} ${index + 1}`} loading="lazy" /><span>{label} {index + 1} ↗</span>
  </a>)}</div>;
}

function MediaCard({ item, designerMode, onUpdate }) {
  const [figma, setFigma] = useState(item.figma_url);
  const [notes, setNotes] = useState(item.notes);
  const [feedback, setFeedback] = useState(item.feedback);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const locked = ["IN_REVIEW", "APPROVED"].includes(item.status);
  async function submit(action) {
    setBusy(true); setError(""); setMessage("");
    try {
      const body = new FormData();
      body.append("action", action);
      if (designerMode) body.append("feedback", feedback);
      else {
        body.append("figma_url", figma); body.append("notes", notes);
        files.forEach(file => body.append("images", file));
      }
      const updated = await requestMedia(`${item.id}/media/`, { method: "POST", body });
      setFiles([]); onUpdate(updated);
      setMessage(action === "send" ? "Sent to the vendor portal for review." : "Saved successfully.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <article className="media-card">
    <div className="media-card-heading"><div><small>{item.sku} · {item.brand}</small><h3>{item.product_name}</h3><p>{item.designer_name}</p></div><span className={`media-status media-${item.status.toLowerCase()}`}>{labels[item.status]}</span></div>
    <h4>Vendor originals · {item.originals.length} {item.originals.length === 1 ? "image" : "images"}</h4><Gallery images={item.originals} label="Original" />
    {item.feedback && <p className="media-feedback"><strong>Vendor feedback:</strong> {item.feedback}</p>}
    {(!designerMode || locked) && <><h4>Generated images · {item.assets.length}</h4>{item.assets.length ? <Gallery images={item.assets} label="Generated" /> : <p className="media-muted">Upload the images exported from Figma to prepare your delivery.</p>}</>}
    {designerMode ? <>
      {item.figma_url && <a href={item.figma_url} target="_blank" rel="noreferrer">Open Figma file ↗</a>}
      {item.notes && <p>{item.notes}</p>}
      {item.status === "IN_REVIEW" && <><label>Feedback<textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Describe any changes you need" maxLength={10000} /></label><div className="media-actions"><button disabled={busy} onClick={() => submit("approve")}>Approve images</button><button className="secondary" disabled={busy || !feedback.trim()} onClick={() => submit("changes")}>Request changes</button></div></>}
      {item.status === "CHANGES_REQUESTED" && <p>The media team is updating your images. The next delivery will appear here when sent.</p>}
    </> : <fieldset disabled={busy || locked}>
      <label>Figma file link<input type="url" value={figma} onChange={e => setFigma(e.target.value)} placeholder="https://www.figma.com/design/..." /></label>
      {item.figma_url && <a href={item.figma_url} target="_blank" rel="noreferrer">Open saved Figma file ↗</a>}
      <label>Generated images<input key={`${item.assets.map(a => a.id).join('-')}-${item.status}`} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { const selected = Array.from(e.target.files); if (selected.length > 12 || selected.some(f => f.size > 10 * 1024 * 1024)) { setError("Choose up to 12 images, no more than 10 MB each."); e.target.value = ""; setFiles([]); } else { setFiles(selected); setError(""); } }} /></label>
      <small>JPG, PNG or WebP · up to 12 images · 10 MB each. A new upload replaces the current generated set.</small>
      {files.length > 0 && <p>{files.length} selected: {files.map(f => f.name).join(", ")}</p>}
      <label>Message to vendor<textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={10000} placeholder="Explain the creative direction or any details to review" /></label>
      <div className="media-actions"><button className="secondary" onClick={() => submit("save")}>Save work</button><button disabled={busy || locked || (!files.length && !item.assets.length)} onClick={() => submit("send")}>Send to vendor</button></div>
    </fieldset>}
    {busy && <p role="status">Saving images…</p>}{error && <p className="media-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </article>;
}

export function MediaWorkspace({ designerId }) {
  const designerMode = designerId !== undefined;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setItems([]); setLoading(true); setError("");
    if (designerMode && !designerId) { setLoading(false); return; }
    requestMedia(`media/${designerMode ? `?vendor=${encodeURIComponent(designerId)}` : ""}`)
      .then(data => { if (active) setItems(data); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [designerId, designerMode, refresh]);
  const visible = items.filter(item => (!filter || item.status === filter) && `${item.product_name} ${item.sku} ${item.brand}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="media-workspace">
    <div className="media-card-heading"><div><h2>{designerMode ? "Images from the media team" : "Product media queue"}</h2><p>{designerMode ? "Review generated images, approve them, or send feedback." : "1–4 originals → Figma creative work → Generated images → Vendor review"}</p></div><button className="secondary" disabled={loading} onClick={() => setRefresh(n => n + 1)}>Refresh</button></div>
    {!designerMode && <div className="media-stats">{Object.entries(labels).map(([status, label]) => <button key={status} className={filter === status ? "selected" : ""} onClick={() => setFilter(filter === status ? "" : status)}><strong>{items.filter(i => i.status === status).length}</strong>{label}</button>)}</div>}
    <div className="media-toolbar"><input aria-label="Search media products" placeholder="Search product, SKU or brand" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Media status" value={filter} onChange={e => setFilter(e.target.value)}><option value="">All statuses</option>{Object.entries(labels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></div>
    {loading ? <p role="status">Loading media…</p> : error ? <p className="media-error" role="alert">{error} Use Refresh to retry.</p> : !visible.length ? <div className="media-empty">{items.length ? "No products match these filters." : designerMode ? "No media deliveries yet. Images sent by the media team will appear here." : "Products will appear here once a vendor uploads 1 to 4 original images."}</div> : visible.map(item => <MediaCard key={`${designerId || 'team'}-${item.id}`} item={item} designerMode={designerMode} onUpdate={updated => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))} />)}
  </section>;
}

export default function MediaStudio() {
  return <main className="media-page"><nav><Link to="/">← All layers</Link><Link to="/login">Switch role</Link></nav><header><small>LAYER 13 · CREATIVE OPERATIONS</small><h1>Media Studio</h1><p>Turn vendor product photography into finished brand imagery.</p></header><MediaWorkspace /></main>;
}
