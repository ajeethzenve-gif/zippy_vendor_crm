import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/Inventory.css";
import SearchBar from "../components/SearchBar";
import {
  getProducts,
  updateProduct,
  adjustProductStock,
  getDesigners,
  getOrders,
} from "../services/api";
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
   CONSTANTS & MAPPINGS
========================================================= */

const HUBS = ["Mumbai FC", "Bengaluru FC", "Kochi FC", "Chennai FC"];

const MOVEMENT_TONE = {
  FAST: "good",
  SLOW: "warn",
  DEAD: "bad",
  NO_STOCK: "neutral",
};

const MOVEMENT_LABEL = {
  FAST: "Fast moving",
  SLOW: "Slow moving",
  DEAD: "Dead stock",
  NO_STOCK: "No stock yet",
};

function normalizeHub(raw) {
  if (!raw) return "Mumbai FC";
  const str = String(raw).trim();
  const lower = str.toLowerCase();
  if (lower.includes("bengaluru") || lower.includes("bangalore")) return "Bengaluru FC";
  if (lower.includes("kochi") || lower.includes("cochin")) return "Kochi FC";
  if (lower.includes("chennai") || lower.includes("madras")) return "Chennai FC";
  if (lower.includes("mumbai")) return "Mumbai FC";
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* =========================================================
   INVENTORY & WAREHOUSING COMPONENT (05)
========================================================= */

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Per-SKU quantity input state
  const [quantities, setQuantities] = useState({});
  const [processingId, setProcessingId] = useState(null);

  // Search filter for stock ledger
  const [searchQuery, setSearchQuery] = useState("");
  const [ledgerFilters, setLedgerFilters] = useState({ vendor: "", location: "", category: "", status: "", stock: "" });

  // Alert notification banner
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (alert) {
      showToast(alert);
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  /* -------------------------------------------------------
     FETCH LIVE DATA (PRODUCTS, DESIGNERS, ORDERS)
  ------------------------------------------------------- */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [prodsData, desData, ordData] = await Promise.all([
        getProducts().catch(() => []),
        getDesigners().catch(() => []),
        getOrders().catch(() => []),
      ]);

      setProducts(prodsData || []);
      setDesigners(desData || []);
      setOrders(ordData || []);
    } catch (err) {
      console.error("Failed to load inventory data:", err);
      setError("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* -------------------------------------------------------
     NORMALIZED PRODUCT RECORDS
  ------------------------------------------------------- */
  const normalizedProducts = useMemo(() => {
    return products.map((p) => {
      const physical = Number(p.physical_quantity ?? p.inventory_quantity ?? 0);
      const reserved = Number(p.reserved_quantity ?? 0);
      const damaged = Number(p.damaged_quantity ?? 0);
      const quarantined = Number(p.quarantined_quantity ?? 0);
      const transit = Number(p.in_transit_quantity ?? 0);
      const returned = Number(p.returned_quantity ?? 0);
      const available = Number(
        p.available_quantity ?? Math.max(0, physical - (reserved + damaged + quarantined))
      );
      const location = normalizeHub(p.fulfilment_location || p.location);
      const brand =
        p.designer_brand ||
        (p.designer && typeof p.designer === "object" ? p.designer.brand_name : null) ||
        (designers.find((d) => d.id === p.designer)?.brand_name) ||
        "Independent Studio";

      return {
        ...p,
        name: p.product_name || p.name || "Untitled SKU",
        sku: p.sku || `SKU-${p.id}`,
        physical,
        reserved,
        available,
        transit,
        returned,
        damaged,
        quarantined,
        location,
        brand,
        designerId: typeof p.designer === "object" ? p.designer?.id : p.designer,
      };
    });
  }, [products, designers]);

  /* -------------------------------------------------------
     TOP 4 TOTAL METRICS
  ------------------------------------------------------- */
  const totals = useMemo(() => {
    return normalizedProducts.reduce(
      (acc, p) => {
        acc.physical += p.physical;
        acc.reserved += p.reserved;
        acc.available += p.available;
        acc.blocked += p.damaged + p.quarantined;
        return acc;
      },
      { physical: 0, reserved: 0, available: 0, blocked: 0 }
    );
  }, [normalizedProducts]);

  /* -------------------------------------------------------
     SALES VELOCITY & FORECAST METRICS (LAST 30 DAYS)
  ------------------------------------------------------- */
  const forecastItems = useMemo(() => {
    const days = 30;
    const cutoff = Date.now() - days * 86400000;
    const salesMap = new Map();

    // Aggregate sold units from delivered orders in the last 30 days
    orders
      .filter((o) => {
        const orderDate = new Date(o.created_at || o.placedAt || 0).getTime();
        return o.status === "DELIVERED" && orderDate >= cutoff;
      })
      .forEach((o) => {
        (o.items || o.lines || []).forEach((line) => {
          const qty = Number(line.quantity || line.qty || 0);
          const price = Number(line.unit_price || line.price || 0);
          const skuKey = line.sku || line.skuId;
          const prodId = line.product || line.product_id;

          [skuKey, prodId ? String(prodId) : null].forEach((k) => {
            if (!k) return;
            const cur = salesMap.get(k) || { units: 0, revenue: 0 };
            salesMap.set(k, { units: cur.units + qty, revenue: cur.revenue + qty * price });
          });
        });
      });

    return normalizedProducts.map((sku) => {
      const sales =
        salesMap.get(sku.sku) ||
        salesMap.get(String(sku.id)) || {
          units: Number(sku.units_sold || 0),
          revenue: 0,
        };

      const velocity = sales.units / days;
      const available = sku.available;
      const daysOfStock =
        velocity > 0
          ? Math.round(available / velocity)
          : available > 0
            ? sku.days_of_stock || null
            : null;

      // Reorder point covers 10 days of velocity (Math.ceil(velocity * 10), min 2)
      const reorderPoint = Math.max(2, Math.ceil(velocity * 10));

      // Stock age in days
      const createdAt = sku.created_at ? new Date(sku.created_at).getTime() : null;
      const ageingDays = createdAt ? Math.max(0, Math.round((Date.now() - createdAt) / 86400000)) : null;

      let movement = "NO_STOCK";
      if (available === 0 && sales.units === 0) {
        movement = "NO_STOCK";
      } else if (sales.units === 0) {
        movement = "DEAD";
      } else if (velocity * 30 >= 2) {
        movement = "FAST";
      } else {
        movement = "SLOW";
      }

      return {
        sku,
        available,
        physical: sku.physical,
        velocity,
        daysOfStock,
        reorderPoint,
        ageingDays,
        movement,
        units30: sales.units,
        revenue30: sales.revenue,
      };
    });
  }, [normalizedProducts, orders]);

  // Sub-KPI counts
  const reorderList = useMemo(
    () => forecastItems.filter((f) => f.available <= f.reorderPoint),
    [forecastItems]
  );
  const deadList = useMemo(
    () => forecastItems.filter((f) => f.movement === "DEAD"),
    [forecastItems]
  );
  const fastList = useMemo(
    () => forecastItems.filter((f) => f.movement === "FAST"),
    [forecastItems]
  );

  /* -------------------------------------------------------
     STOCK BY HUB & STOCK BY DESIGNER
  ------------------------------------------------------- */
  const stockByHub = useMemo(() => {
    return HUBS.map((hub) => {
      const matching = normalizedProducts.filter((p) => p.location === hub);
      const units = matching.reduce((acc, p) => acc + p.available, 0);
      return {
        loc: hub,
        skus: matching.length,
        units,
      };
    });
  }, [normalizedProducts]);

  const stockByDesigner = useMemo(() => {
    // Map existing designers + any unique brands from products
    const brandsMap = new Map();

    designers.forEach((d) => {
      brandsMap.set(d.brand_name || d.brand, { brand: d.brand_name || d.brand, id: d.id, units: 0, skus: 0 });
    });

    normalizedProducts.forEach((p) => {
      const bName = p.brand;
      if (!brandsMap.has(bName)) {
        brandsMap.set(bName, { brand: bName, id: p.designerId, units: 0, skus: 0 });
      }
      const entry = brandsMap.get(bName);
      entry.skus += 1;
      entry.units += p.available;
    });

    return Array.from(brandsMap.values());
  }, [designers, normalizedProducts]);

  /* -------------------------------------------------------
     FILTERED PRODUCTS FOR STOCK LEDGER
  ------------------------------------------------------- */
  const filteredLedgerProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return normalizedProducts.filter(p => {
      if (q && ![p.sku, p.name, p.brand, p.location, p.category].filter(Boolean).join(" ").toLowerCase().includes(q)) return false;
      if (ledgerFilters.vendor && String(p.designerId) !== ledgerFilters.vendor) return false;
      if (["location", "category", "status"].some(field => ledgerFilters[field] && p[field] !== ledgerFilters[field])) return false;
      const threshold = Number(p.low_stock_threshold ?? 5);
      return !ledgerFilters.stock || ({ available: p.available > 0, low: p.available > 0 && p.available <= threshold, out: p.available <= 0, reserved: p.reserved > 0, blocked: p.damaged + p.quarantined > 0, transit: p.transit > 0, returned: p.returned > 0 })[ledgerFilters.stock];
    });
  }, [normalizedProducts, searchQuery, ledgerFilters]);

  const ledgerFilterOptions = useMemo(() => ({
    vendors: [...new Map(normalizedProducts.filter(p => p.designerId != null).map(p => [String(p.designerId), p.brand])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    ...Object.fromEntries(["location", "category", "status"].map(field => [field, [...new Set(normalizedProducts.map(p => p[field]).filter(Boolean))].sort()])),
  }), [normalizedProducts]);

  /* -------------------------------------------------------
     OPERATIONAL ACTION HANDLERS
  ------------------------------------------------------- */
  const parseQty = (id) => {
    const val = Number(quantities[id]);
    return Number.isFinite(val) && val > 0 ? Math.floor(val) : 0;
  };

  const handleReceive = async (id) => {
    const qty = parseQty(id);
    if (!qty) {
      setAlert({ type: "error", text: "Enter a valid quantity to receive" });
      return;
    }

    try {
      setProcessingId(id);
      await adjustProductStock(id, "receive", qty);
      setQuantities((prev) => ({ ...prev, [id]: "" }));
      setAlert({ type: "success", text: `Received ${qty} units (GRN logged)` });
      await loadData();
    } catch (err) {
      console.error("Receive stock error:", err);
      setAlert({ type: "error", text: `Failed to receive stock: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkDamaged = async (id) => {
    const qty = parseQty(id);
    const prod = normalizedProducts.find((p) => p.id === id);
    if (!qty) {
      setAlert({ type: "error", text: "Enter a valid quantity" });
      return;
    }
    if (!prod || prod.available < qty) {
      setAlert({ type: "error", text: "Not enough available units to mark damaged" });
      return;
    }

    try {
      setProcessingId(id);
      await adjustProductStock(id, "damage", qty);
      setQuantities((prev) => ({ ...prev, [id]: "" }));
      setAlert({ type: "success", text: `${qty} units marked damaged` });
      await loadData();
    } catch (err) {
      console.error("Mark damaged error:", err);
      setAlert({ type: "error", text: `Failed to mark damaged: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuarantine = async (id) => {
    const qty = parseQty(id);
    const prod = normalizedProducts.find((p) => p.id === id);
    if (!qty) {
      setAlert({ type: "error", text: "Enter a valid quantity" });
      return;
    }
    if (!prod || prod.available < qty) {
      setAlert({ type: "error", text: "Not enough available units to quarantine" });
      return;
    }

    try {
      setProcessingId(id);
      await adjustProductStock(id, "quarantine", qty);
      setQuantities((prev) => ({ ...prev, [id]: "" }));
      setAlert({ type: "success", text: `${qty} units quarantined` });
      await loadData();
    } catch (err) {
      console.error("Quarantine error:", err);
      setAlert({ type: "error", text: `Failed to quarantine stock: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReleaseQuarantine = async (id) => {
    const prod = normalizedProducts.find((p) => p.id === id);
    if (!prod || prod.quarantined === 0) {
      setAlert({ type: "error", text: "No units in quarantine to release" });
      return;
    }

    const inputQty = parseQty(id);
    const qty = Math.min(inputQty || 1, prod.quarantined);

    try {
      setProcessingId(id);
      await adjustProductStock(id, "release_quarantine", qty);
      setQuantities((prev) => ({ ...prev, [id]: "" }));
      setAlert({ type: "success", text: `${qty} units released back to available` });
      await loadData();
    } catch (err) {
      console.error("Release quarantine error:", err);
      setAlert({ type: "error", text: `Failed to release quarantine: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleLocationChange = async (id, newLocation) => {
    try {
      setProcessingId(id);
      await updateProduct(id, { fulfilment_location: newLocation });
      setAlert({ type: "success", text: `Stock location updated to ${newLocation}` });
      await loadData();
    } catch (err) {
      console.error("Update location error:", err);
      setAlert({ type: "error", text: `Failed to update location: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <div className="ZENVE-inventory-layout">
      {/* =====================================================
          HEADER SECTION
      ===================================================== */}
      <header className="ZENVE-inv-header">
        <div className="ZENVE-header-left">
          <div className="ZENVE-header-title-block">
            <h1 className="ZENVE-portal-title">
              <span className="ZENVE-layer-num">05</span>
              <span>Inventory Engine</span>
            </h1>

            <p className="ZENVE-portal-desc">
              Inventory layer · Physical, reserved, available, damaged, returned, in-transit
            </p>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN BODY
      ===================================================== */}
      <main className="ZENVE-inv-main">
        {/* TOAST / ALERT NOTIFICATION */}
        {alert && alert.type !== "success" && (
          <div className={`ZENVE-inv-alert ${alert.type}`}>
            <span>{alert.text}</span>
            <button
              type="button"
              className="ZENVE-alert-close"
              onClick={() => setAlert(null)}
              aria-label="Close alert"
            >
              ×
            </button>
          </div>
        )}

        {/* ===================================================
            TOP 4 SUMMARY KPI CARDS
        =================================================== */}
        <section className="ZENVE-inv-kpi-grid">
          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Physical</span>
            <strong className="ZENVE-kpi-value">{totals.physical}</strong>
            <span className="ZENVE-kpi-hint">Units on hand</span>
          </div>

          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Reserved</span>
            <strong className="ZENVE-kpi-value">{totals.reserved}</strong>
            <span className="ZENVE-kpi-hint">Held by live orders</span>
          </div>

          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Available</span>
            <strong className="ZENVE-kpi-value">{totals.available}</strong>
            <span className="ZENVE-kpi-hint">Sellable now</span>
          </div>

          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Blocked</span>
            <strong className="ZENVE-kpi-value">{totals.blocked}</strong>
            <span className="ZENVE-kpi-hint">Damaged + quarantined</span>
          </div>
        </section>

        {/* ===================================================
            FORECAST & REPLENISHMENT SECTION
        =================================================== */}
        <section className="ZENVE-panel-card">
          <div className="ZENVE-panel-header">
            <h2 className="ZENVE-panel-title">Forecast & replenishment</h2>
            <p className="ZENVE-panel-desc">
              Velocity is units sold per day over the last 30 days. Reorder point covers 10 days of that velocity.
            </p>
          </div>

          {/* 3 SUB-KPIS */}
          <div className="ZENVE-forecast-sub-kpis">
            <div className="ZENVE-kpi-card">
              <span className="ZENVE-kpi-label">At or below reorder point</span>
              <strong className="ZENVE-kpi-value">{reorderList.length}</strong>
              <span className="ZENVE-kpi-hint">Raise a PO</span>
            </div>

            <div className="ZENVE-kpi-card">
              <span className="ZENVE-kpi-label">Dead stock SKUs</span>
              <strong className="ZENVE-kpi-value">{deadList.length}</strong>
              <span className="ZENVE-kpi-hint">No sales in 30 days</span>
            </div>

            <div className="ZENVE-kpi-card">
              <span className="ZENVE-kpi-label">Fast moving</span>
              <strong className="ZENVE-kpi-value">{fastList.length}</strong>
              <span className="ZENVE-kpi-hint">Protect availability</span>
            </div>
          </div>

          {/* FORECAST TABLE */}
          <div className="ZENVE-table-wrap">
            <table className="ZENVE-forecast-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Available</th>
                  <th>Velocity / day</th>
                  <th>Days of stock</th>
                  <th>Reorder point</th>
                  <th>Stock age</th>
                  <th>Movement</th>
                </tr>
              </thead>
              <tbody>
                {forecastItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--ZENVE-muted)" }}>
                      No SKUs in catalogue yet.
                    </td>
                  </tr>
                ) : (
                  forecastItems.map((item) => (
                    <tr key={item.sku.id}>
                      <td>
                        <div className="sku-cell">
                          <p className="sku-cell-name">{item.sku.name}</p>
                          <p className="sku-cell-id">{item.sku.sku}</p>
                        </div>
                      </td>
                      <td>{item.available}</td>
                      <td>{item.velocity.toFixed(2)}</td>
                      <td>{item.daysOfStock === null ? "—" : `${item.daysOfStock} d`}</td>
                      <td>
                        <span>{item.reorderPoint}</span>
                        {item.available <= item.reorderPoint && (
                          <span className="ZENVE-tone-badge warn ml-2">Reorder</span>
                        )}
                      </td>
                      <td>{item.ageingDays === null ? "—" : `${item.ageingDays} d`}</td>
                      <td>
                        <span className={`ZENVE-tone-badge ${MOVEMENT_TONE[item.movement]}`}>
                          {MOVEMENT_LABEL[item.movement]}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===================================================
            TWO-COLUMN DISTRIBUTION (STOCK BY HUB / BY DESIGNER)
        =================================================== */}
        <section className="ZENVE-inv-two-col">
          {/* STOCK BY HUB */}
          <div className="ZENVE-panel-card">
            <div className="ZENVE-panel-header">
              <h2 className="ZENVE-panel-title">Stock by Inventory</h2>
              <p className="ZENVE-panel-desc">Where sellable units physically sit.</p>
            </div>

            <div className="ZENVE-hub-designer-list">
              {stockByHub.map((hub) => (
                <div key={hub.loc} className="ZENVE-dist-row">
                  <span className="dist-name">{hub.loc}</span>
                  <span className="dist-skus">{hub.skus} SKUs</span>
                  <span className="dist-units">{hub.units}</span>
                </div>
              ))}
            </div>
          </div>

          {/* STOCK BY DESIGNER */}
          <div className="ZENVE-panel-card">
            <div className="ZENVE-panel-header">
              <h2 className="ZENVE-panel-title">Stock by vendor</h2>
              <p className="ZENVE-panel-desc">Availability owned by each partner brand.</p>
            </div>

            <div className="ZENVE-hub-designer-list">
              {stockByDesigner.length === 0 ? (
                <div className="ZENVE-empty-state">
                  <span>No vendors found</span>
                </div>
              ) : (
                stockByDesigner.map((des) => (
                  <div key={des.brand} className="ZENVE-dist-row">
                    <span className="dist-name">{des.brand}</span>
                    <span className="dist-skus">{des.skus} SKUs</span>
                    <span className="dist-units">{des.units}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ===================================================
            STOCK LEDGER SECTION
        =================================================== */}
        <section className="ZENVE-panel-card">
          <div className="ZENVE-panel-header">
            <div className="ZENVE-panel-title-row">
              <div>
                <h2 className="ZENVE-panel-title">Stock ledger</h2>
                <p className="ZENVE-panel-desc">
                  Only available units are sellable. Receiving stock, damage and quarantine are all logged.
                </p>
              </div>

              <input
                type="text"
                className="ZENVE-ledger-search-box"
                placeholder="Filter ledger SKUs..."
                aria-label="Search stock ledger"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="ZENVE-inventory-filters" aria-label="Stock ledger filters">
            <label>Vendor<select value={ledgerFilters.vendor} onChange={event => setLedgerFilters(previous => ({ ...previous, vendor: event.target.value }))}><option value="">All vendors</option>{ledgerFilterOptions.vendors.map(([id, brand]) => <option key={id} value={id}>{brand}</option>)}</select></label>
            {[["location", "Location"], ["category", "Category"], ["status", "Product status"]].map(([field, label]) => <label key={field}>{label}<select value={ledgerFilters[field]} onChange={event => setLedgerFilters(previous => ({ ...previous, [field]: event.target.value }))}><option value="">All {label.toLowerCase()}</option>{ledgerFilterOptions[field].map(value => <option key={value} value={value}>{String(value).replace(/_/g, " ")}</option>)}</select></label>)}
            <label>Stock condition<select value={ledgerFilters.stock} onChange={event => setLedgerFilters(previous => ({ ...previous, stock: event.target.value }))}><option value="">All stock</option>{[["available", "In stock"], ["low", "Low stock"], ["out", "Out of stock"], ["reserved", "Reserved"], ["blocked", "Damaged / quarantined"], ["transit", "In transit"], ["returned", "Returned"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <div className="ZENVE-inventory-filter-summary"><span aria-live="polite">{loading ? "Loading…" : `${filteredLedgerProducts.length} of ${normalizedProducts.length} SKUs shown`} · Filters apply to the stock ledger</span><button type="button" className="ZENVE-btn ZENVE-btn-outline" onClick={() => { setSearchQuery(""); setLedgerFilters({ vendor: "", location: "", category: "", status: "", stock: "" }); }} disabled={!searchQuery && !Object.values(ledgerFilters).some(Boolean)}>Clear filters</button></div>

          {loading ? (
            <div className="ZENVE-empty-state">
              <strong>Loading inventory ledger...</strong>
              <p>Connecting to live Zippy Vendor CRM database...</p>
            </div>
          ) : error ? (
            <div className="ZENVE-empty-state">
              <strong style={{ color: "#9f1239" }}>{error}</strong>
              <p>
                <button
                  type="button"
                  className="ZENVE-btn ZENVE-btn-outline"
                  style={{ marginTop: "12px" }}
                  onClick={loadData}
                >
                  Retry Connection
                </button>
              </p>
            </div>
          ) : filteredLedgerProducts.length === 0 ? (
            <div className="ZENVE-empty-state">
              <strong>{normalizedProducts.length ? "No products match your filters." : "No SKUs in the catalogue yet."}</strong>
              <p>{normalizedProducts.length ? "Try another search or clear the filters." : "Products uploaded in Layer 02 or 03 will automatically populate the live ledger."}</p>
            </div>
          ) : (
            <div className="ZENVE-ledger-stack">
              {filteredLedgerProducts.map((item) => (
                <div key={item.id} className="ZENVE-ledger-card">
                  {/* HEADER ROW */}
                  <div className="ZENVE-ledger-header-row">
                    <h3 className="ZENVE-ledger-sku-title">{item.name}</h3>

                    {item.available === 0 && (
                      <span className="ZENVE-tone-badge bad">Out of stock</span>
                    )}
                    {item.available > 0 && item.available <= 2 && (
                      <span className="ZENVE-tone-badge warn">Low stock</span>
                    )}

                    <span className="ZENVE-tone-badge info">{item.location}</span>
                  </div>

                  <p className="ZENVE-ledger-sku-id">{item.sku}</p>

                  {/* 7-METRIC BREAKDOWN GRID */}
                  <div className="ZENVE-ledger-metrics-grid">
                    <div className="ZENVE-metric-tile">
                      <p className="tile-label">Physical</p>
                      <p className="tile-value">{item.physical}</p>
                    </div>

                    <div className="ZENVE-metric-tile">
                      <p className="tile-label">Reserved</p>
                      <p className="tile-value">{item.reserved}</p>
                    </div>

                    <div className="ZENVE-metric-tile">
                      <p className="tile-label">Available</p>
                      <p className="tile-value">{item.available}</p>
                    </div>

                    <div className="ZENVE-metric-tile">
                      <p className="tile-label">In transit</p>
                      <p className="tile-value">{item.transit}</p>
                    </div>

                    <div className="ZENVE-metric-tile">
                      <p className="tile-label">Returned</p>
                      <p className="tile-value">{item.returned}</p>
                    </div>

                    <div className="ZENVE-metric-tile">
                      <p className="tile-label">Damaged</p>
                      <p className="tile-value">{item.damaged}</p>
                    </div>

                    <div className="ZENVE-metric-tile">
                      <p className="tile-label">Quarantined</p>
                      <p className="tile-value">{item.quarantined}</p>
                    </div>
                  </div>

                  {/* ACTIONS ROW */}
                  <div className="ZENVE-ledger-actions-row">
                    <input
                      type="number"
                      min="1"
                      className="ZENVE-qty-input"
                      placeholder="Qty"
                      value={quantities[item.id] ?? ""}
                      onChange={(e) =>
                        setQuantities({ ...quantities, [item.id]: e.target.value })
                      }
                      disabled={processingId === item.id}
                    />

                    <button
                      type="button"
                      className="ZENVE-btn ZENVE-btn-primary"
                      onClick={() => handleReceive(item.id)}
                      disabled={processingId === item.id}
                    >
                      Receive (GRN)
                    </button>

                    <button
                      type="button"
                      className="ZENVE-btn ZENVE-btn-outline"
                      onClick={() => handleMarkDamaged(item.id)}
                      disabled={processingId === item.id || item.available <= 0}
                    >
                      Mark damaged
                    </button>

                    <button
                      type="button"
                      className="ZENVE-btn ZENVE-btn-outline"
                      onClick={() => handleQuarantine(item.id)}
                      disabled={processingId === item.id || item.available <= 0}
                    >
                      Quarantine
                    </button>

                    <button
                      type="button"
                      className="ZENVE-btn ZENVE-btn-outline"
                      onClick={() => handleReleaseQuarantine(item.id)}
                      disabled={processingId === item.id || item.quarantined <= 0}
                    >
                      Release quarantine
                    </button>

                    <select
                      className="ZENVE-hub-select"
                      value={item.location}
                      onChange={(e) => handleLocationChange(item.id, e.target.value)}
                      disabled={processingId === item.id}
                    >
                      {HUBS.map((hub) => (
                        <option key={hub} value={hub}>
                          {hub}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===================================================
            INVENTORY RULES IN FORCE
        =================================================== */}
        <section className="ZENVE-panel-card">
          <div className="ZENVE-panel-header">
            <h2 className="ZENVE-panel-title">Inventory rules in force</h2>
            <p className="ZENVE-panel-desc">Applied automatically by the order and returns engines.</p>
          </div>

          <ul className="ZENVE-rules-grid">
            {[
              "Order placed → Available −1, Reserved +1",
              "Shipped → Reserved −1, In transit +1",
              "Delivered → In transit −1, sold recorded",
              "Cancelled before dispatch → Reserved −1, Available +1",
              "Return received → Returned +1",
              "Return passed inspection → Returned −1, Available +1",
              "Return failed → Returned −1, Damaged +1",
            ].map((rule) => (
              <li key={rule} className="ZENVE-rule-item">
                <span className="ZENVE-rule-bullet">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
