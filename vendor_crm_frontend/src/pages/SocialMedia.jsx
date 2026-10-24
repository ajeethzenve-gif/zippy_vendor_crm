import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { workspaceRequest } from "../services/vendorWorkspaces";
import { showSuccessToast, showErrorToast } from "../utils/zenveToast";
import Swal from "sweetalert2";
import "../styles/SocialMedia.css";

/* =========================================================
   PLATFORMS & STATUS CONFIGURATION
   ========================================================= */

const PLATFORMS = [
  { id: "INSTAGRAM", name: "Instagram", color: "#E1306C", icon: "instagram" },
  { id: "FACEBOOK", name: "Facebook", color: "#1877F2", icon: "facebook" },
  { id: "LINKEDIN", name: "LinkedIn", color: "#0A66C2", icon: "linkedin" },
  { id: "YOUTUBE", name: "YouTube", color: "#FF0000", icon: "youtube" },
  { id: "X", name: "X (Twitter)", color: "#0f172a", icon: "x" },
];

const STATUSES = [
  { id: "DRAFT", label: "Draft", desc: "Initial copy & concept drafting" },
  { id: "REVIEW", label: "In Review", desc: "Vendor & creative lead review" },
  { id: "APPROVED", label: "Approved", desc: "Creative signed-off and ready" },
  { id: "SCHEDULED", label: "Scheduled", desc: "Planned for specific release" },
  { id: "PUBLISHED", label: "Published", desc: "Live on platform with URL" },
  { id: "CANCELLED", label: "Cancelled", desc: "Campaign post shelved" },
];

const CAMPAIGN_TEMPLATES = [
  {
    name: "🌟 New Collection Drop",
    platform: "INSTAGRAM",
    title: "Festive Winter Collection Drop",
    caption: "Introducing our handcrafted winter collection for pets. Tailored with pure organic wool, breathable lining, and unmatched comfort. Available exclusively on Zenve. ✨\n\n#ZenveFashion #PetAtelier #WinterDrop #LuxuryPetWear #ArtisanCrafted",
    creative_url: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=900&auto=format&fit=crop",
  },
  {
    name: "🐾 Designer Spotlight",
    platform: "LINKEDIN",
    title: "Meet the Designer: Artisan Precision & Craft",
    caption: "Behind every bespoke stitch is an artisan's passion. Discover how our partner ateliers merge ethical manufacturing with haute couture design for companion pets.\n\n#ZenveSpotlight #DesignerFashion #PetLuxury #MadeInIndia #SupplyChainInnovation",
    creative_url: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=900&auto=format&fit=crop",
  },
  {
    name: "⚡ Limited Edition Flash Sale",
    platform: "X",
    title: "Exclusive Flash Drop: 50 Pieces Only",
    caption: "The Limited Edition Velvet Harness drop is live. Hand-stitched with brass hardware. Only 50 units crafted for this season. Claim yours now! 🚀\n\n#FlashDrop #ZenveDrop #PetStyle #Bespoke",
    creative_url: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=900&auto=format&fit=crop",
  },
  {
    name: "🧵 Atelier Behind-the-Scenes",
    platform: "INSTAGRAM",
    title: "Atelier Process: From Sketch to Runway",
    caption: "From raw fabric sketches to final inspection. A rare glimpse into our design studio making pets look effortlessly iconic. 🐾\n\n#BehindTheScenes #AtelierCraft #ZenvePets #HandmadeFashion #PetCouture",
    creative_url: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=900&auto=format&fit=crop",
  },
];

const PRESET_HASHTAGS = [
  "#ZenveFashion",
  "#PetAtelier",
  "#LuxuryPetWear",
  "#HandcraftedInIndia",
  "#FestiveDrop",
  "#DesignerApparel",
  "#BespokePets",
  "#SustainableStyle",
];

const EMPTY_FORM = {
  vendor: "",
  title: "",
  platform: "INSTAGRAM",
  caption: "",
  creative_url: "",
  scheduled_at: "",
  status: "DRAFT",
  published_url: "",
};

/* =========================================================
   DATE HELPERS
   ========================================================= */

function toLocalInputDate(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  } catch {
    return "";
  }
}

function formatDisplayDate(isoString) {
  if (!isoString) return "Not scheduled";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Not scheduled";
    return d.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Not scheduled";
  }
}

function getRelativeScheduleHint(isoString) {
  if (!isoString) return { text: "Unscheduled", isSoon: false };
  try {
    const target = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = target - now;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      const pastHours = Math.abs(diffHours);
      if (pastHours < 24) return { text: `${pastHours}h ago`, isSoon: false };
      return { text: `${Math.abs(diffDays)}d ago`, isSoon: false };
    }
    if (diffHours < 24) {
      return { text: `In ${Math.max(1, diffHours)}h`, isSoon: true };
    }
    if (diffDays === 1) return { text: "Tomorrow", isSoon: true };
    return { text: `In ${diffDays} days`, isSoon: diffDays <= 3 };
  } catch {
    return { text: "Unscheduled", isSoon: false };
  }
}

/* =========================================================
   SVG ICONS
   ========================================================= */

function PlatformIcon({ platform, size = 16 }) {
  const p = String(platform || "").toUpperCase();
  if (p === "INSTAGRAM") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    );
  }
  if (p === "FACEBOOK") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  }
  if (p === "LINKEDIN") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    );
  }
  if (p === "YOUTUBE") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" />
      </svg>
    );
  }
  // Default to X
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/* =========================================================
   CAPTION WITH HIGHLIGHTED HASHTAGS
   ========================================================= */

