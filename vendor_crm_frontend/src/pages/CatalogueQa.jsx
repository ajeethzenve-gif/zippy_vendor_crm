import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "../styles/CatalogueQa.css";
import SearchBar from "../components/SearchBar";
import { getProducts, updateProduct } from "../services/api";
import { showToast } from "../utils/zenveToast";

/* =========================================================
   ICONS
========================================================= */

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 7L5 12L10 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* =========================================================
   10 QA WEIGHTED DIMENSIONS
========================================================= */

const QA_DIMENSIONS = [
  { key: "productData", label: "Product data", weight: 15 },
  { key: "photography", label: "Photography", weight: 15 },
  { key: "brandQuality", label: "Brand quality", weight: 10 },
  { key: "sizeInfo", label: "Size information", weight: 10 },
  { key: "pricing", label: "Pricing", weight: 10 },
  { key: "compliance", label: "Compliance", weight: 10 },
  { key: "petSafety", label: "Pet safety", weight: 10 },
  { key: "inventory", label: "Inventory", weight: 10 },
  { key: "returnPolicy", label: "Return policy", weight: 5 },
  { key: "seo", label: "SEO", weight: 5 },
];

const getDefaultScores = () =>
  Object.fromEntries(QA_DIMENSIONS.map((d) => [d.key, 90]));

