import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Catalogue.css";
import SearchBar from "../components/SearchBar";
import { useAuth } from "../context/AuthContext";
import { getProducts, updateProduct } from "../services/api";
import { showToast } from "../utils/zenveToast";

/* =========================================================
   ICONS & SWITCH
========================================================= */

function UserProfileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/*
========================================================= */

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 7L5 12L10 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`ZENVE-cat-switch ${checked ? "checked" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="ZENVE-cat-switch-thumb" />
    </button>
  );
}

/* =========================================================
   FIELD METADATA DEFINITIONS
========================================================= */

const RECORD_SECTIONS = [
  {
    title: "Compliance & logistics",
    fields: [
      { key: "barcode", label: "Barcode / EAN" },
      { key: "hsn", label: "HSN code" },
      { key: "gstRate", label: "GST rate %", number: true },
      { key: "weightG", label: "Weight (g)", number: true },
      { key: "dimensions", label: "Dimensions" },
      { key: "origin", label: "Country of origin" },
      { key: "manufacturer", label: "Manufacturing information" },
    ],
  },
  {
    title: "Product detail",
    fields: [
      { key: "fabric", label: "Fabric / material" },
      { key: "care", label: "Care instructions" },
      { key: "petSafety", label: "Pet safety information" },
    ],
  },
  {
    title: "Media",
    fields: [
      { key: "image", label: "Image URL" },
      { key: "video", label: "Video URL" },
      { key: "altText", label: "Image alt text" },
    ],
  },
  {
    title: "Discovery & SEO",
    fields: [
      { key: "seoTitle", label: "SEO title" },
      { key: "seoDescription", label: "Meta description" },
      { key: "keywords", label: "Search keywords" },
      { key: "collection", label: "Collection" },
      { key: "occasion", label: "Occasion" },
      { key: "season", label: "Season" },
    ],
  },
];

const MERCHANDISING_FLAGS = [
  { key: "bestseller", label: "Bestseller" },
  { key: "newArrival", label: "New arrival" },
  { key: "featured", label: "Featured" },
  { key: "limitedEdition", label: "Limited edition" },
];

const ALL_RECORD_KEYS = RECORD_SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

function computeCompletion(sku) {
  const filled = ALL_RECORD_KEYS.filter((k) => {
    const val = sku[k];
    return typeof val === "number" ? val > 0 : !!(val && String(val).trim());
  }).length;
  return Math.round((filled / ALL_RECORD_KEYS.length) * 100);
}

function formatInr(val) {
  const num = Number(val) || 0;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}

/* =========================================================
   MAIN COMPONENT: 04 CATALOGUE & MERCHANDISING
========================================================= */

export default function Catalogue() {
  const { getLayerDisplayNum } = useAuth();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isVendor = currentUser?.id === "designer";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [priceInputs, setPriceInputs] = useState({});
  const [expandedSkuId, setExpandedSkuId] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (alert) {
      showToast(alert);
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  /* =======================================================
     FETCH PRODUCTS FROM BACKEND
  ======================================================= */
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");
      if (isVendor && !currentUser?.vendorId) {
        setProducts([]);
        setError("Your vendor account is not linked to a business. Please contact support.");
        return;
      }
      const data = await getProducts(isVendor ? { designer: currentUser.vendorId } : {});
      const list = Array.isArray(data) ? data : data.results || [];
      setProducts(list);
    } catch (err) {
      console.error("Failed to load products:", err);
      setError("Unable to connect to Django backend to fetch products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [currentUser?.id, currentUser?.vendorId]);

  /* =======================================================
     UPDATE SINGLE PRICE
  ======================================================= */
  const handlePriceUpdate = async (skuItem) => {
    const inputVal = priceInputs[skuItem.id];
    const numeric = Number(inputVal);

    if (!numeric || numeric <= 0) {
      setAlert({ type: "error", text: "Enter a valid price" });
      return;
    }

    if (numeric > Number(skuItem.mrp)) {
      setAlert({ type: "error", text: "Selling price cannot exceed MRP" });
      return;
    }

    try {
      await updateProduct(skuItem.id, { selling_price: numeric });
      setAlert({ type: "success", text: `Price updated to ${formatInr(numeric)}` });
      setPriceInputs((prev) => ({ ...prev, [skuItem.id]: "" }));
      // Update local product list
      setProducts((prev) =>
        prev.map((p) => (p.id === skuItem.id ? { ...p, selling_price: numeric, price: numeric } : p))
      );
    } catch (err) {
      setAlert({ type: "error", text: `Failed to update price: ${err.message}` });
    }
  };

  /* =======================================================
     TOGGLE FAST DELIVERY
  ======================================================= */
  const handleToggleFast = async (skuItem) => {
    const nextVal = !skuItem.fastDelivery;
    try {
      await updateProduct(skuItem.id, { fast_delivery: nextVal });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === skuItem.id ? { ...p, fast_delivery: nextVal, fastDelivery: nextVal } : p
        )
      );
      setAlert({
        type: "success",
        text: `Fast delivery flag ${nextVal ? "enabled" : "disabled"} for ${skuItem.sku}`,
      });
    } catch (err) {
      setAlert({ type: "error", text: `Failed to toggle fast delivery: ${err.message}` });
    }
  };

  /* =======================================================
     UPDATE RECORD FIELD (ON BLUR)
  ======================================================= */
  const handleFieldBlur = async (skuItem, fieldKey, fieldLabel, newVal) => {
    const oldVal = skuItem[fieldKey];
    if (String(oldVal ?? "") === String(newVal ?? "")) return;

    try {
      await updateProduct(skuItem.id, { [fieldKey]: newVal });
      setProducts((prev) =>
        prev.map((p) => (p.id === skuItem.id ? { ...p, [fieldKey]: newVal } : p))
      );
      setAlert({ type: "success", text: `${fieldLabel} saved` });
    } catch (err) {
      console.error(`Failed to save ${fieldLabel}:`, err);
      setAlert({ type: "error", text: `Failed to save ${fieldLabel}` });
    }
  };

  /* =======================================================
     TOGGLE MERCHANDISING FLAG
  ======================================================= */
  const handleToggleMerchFlag = async (skuItem, flagKey, flagLabel) => {
    const nextVal = !skuItem[flagKey];
    try {
      await updateProduct(skuItem.id, { [flagKey]: nextVal });
      setProducts((prev) =>
        prev.map((p) => (p.id === skuItem.id ? { ...p, [flagKey]: nextVal } : p))
      );
      setAlert({
        type: "success",
        text: `${flagLabel} ${nextVal ? "enabled" : "disabled"}`,
      });
    } catch (err) {
      setAlert({ type: "error", text: `Failed to toggle ${flagLabel}` });
    }
  };

  /* =======================================================
     FILTERED SKUS & METRICS
  ======================================================= */
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => {
      const haystack = [
        p.sku,
        p.product_name || p.name,
        p.category,
        p.colour,
        p.size,
        p.collection,
        p.occasion,
        p.designer_brand,
        p.designer_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [products, searchTerm]);

  const kpis = useMemo(() => {
    const totalSkus = products.length;
    const liveSkus = products.filter((p) => p.live || p.is_live || p.status === "LIVE").length;
    const inQa = products.filter((p) => (p.qaStatus || p.status) === "PENDING_QA").length;
    const finalSale = products.filter(
      (p) => !p.returnable || p.return_policy === "FINAL_SALE"
    ).length;
    return { totalSkus, liveSkus, inQa, finalSale };
  }, [products]);

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <div className="ZENVE-catalogue-layout">
      {/* =====================================================
          HEADER SECTION
      ===================================================== */}
      <header className="ZENVE-catalogue-header">
        <div className="ZENVE-header-left">
          <div className="ZENVE-header-title-block">
            <h1 className="ZENVE-portal-title">
              <span className="ZENVE-layer-num">{getLayerDisplayNum("03")}</span>
              Product / SKU
            </h1>

            <p className="ZENVE-portal-subtitle">
              Catalogue layer · Variants, attributes, media, pricing, policy
            </p>
          </div>
        </div>

        {isVendor && <div className="ZENVE-header-actions-group">
          <button type="button" className="ZENVE-header-profile-btn ZENVE-header-media-btn" aria-label="Media Content" onClick={() => navigate("/vendor-dashboard?view=media")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m21 15-5-5L5 21m9-7-4-4-7 7" /></svg>
          </button>
          <button type="button" className="ZENVE-header-profile-btn" onClick={() => navigate("/vendor-dashboard?view=profile")} aria-label="Profile and Account Details">
            <UserProfileIcon />
          </button>
          <button type="button" className="ZENVE-header-notif-btn" onClick={() => navigate("/vendor-dashboard?view=notifications")} aria-label="Notifications">
            <BellIcon />
          </button>
        </div>}

      </header>

      {/* FEEDBACK BANNER */}
      {alert && alert.type !== "success" && (
        <div className={`ZENVE-alert ZENVE-alert-${alert.type}`}>
          <span>{alert.text}</span>
          <button type="button" className="ZENVE-alert-close" onClick={() => setAlert(null)}>
            ×
          </button>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="ZENVE-alert ZENVE-alert-error">
          <span>{error}</span>
          <button type="button" className="ZENVE-alert-close" onClick={loadProducts}>
            Retry
          </button>
        </div>
      )}

      <main className="ZENVE-catalogue-main">
        {/* ===================================================
            TOP 4 KPI CARDS
        =================================================== */}
        <div className="ZENVE-catalogue-kpis">
          <div className="ZENVE-kpi-card">
            <div className="ZENVE-label-caps">SKUs</div>
            <div className="ZENVE-kpi-val">{loading ? "—" : kpis.totalSkus}</div>
          </div>

          <div className="ZENVE-kpi-card">
            <div className="ZENVE-label-caps">Live</div>
            <div className="ZENVE-kpi-val">{loading ? "—" : kpis.liveSkus}</div>
          </div>

          <div className="ZENVE-kpi-card">
            <div className="ZENVE-label-caps">In QA</div>
            <div className="ZENVE-kpi-val">{loading ? "—" : kpis.inQa}</div>
          </div>

          <div className="ZENVE-kpi-card">
            <div className="ZENVE-label-caps">Final sale</div>
            <div className="ZENVE-kpi-val">{loading ? "—" : kpis.finalSale}</div>
          </div>
        </div>

        {/* ===================================================
            SKU MASTER SECTION
        =================================================== */}
        <section className="ZENVE-portal-card">
          <div className="ZENVE-card-header">
            <div>
              <h2 className="ZENVE-card-title">SKU master</h2>
              <p className="ZENVE-card-description">
                Pattern: ZNV-VENDOR-CATEGORY-PRODUCT-COLOUR-SIZE. Price edits and record edits are written to the audit log.
              </p>
            </div>

            <div className="ZENVE-search-action-wrap">
              <input
                type="text"
                placeholder="Search SKU, name, colour, collection…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ZENVE-cat-search-input"
              />
            </div>
          </div>

          {loading ? (
            <div className="ZENVE-item-empty">Loading SKUs from Django...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="ZENVE-item-empty">No SKUs match this search.</div>
          ) : (
            <div className="ZENVE-sku-card-stack">
              {filteredProducts.map((sku) => {
                const completion = computeCompletion(sku);
                const isExpanded = expandedSkuId === sku.id;
                const qaStatus = sku.qaStatus || sku.status || "PENDING_QA";
                const isLive = sku.live || sku.is_live || sku.status === "LIVE";
                const isReturnable = sku.returnable ?? sku.return_policy === "RETURNABLE";
                const designerBrand = sku.designer_brand || sku.designer_name || "—";
                const fulfilmentText = `${sku.location || sku.fulfilment_location || "Mumbai FC"} · ${sku.available_quantity ?? sku.inventory_quantity ?? 0
                  } available`;
                const collectionText =
                  [sku.collection, sku.occasion, sku.season].filter(Boolean).join(" · ") || "—";

                return (
                  <div key={sku.id} className="ZENVE-sku-item-card">
                    {/* TOP BADGE HEADER */}
                    <div className="ZENVE-sku-top-bar">
                      <h3 className="ZENVE-sku-title">{sku.product_name || sku.name}</h3>

                      <span className={`ZENVE-qa-badge tone-${qaStatus.toLowerCase()}`}>
                        {qaStatus}
                      </span>

                      <span className={`ZENVE-tone-badge ${isLive ? "good" : "neutral"}`}>
                        {isLive ? "LIVE" : "NOT LIVE"}
                      </span>

                      <span className={`ZENVE-tone-badge ${isReturnable ? "info" : "warn"}`}>
                        {isReturnable ? "Returnable" : "Final sale"}
                      </span>

                      <span className={`ZENVE-tone-badge ${completion >= 80 ? "good" : "warn"}`}>
                        Record {completion}% complete
                      </span>

                      {/* ACTIVE MERCHANDISING FLAGS */}
                      {MERCHANDISING_FLAGS.filter((f) => sku[f.key]).map((f) => (
                        <span key={f.key} className="ZENVE-tone-badge info">
                          {f.label}
                        </span>
                      ))}
                    </div>

                    {/* SKU ID MONO */}
                    <div className="ZENVE-sku-id-mono">{sku.sku}</div>

                    {/* QUICK METADATA GRID */}
                    <div className="ZENVE-sku-meta-grid">
                      <div>
                        <span className="ZENVE-label-caps">Vendor</span>
                        <p>{designerBrand}</p>
                      </div>

                      <div>
                        <span className="ZENVE-label-caps">Category</span>
                        <p>{`${sku.category} · ${sku.colour} · ${sku.size}`}</p>
                      </div>

                      <div>
                        <span className="ZENVE-label-caps">MRP / price</span>
                        <p>{`${formatInr(sku.mrp)} → ${formatInr(sku.price || sku.selling_price)}`}</p>
                      </div>

                      <div>
                        <span className="ZENVE-label-caps">Fulfilment</span>
                        <p>{fulfilmentText}</p>
                      </div>

                      <div>
                        <span className="ZENVE-label-caps">Barcode / HSN</span>
                        <p>{`${sku.barcode || "—"} · ${sku.hsn || "—"}`}</p>
                      </div>

                      <div>
                        <span className="ZENVE-label-caps">GST</span>
                        <p>{sku.gstRate || sku.gst_rate || 0}%</p>
                      </div>

                      <div>
                        <span className="ZENVE-label-caps">Fabric</span>
                        <p>{sku.fabric || sku.material || "—"}</p>
                      </div>

                      <div>
                        <span className="ZENVE-label-caps">Collection</span>
                        <p>{collectionText}</p>
                      </div>
                    </div>

                    {/* ACTION CONTROLS */}
                    <div className="ZENVE-sku-actions-row">
                      <input
                        type="number"
                        placeholder="New price"
                        value={priceInputs[sku.id] ?? ""}
                        onChange={(e) =>
                          setPriceInputs({ ...priceInputs, [sku.id]: e.target.value })
                        }
                        className="ZENVE-price-input"
                      />

                      <button
                        type="button"
                        className="ZENVE-btn-outline-sm"
                        onClick={() => handlePriceUpdate(sku)}
                      >
                        Update price
                      </button>

                      <label className="ZENVE-fast-delivery-label">
                        <Switch
                          checked={sku.fastDelivery || sku.fast_delivery}
                          onChange={() => handleToggleFast(sku)}
                        />
                        <span>Fast delivery flag</span>
                      </label>

                      <button
                        type="button"
                        className="ZENVE-btn-outline-sm"
                        onClick={() => setExpandedSkuId(isExpanded ? null : sku.id)}
                      >
                        {isExpanded ? "Close full record" : "Edit full record"}
                      </button>
                    </div>

                    {/* EXPANDED FULL RECORD EDITOR */}
                    {isExpanded && (
                      <div className="ZENVE-record-editor-box">
                        {RECORD_SECTIONS.map((sec) => (
                          <div key={sec.title} className="ZENVE-editor-section">
                            <span className="ZENVE-label-caps">{sec.title}</span>
                            <div className="ZENVE-editor-fields-grid">
                              {sec.fields.map((f) => (
                                <div key={f.key} className="ZENVE-editor-field">
                                  <label className="ZENVE-field-sublabel">{f.label}</label>
                                  <input
                                    type={f.number ? "number" : "text"}
                                    defaultValue={String(sku[f.key] ?? "")}
                                    onBlur={(e) => {
                                      const val = f.number
                                        ? Number(e.target.value)
                                        : e.target.value;
                                      handleFieldBlur(sku, f.key, f.label, val);
                                    }}
                                    className="ZENVE-editor-input"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* MERCHANDISING FLAGS SWITCHES */}
                        <div className="ZENVE-editor-section">
                          <span className="ZENVE-label-caps">Merchandising flags</span>
                          <div className="ZENVE-merch-flags-grid">
                            {MERCHANDISING_FLAGS.map((f) => (
                              <label key={f.key} className="ZENVE-merch-flag-item">
                                <span>{f.label}</span>
                                <Switch
                                  checked={!!sku[f.key]}
                                  onChange={() => handleToggleMerchFlag(sku, f.key, f.label)}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