function HighlightedCaption({ text }) {
  if (!text) return <span className="sm-caption-empty">No caption draft entered.</span>;
  const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith("#")) {
          return (
            <span key={idx} className="sm-hashtag">
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

/* =========================================================
   MAIN SOCIAL MEDIA LAYER COMPONENT
   ========================================================= */

export default function SocialMedia() {
  const { getLayerDisplayNum, currentUser } = useAuth();

  // Primary data states
  const [posts, setPosts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Filters & display states
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("created_desc");
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table' | 'simulator'
  const [showGuidelines, setShowGuidelines] = useState(false);

  // Form & modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  // Lightbox & simulator states
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [simulatorSelectedId, setSimulatorSelectedId] = useState(null);
  const [simulatorChannel, setSimulatorChannel] = useState("INSTAGRAM");
  const [copiedId, setCopiedId] = useState(null);

  /* -------------------------------------------------------
     FETCH DATA FROM BACKEND
  ------------------------------------------------------- */
  async function loadData(isManual = false) {
    if (isManual) setRefreshing(true);
    setError("");
    try {
      const [postList, vendorList] = await Promise.all([
        workspaceRequest("social-posts/"),
        workspaceRequest("workspace-vendors/"),
      ]);
      setPosts(postList || []);
      setVendors(vendorList || []);
      if (postList?.length && !simulatorSelectedId) {
        setSimulatorSelectedId(postList[0].id);
      }
    } catch (err) {
      console.error("Failed to load social posts:", err);
      setError(err.message || "Failed to connect to backend server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  /* -------------------------------------------------------
     FILTERED & SORTED POSTS
  ------------------------------------------------------- */
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Status filter
    if (statusFilter) {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Platform filter
    if (platformFilter) {
      result = result.filter((p) => p.platform === platformFilter);
    }

    // Vendor filter
    if (vendorFilter) {
      result = result.filter((p) => String(p.vendor) === String(vendorFilter));
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.caption?.toLowerCase().includes(q) ||
          p.brand_name?.toLowerCase().includes(q) ||
          p.vendor_name?.toLowerCase().includes(q) ||
          p.platform?.toLowerCase().includes(q)
      );
    }

    // Sort order
    result.sort((a, b) => {
      if (sortBy === "scheduled_asc") {
        const timeA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity;
        const timeB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity;
        return timeA - timeB;
      }
      if (sortBy === "scheduled_desc") {
        const timeA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : -Infinity;
        const timeB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : -Infinity;
        return timeB - timeA;
      }
      if (sortBy === "brand_asc") {
        return (a.brand_name || "").localeCompare(b.brand_name || "");
      }
      // default: created_desc
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    return result;
  }, [posts, statusFilter, platformFilter, vendorFilter, searchQuery, sortBy]);

  /* -------------------------------------------------------
     KPI METRICS
  ------------------------------------------------------- */
  const kpiData = useMemo(() => {
    const total = posts.length;
    const scheduled = posts.filter((p) => p.status === "SCHEDULED").length;
    const inReview = posts.filter((p) => ["DRAFT", "REVIEW"].includes(p.status)).length;
    const published = posts.filter((p) => p.status === "PUBLISHED").length;
    const uniqueVendors = new Set(posts.map((p) => p.vendor)).size;

    return { total, scheduled, inReview, published, uniqueVendors };
  }, [posts]);

  /* -------------------------------------------------------
     CHANNEL COUNTS
  ------------------------------------------------------- */
  const channelCounts = useMemo(() => {
    const map = {};
    PLATFORMS.forEach((plat) => {
      map[plat.id] = posts.filter((p) => p.platform === plat.id).length;
    });
    return map;
  }, [posts]);

  /* -------------------------------------------------------
     STATUS COUNTS
  ------------------------------------------------------- */
  const statusCounts = useMemo(() => {
    const map = {};
    STATUSES.forEach((st) => {
      map[st.id] = posts.filter((p) => p.status === st.id).length;
    });
    return map;
  }, [posts]);

  /* -------------------------------------------------------
     SIMULATOR ACTIVE POST
  ------------------------------------------------------- */
  const activeSimulatorPost = useMemo(() => {
    return (
      posts.find((p) => p.id === simulatorSelectedId) ||
      filteredPosts[0] ||
      posts[0] ||
      null
    );
  }, [posts, filteredPosts, simulatorSelectedId]);

  /* -------------------------------------------------------
     FORM HANDLERS
  ------------------------------------------------------- */
  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      vendor: vendors[0]?.id ? String(vendors[0].id) : "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (post) => {
    setEditingId(post.id);
    setForm({
      vendor: post.vendor ? String(post.vendor) : "",
      title: post.title || "",
      platform: post.platform || "INSTAGRAM",
      caption: post.caption || "",
      creative_url: post.creative_url || "",
      scheduled_at: toLocalInputDate(post.scheduled_at),
      status: post.status || "DRAFT",
      published_url: post.published_url || "",
    });
    setIsModalOpen(true);
  };

  const handleApplyTemplate = (tmpl) => {
    setForm((prev) => ({
      ...prev,
      platform: tmpl.platform,
      title: tmpl.title,
      caption: tmpl.caption,
      creative_url: tmpl.creative_url,
    }));
    showSuccessToast(`Applied "${tmpl.name}" template copy.`);
  };

  const handleAppendHashtag = (tag) => {
    setForm((prev) => {
      const current = prev.caption ? prev.caption.trim() : "";
      if (current.includes(tag)) return prev;
      return {
        ...prev,
        caption: current ? `${current} ${tag}` : tag,
      };
    });
  };

  const handlePresetDate = (hoursFromNow) => {
    const d = new Date(Date.now() + hoursFromNow * 3600000);
    setForm((prev) => ({
      ...prev,
      scheduled_at: toLocalInputDate(d.toISOString()),
      status: prev.status === "DRAFT" ? "SCHEDULED" : prev.status,
    }));
  };

  async function handleSavePost(e) {
    e.preventDefault();
    if (busy) return;

    if (!form.vendor) {
      showErrorToast("Please select a vendor partner for this campaign.");
      return;
    }
    if (!form.title.trim()) {
      showErrorToast("Please enter a campaign title.");
      return;
    }
    if (form.status === "SCHEDULED" && !form.scheduled_at) {
      showErrorToast("Please set a planned release date & time before scheduling.");
      return;
    }
    if (form.status === "PUBLISHED" && !form.published_url.trim()) {
      showErrorToast("Please add the live post URL before marking as published.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        vendor: Number(form.vendor),
        title: form.title.trim(),
        platform: form.platform,
        caption: form.caption.trim(),
        creative_url: form.creative_url.trim(),
        scheduled_at: form.scheduled_at
          ? new Date(form.scheduled_at).toISOString()
          : null,
        status: form.status,
        published_url: form.published_url.trim(),
      };

      const path = editingId ? `social-posts/${editingId}/` : "social-posts/";
      const method = editingId ? "PATCH" : "POST";

      const saved = await workspaceRequest(path, method, payload);

      if (editingId) {
        setPosts((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
        showSuccessToast(`Updated "${saved.title}" successfully.`);
      } else {
        setPosts((prev) => [saved, ...prev]);
        showSuccessToast(`Created new campaign "${saved.title}".`);
      }

      setIsModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      showErrorToast(err.message || "Failed to save campaign post.");
    } finally {
      setBusy(false);
    }
  }

  /* -------------------------------------------------------
     QUICK ACTIONS (STATUS ADVANCE, DUPLICATE, DELETE)
  ------------------------------------------------------- */
  const handleQuickAdvance = async (post) => {
    const nextStatusMap = {
      DRAFT: "REVIEW",
      REVIEW: "APPROVED",
      APPROVED: "SCHEDULED",
      SCHEDULED: "PUBLISHED",
    };

    const next = nextStatusMap[post.status];
    if (!next) return;

    if (next === "SCHEDULED" && !post.scheduled_at) {
      // Prompt user to set schedule via edit modal
      handleOpenEdit(post);
      showErrorToast("Set a planned release date and time to schedule this post.");
      return;
    }

    if (next === "PUBLISHED" && !post.published_url) {
      // Prompt with Swal for URL
      const { value: url } = await Swal.fire({
        title: "Mark Campaign as Published",
        input: "url",
        inputLabel: "Live Post URL on " + post.platform,
        inputPlaceholder: "https://www.instagram.com/p/...",
        showCancelButton: true,
        confirmButtonColor: "#1677ff",
        confirmButtonText: "Confirm & Publish",
        inputValidator: (val) => {
          if (!val) return "You must provide the live URL!";
        },
      });

      if (!url) return;

      try {
        const updated = await workspaceRequest(`social-posts/${post.id}/`, "PATCH", {
          status: "PUBLISHED",
          published_url: url,
        });
        setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showSuccessToast("Campaign marked as published!");
      } catch (err) {
        showErrorToast(err.message);
      }
      return;
    }

    try {
      const updated = await workspaceRequest(`social-posts/${post.id}/`, "PATCH", {
        status: next,
      });
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showSuccessToast(`Advanced status to ${next}!`);
    } catch (err) {
      showErrorToast(err.message);
    }
  };

  const handleDuplicate = async (post) => {
    try {
      const payload = {
        vendor: post.vendor,
        title: `${post.title} (Copy)`,
        platform: post.platform,
        caption: post.caption,
        creative_url: post.creative_url,
        scheduled_at: null,
        status: "DRAFT",
        published_url: "",
      };
      const duplicated = await workspaceRequest("social-posts/", "POST", payload);
      setPosts((prev) => [duplicated, ...prev]);
      showSuccessToast("Duplicated campaign as draft.");
    } catch (err) {
      showErrorToast(err.message);
    }
  };

  const handleDelete = async (post) => {
    const result = await Swal.fire({
      title: "Delete Campaign Post?",
      text: `Are you sure you want to delete "${post.title}"? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete",
    });

    if (!result.isConfirmed) return;

    try {
      await workspaceRequest(`social-posts/${post.id}/`, "DELETE");
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      showSuccessToast("Campaign deleted.");
    } catch (err) {
      showErrorToast(err.message || "Failed to delete post.");
    }
  };

  const handleCopyCaption = (post) => {
    const content = `${post.title}\n\n${post.caption}`;
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(post.id);
      showSuccessToast("Caption & hashtags copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  /* =======================================================
     RENDER MAIN VIEW
     ======================================================= */
  return (
    <div className="sm-page">
      {/* =====================================================
          HEADER SECTION
      ===================================================== */}
      <header className="sm-header">
        <div className="sm-header-copy">
          <div className="sm-layer-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 11 18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
            <span>{getLayerDisplayNum("14")} · Marketing Operations</span>
          </div>

          <h1 className="sm-title">Social Media & Campaigns</h1>
          <p className="sm-subtitle">
            Coordinate brand promotions, review marketing creative assets, schedule multi-channel releases, and track verified live post engagement.
          </p>
        </div>

        <div className="sm-header-actions">
          <button
            type="button"
            className={`sm-btn-refresh ${refreshing ? "is-spinning" : ""}`}
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            title="Refresh social media data"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            <span>{refreshing ? "Syncing…" : "Refresh"}</span>
          </button>

          <button
            type="button"
            className="sm-btn-secondary"
            onClick={() => setShowGuidelines(!showGuidelines)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span>{showGuidelines ? "Hide Specs" : "Channel Specs"}</span>
          </button>

          <button
            type="button"
            className="sm-btn-primary"
            onClick={handleOpenCreate}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Campaign Post</span>
          </button>
        </div>
      </header>

      {/* =====================================================
          TOP 4 KPI SUMMARY CARDS
      ===================================================== */}
      <section className="sm-kpi-grid">
        <div
          className={`sm-kpi-card ${!statusFilter ? "active" : ""}`}
          onClick={() => setStatusFilter("")}
          title="Click to view all campaigns"
        >
          <div className="sm-kpi-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 11 18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
          </div>
          <div className="sm-kpi-body">
            <span className="sm-kpi-val">{kpiData.total}</span>
            <span className="sm-kpi-label">Total Campaigns</span>
            <span className="sm-kpi-sub">Across {kpiData.uniqueVendors} brand partners</span>
          </div>
        </div>

        <div
          className={`sm-kpi-card ${statusFilter === "SCHEDULED" ? "active" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "SCHEDULED" ? "" : "SCHEDULED")}
          title="Click to filter scheduled releases"
        >
          <div className="sm-kpi-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="sm-kpi-body">
            <span className="sm-kpi-val">{kpiData.scheduled}</span>
            <span className="sm-kpi-label">Scheduled Queue</span>
            <span className="sm-kpi-sub">Upcoming posts queued for release</span>
          </div>
        </div>

        <div
          className={`sm-kpi-card ${statusFilter === "REVIEW" ? "active" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "REVIEW" ? "" : "REVIEW")}
          title="Click to filter creative reviews"
        >
          <div className="sm-kpi-icon amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="sm-kpi-body">
            <span className="sm-kpi-val">{kpiData.inReview}</span>
            <span className="sm-kpi-label">Review Pipeline</span>
            <span className="sm-kpi-sub">Drafts & creative checks pending</span>
          </div>
        </div>

        <div
          className={`sm-kpi-card ${statusFilter === "PUBLISHED" ? "active" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "PUBLISHED" ? "" : "PUBLISHED")}
          title="Click to filter published live campaigns"
        >
          <div className="sm-kpi-icon emerald">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="sm-kpi-body">
            <span className="sm-kpi-val">{kpiData.published}</span>
            <span className="sm-kpi-label">Published & Live</span>
            <span className="sm-kpi-sub">Active campaigns driving store reach</span>
          </div>
        </div>
      </section>

      {/* =====================================================
          MULTI-CHANNEL PLATFORM SELECTOR BAR
      ===================================================== */}
      <div className="sm-channel-bar">
        <span className="sm-channel-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          Platform:
        </span>

        <button
          type="button"
          className={`sm-channel-btn ${!platformFilter ? "active" : ""}`}
          onClick={() => setPlatformFilter("")}
        >
          <span>All Channels</span>
          <span className="sm-channel-count">{posts.length}</span>
        </button>

        {PLATFORMS.map((plat) => {
          const count = channelCounts[plat.id] || 0;
          const isActive = platformFilter === plat.id;
          return (
            <button
              key={plat.id}
              type="button"
              className={`sm-channel-btn ${plat.icon} ${isActive ? "active" : ""}`}
              onClick={() => setPlatformFilter(isActive ? "" : plat.id)}
            >
              <PlatformIcon platform={plat.id} size={15} />
              <span>{plat.name}</span>
              <span className="sm-channel-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================
          MARKETING GUIDELINE & SPECS BANNER (Collapsible)
      ===================================================== */}
      {showGuidelines && (
        <section className="sm-guide-banner">
          <div className="sm-guide-header" onClick={() => setShowGuidelines(false)}>
            <div className="sm-guide-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span>Creative Specs & Editorial Governance</span>
            </div>
            <span className="sm-guide-toggle">Close ✕</span>
          </div>

          <div className="sm-guide-body">
            <div className="sm-guide-item">
              <strong>📸 Instagram (1080 × 1350 px)</strong>
              Use portrait 4:5 ratio for maximum feed vertical impact. Place primary product in top 60% and include 3–5 curated tags.
            </div>
            <div className="sm-guide-item">
              <strong>💼 LinkedIn (1200 × 627 px)</strong>
              Focus on brand provenance, artisan mastery, and ethical materials. Tone should reflect luxury craftsmanship.
            </div>
            <div className="sm-guide-item">
              <strong>⚡ X / Twitter (1200 × 675 px)</strong>
              Crisp 16:9 imagery with punchy copy under 240 chars. Best for flash drops, exclusive collection announcements, and customer reposts.
            </div>
            <div className="sm-guide-item">
              <strong>🚀 Publishing Workflow</strong>
              Draft copy & creative → Mark for Review → Approve → Schedule → Publish natively on platform → Paste live link here to record verification.
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          CONTROLS, STATUS TABS & SEARCH BAR
      ===================================================== */}
      <section className="sm-controls-card">
        {/* Status segmented navigation tabs */}
        <div className="sm-status-tabs">
          <button
            type="button"
            className={`sm-status-tab ${!statusFilter ? "active" : ""}`}
            onClick={() => setStatusFilter("")}
          >
            <span>All Posts</span>
            <span className="sm-tab-badge">{posts.length}</span>
          </button>

          {STATUSES.map((st) => (
            <button
              key={st.id}
              type="button"
              className={`sm-status-tab ${statusFilter === st.id ? "active" : ""}`}
              onClick={() => setStatusFilter(st.id)}
            >
              <span>{st.label}</span>
              <span className="sm-tab-badge">{statusCounts[st.id] || 0}</span>
            </button>
          ))}
        </div>

        {/* Filter controls row */}
        <div className="sm-filter-row">
          <div className="sm-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search campaigns, captions, brands, hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sm-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="sm-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="sm-filter-dropdowns">
            {/* Vendor filter dropdown */}
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="sm-select"
              aria-label="Filter by vendor"
            >
              <option value="">All Vendors & Brands</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand_name || v.vendor_name}
                </option>
              ))}
            </select>

            {/* Sort order dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sm-select"
              aria-label="Sort order"
            >
              <option value="created_desc">Newest Created</option>
              <option value="scheduled_asc">Soonest Scheduled</option>
              <option value="scheduled_desc">Latest Scheduled</option>
              <option value="brand_asc">Brand Name (A-Z)</option>
            </select>

            {/* View mode toggle */}
            <div className="sm-view-switcher" role="group" aria-label="View format">
              <button
                type="button"
                className={`sm-view-btn ${viewMode === "cards" ? "active" : ""}`}
                onClick={() => setViewMode("cards")}
                title="Feed Cards View"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <span>Cards</span>
              </button>

              <button
                type="button"
                className={`sm-view-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Editorial Table View"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <span>Table</span>
              </button>

              <button
                type="button"
                className={`sm-view-btn ${viewMode === "simulator" ? "active" : ""}`}
                onClick={() => setViewMode("simulator")}
                title="Live Mobile Feed Mockup"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <span>Mockup</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          MAIN CONTENT AREA BASED ON VIEW MODE
      ===================================================== */}
      {loading ? (
        <div className="sm-empty-state">
          <div className="sm-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm-btn-refresh is-spinning">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </div>
          <h3 className="sm-empty-title">Loading Social Media Ledger…</h3>
          <p className="sm-empty-desc">Connecting to live campaign registry…</p>
        </div>
      ) : error ? (
        <div className="sm-empty-state">
          <div className="sm-empty-icon" style={{ background: "#fef2f2", color: "#dc2626" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="sm-empty-title">Failed to load campaigns</h3>
          <p className="sm-empty-desc">{error}</p>
          <button type="button" className="sm-btn-primary" onClick={() => loadData(true)}>
            Retry Connection
          </button>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="sm-empty-state">
          <div className="sm-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 11 18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
          </div>
          <h3 className="sm-empty-title">No campaigns match your filters</h3>
          <p className="sm-empty-desc">
            {posts.length === 0
              ? "No social media campaign posts have been created yet. Launch your first brand campaign above!"
              : "Try adjusting your status tab, platform selection, or search query."}
          </p>
          {posts.length === 0 ? (
            <button type="button" className="sm-btn-primary" onClick={handleOpenCreate}>
              + Create First Campaign Post
            </button>
          ) : (
            <button
              type="button"
              className="sm-btn-secondary"
              onClick={() => {
                setStatusFilter("");
                setPlatformFilter("");
                setVendorFilter("");
                setSearchQuery("");
              }}
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : viewMode === "cards" ? (
        /* =====================================================
           VIEW 1: CARDS GRID VIEW
        ===================================================== */
        <div className="sm-cards-grid">
          {filteredPosts.map((post) => {
            const relHint = getRelativeScheduleHint(post.scheduled_at);
            const statusKey = (post.status || "DRAFT").toLowerCase();
            const platformKey = (post.platform || "INSTAGRAM").toLowerCase();
            const isCopied = copiedId === post.id;

            // Pipeline progress bars calculation
            const stages = ["DRAFT", "REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"];
            const currentStageIndex = stages.indexOf(post.status);

            return (
              <article key={post.id} className="sm-post-card">
                {/* Card Top Bar */}
                <div className="sm-card-top-bar">
                  <div className="sm-card-vendor-info">
                    <div className="sm-card-avatar">
                      {(post.brand_name || post.vendor_name || "Z").charAt(0).toUpperCase()}
                    </div>
                    <div className="sm-card-brand-meta">
                      <span className="sm-card-brand-name">
                        {post.brand_name || "Zenve Atelier"}
                      </span>
                      <span className="sm-card-vendor-name">
                        {post.vendor_name ? `by ${post.vendor_name}` : "Vendor Partner"}
                      </span>
                    </div>
                  </div>

                  <div className="sm-card-badges-right" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span className={`sm-platform-pill ${platformKey}`}>
                      <PlatformIcon platform={post.platform} size={13} />
                      <span>{post.platform}</span>
                    </span>
                    <span className={`sm-status-badge ${statusKey}`}>
                      <span className="sm-status-dot" />
                      <span>{post.status}</span>
                    </span>
                  </div>
                </div>

                {/* Creative Visual Asset Box */}
                <div className="sm-card-media-box">
                  {post.creative_url ? (
                    <>
                      <img
                        src={post.creative_url}
                        alt={post.title}
                        className="sm-card-img"
                        onClick={() => setLightboxUrl(post.creative_url)}
                        title="Click to zoom image"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                      <div className="sm-card-img-placeholder" style={{ display: "none" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                        <span>Creative Asset Linked</span>
                      </div>

                      {post.creative_url.includes("figma.com") && (
                        <a
                          href={post.creative_url}
                          target="_blank"
                          rel="noreferrer"
                          className="sm-card-figma-badge"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Figma File ↗</span>
                        </a>
                      )}
                    </>
                  ) : (
                    <div className="sm-card-img-placeholder">
                      <PlatformIcon platform={post.platform} size={28} />
                      <span>No creative visual linked yet</span>
                    </div>
                  )}
                </div>

                {/* Card Main Body */}
                <div className="sm-card-body">
                  <h3 className="sm-card-title">{post.title}</h3>

                  <p className="sm-card-caption">
                    <HighlightedCaption text={post.caption} />
                  </p>

                  <div className="sm-card-schedule-row">
                    <div className="sm-card-schedule-time">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{formatDisplayDate(post.scheduled_at)}</span>
                    </div>

                    {post.scheduled_at && (
                      <span className={`sm-card-countdown ${relHint.isSoon ? "soon" : ""}`}>
                        {relHint.text}
                      </span>
                    )}
                  </div>
                </div>

                {/* Pipeline Progress Stepper */}
                <div className="sm-pipeline-step">
                  <div className="sm-pipeline-bars">
                    {stages.map((stage, idx) => {
                      const isFill = currentStageIndex >= idx;
                      const isPub = post.status === "PUBLISHED";
                      return (
                        <div
                          key={stage}
                          className={`sm-pipeline-bar ${isFill ? "fill" : ""} ${isPub ? "published" : ""}`}
                          title={`Stage: ${stage}`}
                        />
                      );
                    })}
                  </div>
                  <span>{post.status}</span>
                </div>

                {/* Card Footer Actions */}
                <div className="sm-card-footer">
                  <div style={{ display: "flex", gap: "6px" }}>
                    {/* Advance Status Button */}
                    {post.status !== "PUBLISHED" && post.status !== "CANCELLED" && (
                      <button
                        type="button"
                        className="sm-card-btn-primary"
                        onClick={() => handleQuickAdvance(post)}
                      >
                        {post.status === "DRAFT" && "Submit Review →"}
                        {post.status === "REVIEW" && "Approve ✓"}
                        {post.status === "APPROVED" && "Schedule ⏰"}
                        {post.status === "SCHEDULED" && "Publish 🚀"}
                      </button>
                    )}

                    {/* Live URL Link Button */}
                    {post.published_url && (
                      <a
                        href={post.published_url}
                        target="_blank"
                        rel="noreferrer"
                        className="sm-card-btn-action"
                        title="View verified post on platform"
                      >
                        <span>Live Post ↗</span>
                      </a>
                    )}

                    {/* Copy Caption Button */}
                    <button
                      type="button"
                      className="sm-card-btn-action"
                      onClick={() => handleCopyCaption(post)}
                      title="Copy title, caption and hashtags"
                    >
                      {isCopied ? "✓ Copied" : "Copy"}
                    </button>
                  </div>

                  <div className="sm-card-actions-right">
                    <button
                      type="button"
                      className="sm-icon-btn"
                      onClick={() => {
                        setSimulatorSelectedId(post.id);
                        setSimulatorChannel(post.platform || "INSTAGRAM");
                        setViewMode("simulator");
                      }}
                      title="Preview in Mobile Mockup"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                        <line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="sm-icon-btn"
                      onClick={() => handleDuplicate(post)}
                      title="Duplicate campaign"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="sm-icon-btn"
                      onClick={() => handleOpenEdit(post)}
                      title="Edit campaign"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="sm-icon-btn danger"
                      onClick={() => handleDelete(post)}
                      title="Delete campaign"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : viewMode === "table" ? (
        /* =====================================================
           VIEW 2: EDITORIAL TABLE VIEW
        ===================================================== */
        <div className="sm-table-container">
          <div className="sm-table-responsive">
            <table className="sm-table">
              <thead>
                <tr>
                  <th>Visual</th>
                  <th>Campaign & Vendor</th>
                  <th>Platform</th>
                  <th>Copy Snippet</th>
                  <th>Planned Schedule</th>
                  <th>Status</th>
                  <th>Live Link</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => {
                  const statusKey = (post.status || "DRAFT").toLowerCase();
                  const platformKey = (post.platform || "INSTAGRAM").toLowerCase();
                  return (
                    <tr key={post.id}>
                      {/* Thumbnail */}
                      <td style={{ width: "68px" }}>
                        {post.creative_url ? (
                          <img
                            src={post.creative_url}
                            alt=""
                            className="sm-table-thumb"
                            onClick={() => setLightboxUrl(post.creative_url)}
                            title="Click to view image"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="sm-table-thumb-placeholder">
                            <PlatformIcon platform={post.platform} size={18} />
                          </div>
                        )}
                      </td>

                      {/* Campaign & Vendor */}
                      <td>
                        <div className="sm-table-vendor-cell">
                          <div>
                            <span className="sm-table-post-title">{post.title}</span>
                            <small style={{ color: "#64748b" }}>
                              {post.brand_name || "Zenve Brand"} {post.vendor_name ? `· ${post.vendor_name}` : ""}
                            </small>
                          </div>
                        </div>
                      </td>

                      {/* Platform */}
                      <td>
                        <span className={`sm-platform-pill ${platformKey}`}>
                          <PlatformIcon platform={post.platform} size={13} />
                          <span>{post.platform}</span>
                        </span>
                      </td>

                      {/* Copy Snippet */}
                      <td>
                        <div className="sm-table-caption-snippet" title={post.caption}>
                          {post.caption || "No caption entered"}
                        </div>
                      </td>

                      {/* Planned Schedule */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>
                            {formatDisplayDate(post.scheduled_at)}
                          </span>
                          <small style={{ color: "#94a3b8" }}>
                            {getRelativeScheduleHint(post.scheduled_at).text}
                          </small>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`sm-status-badge ${statusKey}`}>
                          <span className="sm-status-dot" />
                          <span>{post.status}</span>
                        </span>
                      </td>

                      {/* Live Link */}
                      <td>
                        {post.published_url ? (
                          <a
                            href={post.published_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#1677ff", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <span>Live ↗</span>
                          </a>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "12px" }}>Pending publish</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div className="sm-table-actions" style={{ justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="sm-icon-btn"
                            onClick={() => handleCopyCaption(post)}
                            title="Copy caption"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className="sm-icon-btn"
                            onClick={() => {
                              setSimulatorSelectedId(post.id);
                              setSimulatorChannel(post.platform || "INSTAGRAM");
                              setViewMode("simulator");
                            }}
                            title="Preview in Mockup"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                              <line x1="12" y1="18" x2="12.01" y2="18" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className="sm-icon-btn"
                            onClick={() => handleOpenEdit(post)}
                            title="Edit campaign"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className="sm-icon-btn danger"
                            onClick={() => handleDelete(post)}
                            title="Delete campaign"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* =====================================================
           VIEW 3: LIVE SOCIAL FEED SIMULATOR
        ===================================================== */
        <div className="sm-simulator-container">
          {/* Post Selection Sidebar */}
          <aside className="sm-simulator-sidebar">
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0", color: "#0f172a" }}>
              Select Campaign to Preview
            </h3>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0" }}>
              Test how your marketing creative and copy renders in real-world mobile social feeds.
            </p>

            <div className="sm-simulator-post-list">
              {filteredPosts.map((p) => {
                const isSelected = activeSimulatorPost?.id === p.id;
                return (
                  <div
                    key={p.id}
                    className={`sm-simulator-post-item ${isSelected ? "active" : ""}`}
                    onClick={() => {
                      setSimulatorSelectedId(p.id);
                      setSimulatorChannel(p.platform || "INSTAGRAM");
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <strong style={{ fontSize: "12.5px", color: "#0f172a" }}>{p.title}</strong>
                      <PlatformIcon platform={p.platform} size={13} />
                    </div>
                    <small style={{ color: "#64748b", display: "block" }}>
                      {p.brand_name || "Zenve Atelier"} · {p.status}
                    </small>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Device Mockup Shell */}
          <div className="sm-simulator-center">
            {activeSimulatorPost ? (
              <div className="sm-mockup-phone">
                {/* Simulated Phone Status Bar */}
                <div className="sm-mockup-status-bar">
                  <span>9:41</span>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 9h22M1 15h22" />
                    </svg>
                    <span>5G</span>
                    <span style={{ fontSize: "10px", fontWeight: "bold" }}>100%</span>
                  </div>
                </div>

                {/* Channel Switcher Tabs on Mockup */}
                <div className="sm-mockup-channel-tabs">
                  <button
                    type="button"
                    className={`sm-mockup-tab ${simulatorChannel === "INSTAGRAM" ? "active" : ""}`}
                    onClick={() => setSimulatorChannel("INSTAGRAM")}
                  >
                    <PlatformIcon platform="INSTAGRAM" size={13} />
                    <span>Instagram</span>
                  </button>

                  <button
                    type="button"
                    className={`sm-mockup-tab ${simulatorChannel === "LINKEDIN" ? "active" : ""}`}
                    onClick={() => setSimulatorChannel("LINKEDIN")}
                  >
                    <PlatformIcon platform="LINKEDIN" size={13} />
                    <span>LinkedIn</span>
                  </button>

                  <button
                    type="button"
                    className={`sm-mockup-tab ${simulatorChannel === "X" ? "active" : ""}`}
                    onClick={() => setSimulatorChannel("X")}
                  >
                    <PlatformIcon platform="X" size={13} />
                    <span>X</span>
                  </button>
                </div>

                {/* Realistic Instagram Feed Simulator */}
                {simulatorChannel === "INSTAGRAM" && (
                  <div className="sm-ig-post">
                    <div className="sm-ig-header">
                      <div className="sm-ig-brand">
                        <div className="sm-ig-avatar-ring">
                          <div className="sm-ig-avatar">
                            {(activeSimulatorPost.brand_name || "Z").charAt(0)}
                          </div>
                        </div>
                        <div className="sm-ig-meta">
                          <span className="sm-ig-name">
                            {activeSimulatorPost.brand_name || "zenve.atelier"}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#1677ff">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                          </span>
                          <span className="sm-ig-sub">Sponsored · Paid Partnership with Zenve</span>
                        </div>
                      </div>
                      <span style={{ color: "#8e8e8e", fontWeight: "bold" }}>•••</span>
                    </div>

                    <div className="sm-ig-media">
                      {activeSimulatorPost.creative_url ? (
                        <img
                          src={activeSimulatorPost.creative_url}
                          alt=""
                          className="sm-ig-img"
                        />
                      ) : (
                        <div className="sm-card-img-placeholder">
                          <PlatformIcon platform="INSTAGRAM" size={40} />
                          <span>Attach creative asset link to preview image</span>
                        </div>
                      )}
                    </div>

                    <div className="sm-ig-actions">
                      <div className="sm-ig-actions-left">
                        <button type="button" className="sm-ig-btn">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                          </svg>
                        </button>
                        <button type="button" className="sm-ig-btn">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                          </svg>
                        </button>
                        <button type="button" className="sm-ig-btn">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                        </button>
                      </div>

                      <button type="button" className="sm-ig-btn">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                        </svg>
                      </button>
                    </div>

                    <div className="sm-ig-likes">1,482 likes</div>

                    <div className="sm-ig-caption">
                      <strong>{activeSimulatorPost.brand_name || "zenve.atelier"}</strong>
                      <HighlightedCaption text={activeSimulatorPost.caption} />
                    </div>

                    <div className="sm-ig-date">
                      {formatDisplayDate(activeSimulatorPost.scheduled_at)}
                    </div>
                  </div>
                )}

                {/* Realistic LinkedIn Feed Simulator */}
                {simulatorChannel === "LINKEDIN" && (
                  <div style={{ padding: "16px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
                      <div className="sm-card-avatar" style={{ width: "42px", height: "42px", borderRadius: "6px" }}>
                        {(activeSimulatorPost.brand_name || "Z").charAt(0)}
                      </div>
                      <div>
                        <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>
                          {activeSimulatorPost.brand_name || "Zenve Atelier Brand"}
                        </strong>
                        <small style={{ color: "#64748b", fontSize: "11px" }}>
                          12,450 followers · Promoted
                        </small>
                      </div>
                    </div>

                    <p style={{ fontSize: "13px", color: "#1e293b", lineHeight: "1.5", margin: "0 0 12px" }}>
                      <strong>{activeSimulatorPost.title}</strong>
                      <br />
                      <HighlightedCaption text={activeSimulatorPost.caption} />
                    </p>

                    {activeSimulatorPost.creative_url && (
                      <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0", marginBottom: "12px" }}>
                        <img
                          src={activeSimulatorPost.creative_url}
                          alt=""
                          style={{ width: "100%", height: "200px", objectFit: "cover" }}
                        />
                      </div>
                    )}

                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px", display: "flex", justifyContent: "space-around", fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                      <span>👍 Like</span>
                      <span>💬 Comment</span>
                      <span>🔁 Repost</span>
                      <span>↗ Send</span>
                    </div>
                  </div>
                )}

                {/* Realistic X (Twitter) Feed Simulator */}
                {simulatorChannel === "X" && (
                  <div style={{ padding: "16px" }}>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <div className="sm-card-avatar" style={{ width: "40px", height: "40px", borderRadius: "50%" }}>
                        {(activeSimulatorPost.brand_name || "Z").charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                          <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                            {activeSimulatorPost.brand_name || "Zenve Atelier"}
                          </strong>
                          <span style={{ fontSize: "12px", color: "#64748b" }}>
                            @{String(activeSimulatorPost.brand_name || "zenve").toLowerCase().replace(/\s+/g, "")}
                          </span>
                          <span style={{ color: "#94a3b8" }}>·</span>
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>1h</span>
                        </div>

                        <p style={{ fontSize: "13.5px", color: "#0f172a", lineHeight: "1.45", margin: "0 0 10px" }}>
                          <strong>{activeSimulatorPost.title}</strong>
                          <br />
                          <HighlightedCaption text={activeSimulatorPost.caption} />
                        </p>

                        {activeSimulatorPost.creative_url && (
                          <div style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid #e2e8f0", marginBottom: "12px" }}>
                            <img
                              src={activeSimulatorPost.creative_url}
                              alt=""
                              style={{ width: "100%", maxHeight: "240px", objectFit: "cover" }}
                            />
                          </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "12px", maxWidth: "300px" }}>
                          <span>💬 38</span>
                          <span>🔁 124</span>
                          <span>❤️ 892</span>
                          <span>📊 14.2K</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="sm-empty-state">
                <p>No post selected for mockup.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          CAMPAIGN CREATE & EDIT MODAL
      ===================================================== */}
      {isModalOpen && (
        <div className="sm-modal-backdrop" onClick={() => !busy && setIsModalOpen(false)}>
          <div className="sm-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sm-modal-header">
              <h2 className="sm-modal-title">
                {editingId ? "Edit Campaign Post" : "Create New Campaign Post"}
              </h2>
              <button
                type="button"
                className="sm-modal-close"
                onClick={() => !busy && setIsModalOpen(false)}
                disabled={busy}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePost}>
              <div className="sm-modal-body">
                {/* Template Chips for Quick Start */}
                {!editingId && (
                  <div className="sm-template-bar">
                    <span className="sm-template-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      Quick Templates:
                    </span>
                    <div className="sm-template-chips">
                      {CAMPAIGN_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.name}
                          type="button"
                          className="sm-template-chip"
                          onClick={() => handleApplyTemplate(tmpl)}
                        >
                          {tmpl.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="sm-form-grid">
                  {/* Vendor Partner Selection */}
                  <div className="sm-form-group">
                    <label className="sm-form-label">
                      <span>Vendor Partner *</span>
                    </label>
                    <select
                      required
                      value={form.vendor}
                      onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                      className="sm-form-select"
                      disabled={busy}
                    >
                      <option value="">Select Vendor Partner</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.brand_name || v.vendor_name} ({v.vendor_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campaign Status */}
                  <div className="sm-form-group">
                    <label className="sm-form-label">
                      <span>Pipeline Status</span>
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="sm-form-select"
                      disabled={busy}
                    >
                      {STATUSES.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.label} — {st.desc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Platform Selector Buttons */}
                  <div className="sm-form-group full">
                    <label className="sm-form-label">
                      <span>Target Channel / Platform</span>
                    </label>
                    <div className="sm-platform-selector">
                      {PLATFORMS.map((plat) => {
                        const isSelected = form.platform === plat.id;
                        return (
                          <div
                            key={plat.id}
                            className={`sm-platform-option ${isSelected ? "active" : ""}`}
                            onClick={() => setForm({ ...form, platform: plat.id })}
                          >
                            <PlatformIcon platform={plat.id} size={18} />
                            <span>{plat.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campaign Post Title */}
                  <div className="sm-form-group full">
                    <label className="sm-form-label">
                      <span>Campaign Title *</span>
                      <small>{form.title.length}/180</small>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={180}
                      placeholder="e.g., Diwali Festive Pet Bandana Launch"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="sm-input"
                      disabled={busy}
                    />
                  </div>

                  {/* Creative Asset Link */}
                  <div className="sm-form-group full">
                    <label className="sm-form-label">
                      <span>Creative Asset URL</span>
                      <small>Image link, Figma preview or Cloudinary CDN</small>
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... or https://www.figma.com/..."
                      value={form.creative_url}
                      onChange={(e) => setForm({ ...form, creative_url: e.target.value })}
                      className="sm-input"
                      disabled={busy}
                    />

                    {/* Instant Thumbnail Preview in Modal */}
                    {form.creative_url && (
                      <div className="sm-modal-preview-box">
                        <img
                          src={form.creative_url}
                          alt="Creative preview"
                          className="sm-modal-preview-img"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <div style={{ fontSize: "12px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <strong style={{ display: "block", color: "#0f172a" }}>Asset Preview</strong>
                          <span>{form.creative_url}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Planned Date & Time */}
                  <div className="sm-form-group">
                    <label className="sm-form-label">
                      <span>Planned Release Date & Time</span>
                      <small>{form.status === "SCHEDULED" ? "Required" : "Optional"}</small>
                    </label>
                    <input
                      type="datetime-local"
                      required={form.status === "SCHEDULED"}
                      value={form.scheduled_at}
                      onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                      className="sm-input"
                      disabled={busy}
                    />
                    <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                      <button
                        type="button"
                        className="sm-hashtag-chip"
                        onClick={() => handlePresetDate(24)}
                      >
                        +24h
                      </button>
                      <button
                        type="button"
                        className="sm-hashtag-chip"
                        onClick={() => handlePresetDate(48)}
                      >
                        +48h
                      </button>
                      <button
                        type="button"
                        className="sm-hashtag-chip"
                        onClick={() => handlePresetDate(72)}
                      >
                        +3d
                      </button>
                    </div>
                  </div>

                  {/* Live Post URL (When published) */}
                  <div className="sm-form-group">
                    <label className="sm-form-label">
                      <span>Live Post URL</span>
                      <small>{form.status === "PUBLISHED" ? "Required" : "Once published"}</small>
                    </label>
                    <input
                      type="url"
                      required={form.status === "PUBLISHED"}
                      placeholder="https://www.instagram.com/p/..."
                      value={form.published_url}
                      onChange={(e) => setForm({ ...form, published_url: e.target.value })}
                      className="sm-input"
                      disabled={busy}
                    />
                  </div>

                  {/* Post Caption / Copywriting */}
                  <div className="sm-form-group full">
                    <label className="sm-form-label">
                      <span>Post Caption & Copywriting</span>
                      <small>{form.caption.length} chars</small>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Write your editorial copy, storytelling hook, and campaign call-to-action..."
                      value={form.caption}
                      onChange={(e) => setForm({ ...form, caption: e.target.value })}
                      className="sm-textarea"
                      disabled={busy}
                    />

                    {/* Hashtag suggestions chips */}
                    <div className="sm-hashtag-chips">
                      <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                        Add Hashtag:
                      </span>
                      {PRESET_HASHTAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className="sm-hashtag-chip"
                          onClick={() => handleAppendHashtag(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sm-modal-footer">
                <button
                  type="button"
                  className="sm-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sm-btn-primary"
                  disabled={busy}
                >
                  {busy ? "Saving Campaign…" : editingId ? "Save Changes" : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          IMAGE LIGHTBOX OVERLAY
      ===================================================== */}
      {lightboxUrl && (
        <div className="sm-lightbox-overlay" onClick={() => setLightboxUrl(null)}>
          <button
            type="button"
            className="sm-lightbox-close"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close image viewer"
          >
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt="High-resolution creative preview"
            className="sm-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="sm-lightbox-caption" onClick={(e) => e.stopPropagation()}>
            <a
              href={lightboxUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#ffffff", textDecoration: "underline", fontSize: "13px" }}
            >
              Open Original Asset in New Window ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