function calculateWeightedScore(scores) {
  if (!scores) return 0;
  const valid = QA_DIMENSIONS.filter((d) => typeof scores[d.key] === "number");
  if (!valid.length) return 0;
  const totalWeight = valid.reduce((acc, d) => acc + d.weight, 0);
  const weightedSum = valid.reduce((acc, d) => acc + (Number(scores[d.key]) || 0) * d.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

function formatInr(val) {
  const num = Number(val) || 0;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}

/* =========================================================
   MAIN COMPONENT: 04 CATALOGUE QA
========================================================= */

export default function CatalogueQa() {
  const { getLayerDisplayNum } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (alert) {
      showToast(alert);
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Scores by SKU ID: { [skuId]: { productData: 90, photography: 90, ... } }
  const [scoresState, setScoresState] = useState({});
  // Reviewer notes by SKU ID: { [skuId]: string }
  const [notesState, setNotesState] = useState({});

  // Audit trail list of decisions
  const [auditLog, setAuditLog] = useState([
    {
      id: "log-init-1",
      at: new Date(Date.now() - 3600000).toISOString(),
      message: "Ivory Silk Dog Kurta approved with 95/100 by QA Auditor",
    },
  ]);

  /* =======================================================
     FETCH PRODUCTS FROM BACKEND
  ======================================================= */
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getProducts();
      const list = Array.isArray(data) ? data : data.results || [];
      setProducts(list);
    } catch (err) {
      console.error("Failed to load products for QA:", err);
      setError("Unable to connect to Django backend to fetch SKUs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  /* =======================================================
     DERIVED DATA & KPIS
  ======================================================= */
  const queueSkus = useMemo(() => {
    return products.filter((p) => {
      const status = p.qaStatus || p.status;
      return status === "PENDING_QA" || status === "CORRECTION";
    });
  }, [products]);

  const reviewedSkus = useMemo(() => {
    return products.filter((p) => p.qa_score !== null && p.qa_score !== undefined);
  }, [products]);

  const kpis = useMemo(() => {
    const inQueue = queueSkus.length;
    const approved = products.filter((p) => (p.qaStatus || p.status) === "APPROVED" || (p.qaStatus || p.status) === "LIVE").length;
    const totalSkus = products.length;
    const withScores = products.filter((p) => typeof p.qa_score === "number");
    const avgQuality = withScores.length
      ? Math.round(withScores.reduce((acc, p) => acc + p.qa_score, 0) / withScores.length)
      : 0;
    return { inQueue, approved, totalSkus, avgQuality };
  }, [products, queueSkus]);

  /* =======================================================
     SCORE HANDLERS
  ======================================================= */
  const getScoresForSku = (skuId) => scoresState[skuId] || getDefaultScores();

  const handleScoreChange = (skuId, key, val) => {
    const clamped = Math.max(0, Math.min(100, Number(val) || 0));
    setScoresState((prev) => ({
      ...prev,
      [skuId]: {
        ...getScoresForSku(skuId),
        [key]: clamped,
      },
    }));
  };

  /* =======================================================
     SUBMIT DETAILED REVIEW (DIRECT APPROVAL WITH REFERENCE SCORE)
  ======================================================= */
  const handleSubmitReview = async (skuItem) => {
    const scores = getScoresForSku(skuItem.id);
    const totalScore = calculateWeightedScore(scores);
    const note = notesState[skuItem.id] || "";

    const newStatus = "APPROVED";
    const isLive = true;
    const message = `Approved with ${totalScore}/100 reference score — SKU is now live`;

    try {
      await updateProduct(skuItem.id, {
        status: newStatus,
        qa_score: totalScore,
        qa_scores: scores,
        qa_note: note,
        is_live: isLive,
      });

      setAlert({ type: "success", text: message });

      // Append to audit log
      setAuditLog((prev) => [
        {
          id: `log-${Date.now()}`,
          at: new Date().toISOString(),
          message: `${skuItem.product_name || skuItem.name} directly approved with ${totalScore}/100 reference score`,
        },
        ...prev,
      ]);

      // Refresh product list
      await loadProducts();
    } catch (err) {
      console.error("Submit QA review failed:", err);
      setAlert({ type: "error", text: `Failed to approve product: ${err.message}` });
    }
  };

  /* =======================================================
     QUICK APPROVE HANDLER
  ======================================================= */
  const handleQuickApprove = async (skuItem, targetScore = 95) => {
    const message = `Quick approved with ${targetScore}/100 reference score — SKU is now live`;

    try {
      await updateProduct(skuItem.id, {
        status: "APPROVED",
        qa_score: targetScore,
        is_live: true,
        qa_note: notesState[skuItem.id] || `Directly approved (${targetScore}/100 reference score)`,
      });

      setAlert({ type: "success", text: message });

      setAuditLog((prev) => [
        {
          id: `log-${Date.now()}`,
          at: new Date().toISOString(),
          message: `${skuItem.product_name || skuItem.name}: ${message}`,
        },
        ...prev,
      ]);

      await loadProducts();
    } catch (err) {
      console.error("Quick approve failed:", err);
      setAlert({ type: "error", text: `Failed to approve product: ${err.message}` });
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <div className="ZENVE-qa-layout">
      {/* =====================================================
          HEADER SECTION
      ===================================================== */}
      <header className="ZENVE-qa-header">
        <div className="ZENVE-header-left">
          <div className="ZENVE-header-title-block">
            <h1 className="ZENVE-portal-title">
              <span className="ZENVE-layer-num">{getLayerDisplayNum("04")}</span>
              Catalogue QA
            </h1>

            <p className="ZENVE-portal-subtitle">
              QA layer · Validation, approval, audit trail
            </p>
          </div>
        </div>
      </header>

      {/* FEEDBACK NOTIFICATION */}
      {alert && alert.type !== "success" && (
        <div className={`ZENVE-alert ZENVE-alert-${alert.type}`}>
          <span>{alert.text}</span>
          <button type="button" className="ZENVE-alert-close" onClick={() => setAlert(null)}>
            ×
          </button>
        </div>
      )}

      {/* ERROR NOTIFICATION */}
      {error && (
        <div className="ZENVE-alert ZENVE-alert-error">
          <span>{error}</span>
          <button type="button" className="ZENVE-alert-close" onClick={loadProducts}>
            Retry
          </button>
        </div>
      )}

      <main className="ZENVE-qa-main">
        {/* ===================================================
            TOP 4 KPI METRIC TILES
        =================================================== */}
        <div className="ZENVE-qa-kpi-grid">
          <div className="ZENVE-kpi-tile">
            <div className="ZENVE-tile-label">In queue</div>
            <div className="ZENVE-tile-value">{loading ? "—" : kpis.inQueue}</div>
            <div className="ZENVE-tile-hint">Awaiting review</div>
          </div>

          <div className="ZENVE-kpi-tile">
            <div className="ZENVE-tile-label">Approved</div>
            <div className="ZENVE-tile-value">{loading ? "—" : kpis.approved}</div>
            <div className="ZENVE-tile-hint">Live on storefront</div>
          </div>

          <div className="ZENVE-kpi-tile">
            <div className="ZENVE-tile-label">Total SKUs</div>
            <div className="ZENVE-tile-value">{loading ? "—" : kpis.totalSkus}</div>
            <div className="ZENVE-tile-hint">Catalogue count</div>
          </div>

          <div className="ZENVE-kpi-tile">
            <div className="ZENVE-tile-label">Average quality</div>
            <div className="ZENVE-tile-value">{loading ? "—" : `${kpis.avgQuality}/100`}</div>
            <div className="ZENVE-tile-hint">Vendor reference score</div>
          </div>
        </div>

        {/* ===================================================
            SECTION 1: QA QUEUE
        =================================================== */}
        <section className="ZENVE-portal-card">
          <div className="ZENVE-card-header">
            <div>
              <h2 className="ZENVE-card-title">QA queue</h2>
              <p className="ZENVE-card-description">
                Directly approve products for storefront. 10 weighted quality dimensions are recorded as reference scores for vendors.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="ZENVE-item-empty">Loading QA queue from Django...</div>
          ) : queueSkus.length === 0 ? (
            <div className="ZENVE-item-empty">
              Queue is clear. New vendor uploads land here automatically.
            </div>
          ) : (
            <div className="ZENVE-qa-queue-stack">
              {queueSkus.map((sku) => {
                const scores = getScoresForSku(sku.id);
                const totalScore = calculateWeightedScore(scores);
                const scoreTone = totalScore >= 90 ? "good" : totalScore >= 75 ? "warn" : "bad";
                const qaStatus = sku.qaStatus || sku.status || "PENDING_QA";
                const designerBrand = sku.designer_brand || sku.designer_name || "—";
                const location = sku.location || sku.fulfilment_location || "Mumbai FC";

                return (
                  <div key={sku.id} className="ZENVE-qa-card">
                    {/* CARD HEADER */}
                    <div className="ZENVE-qa-top-bar">
                      <h3 className="ZENVE-sku-title">{sku.product_name || sku.name}</h3>

                      <span className={`ZENVE-qa-badge tone-${qaStatus.toLowerCase()}`}>
                        {qaStatus}
                      </span>

                      <span className={`ZENVE-tone-badge ${scoreTone}`}>
                        {totalScore}/100
                      </span>
                    </div>

                    {/* SKU ID MONO */}
                    <div className="ZENVE-sku-id-mono">{sku.sku}</div>

                    {/* SUBTITLE DETAILS */}
                    <p className="ZENVE-qa-meta-line">
                      {designerBrand} · {sku.category} · {sku.colour} / {sku.size} · {formatInr(sku.price || sku.selling_price)} · {location}
                    </p>

                    {/* 10-DIMENSION SCORE INPUTS */}
                    <div className="ZENVE-dimensions-grid">
                      {QA_DIMENSIONS.map((dim) => (
                        <div key={dim.key} className="ZENVE-dimension-tile">
                          <span className="ZENVE-dim-label">
                            {dim.label} · {dim.weight}%
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={scores[dim.key] ?? 90}
                            onChange={(e) => handleScoreChange(sku.id, dim.key, e.target.value)}
                            className="ZENVE-dim-input"
                          />
                        </div>
                      ))}
                    </div>

                    {/* ACTION CONTROLS */}
                    <div className="ZENVE-qa-actions-row">
                      <input
                        type="text"
                        placeholder="Reference note for vendor (optional)"
                        value={notesState[sku.id] ?? ""}
                        onChange={(e) => setNotesState({ ...notesState, [sku.id]: e.target.value })}
                        className="ZENVE-note-input"
                      />

                      <button
                        type="button"
                        className="ZENVE-btn-primary"
                        onClick={() => handleSubmitReview(sku)}
                      >
                        Approve product ({totalScore}/100)
                      </button>

                      <button
                        type="button"
                        className="ZENVE-btn-outline-sm"
                        onClick={() => handleQuickApprove(sku, 95)}
                      >
                        Quick approve (95)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ===================================================
            SECTION 2: REVIEWED SKUS
        =================================================== */}
        <section className="ZENVE-portal-card">
          <div className="ZENVE-card-header">
            <div>
              <h2 className="ZENVE-card-title">Reviewed SKUs</h2>
              <p className="ZENVE-card-description">
                Score breakdown is kept with every decision.
              </p>
            </div>
          </div>

          {reviewedSkus.length === 0 ? (
            <div className="ZENVE-item-empty">Nothing reviewed yet.</div>
          ) : (
            <div className="ZENVE-reviewed-list">
              {reviewedSkus.map((sku) => {
                const qaStatus = sku.qaStatus || sku.status || "APPROVED";
                return (
                  <div key={sku.id} className="ZENVE-reviewed-row">
                    <div className="ZENVE-reviewed-head">
                      <span className="ZENVE-reviewed-name">{sku.product_name || sku.name}</span>
                      <span className="ZENVE-sku-id-mono">{sku.sku}</span>
                      <span className="ZENVE-reviewed-score">Score {sku.qa_score}/100</span>
                      <span className={`ZENVE-qa-badge tone-${qaStatus.toLowerCase()}`}>
                        {qaStatus}
                      </span>
                    </div>

                    {sku.qa_scores && Object.keys(sku.qa_scores).length > 0 && (
                      <p className="ZENVE-reviewed-breakdown">
                        {QA_DIMENSIONS.filter((d) => typeof sku.qa_scores[d.key] === "number")
                          .map((d) => `${d.label} ${sku.qa_scores[d.key]}`)
                          .join(" · ")}
                      </p>
                    )}

                    {sku.qa_note && (
                      <p className="ZENVE-reviewed-note">Note: {sku.qa_note}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ===================================================
            SECTION 3: AUDIT TRAIL
        =================================================== */}
        <section className="ZENVE-portal-card">
          <div className="ZENVE-card-header">
            <div>
              <h2 className="ZENVE-card-title">Audit trail</h2>
              <p className="ZENVE-card-description">
                Every QA decision is timestamped.
              </p>
            </div>
          </div>

          {auditLog.length === 0 ? (
            <div className="ZENVE-item-empty">No QA decisions recorded yet.</div>
          ) : (
            <ul className="ZENVE-audit-list">
              {auditLog.map((entry) => (
                <li key={entry.id} className="ZENVE-audit-item">
                  <span className="ZENVE-audit-time">
                    {new Date(entry.at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </span>
                  <span className="ZENVE-audit-msg">{entry.message}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
