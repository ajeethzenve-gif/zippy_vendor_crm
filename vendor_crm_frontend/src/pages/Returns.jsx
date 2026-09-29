import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/Returns.css";
import SearchBar from "../components/SearchBar";
import zenveLogo from "../assest/logo/zippy_logo.jpeg";
import {
  getReturns,
  createReturn,
  transitionReturn,
  getOrders,
  getProducts,
} from "../services/api";
import { showToast } from "../utils/zenveToast";

/* =========================================================
   ICONS
========================================================= */

function BackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M19 12H5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10 7L5 12L10 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function formatInr(val) {
  const num = Number(val) || 0;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}

function getTone(status) {
  const s = String(status || "").toUpperCase();
  if (
    [
      "APPROVED",
      "DELIVERED",
      "PASSED",
      "INSPECTED_PASSED",
      "PAID",
      "RECONCILED",
      "ACTIVE",
      "LIVE",
    ].includes(s)
  ) {
    return "good";
  }
  if (
    [
      "REJECTED",
      "CANCELLED",
      "FAILED",
      "INSPECTED_FAILED",
      "REVERSED",
    ].includes(s)
  ) {
    return "bad";
  }
  if (
    [
      "PENDING_QA",
      "CORRECTION",
      "PENDING",
      "REQUESTED",
      "RECEIVED",
      "PICKUP_SCHEDULED",
    ].includes(s)
  ) {
    return "warn";
  }
  return "info";
}

function getNextActionLabel(status) {
  const s = String(status || "").toUpperCase();
  if (s === "REQUESTED") return "Schedule pickup";
  if (s === "PICKUP_SCHEDULED") return "Mark received";
  if (s === "RECEIVED") return "Inspect";
  if (s === "REFUNDED") return "Closed";
  return "Issue refund";
}

/* =========================================================
   REVERSE LOGISTICS / RETURNS COMPONENT (09)
   Direct match to https://zenvefashioncm.ZENVE.app/returns
========================================================= */

export default function Returns() {
  const [returns, setReturns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedItemSku, setSelectedItemSku] = useState("");
  const [reason, setReason] = useState("Size did not fit");

  // Interaction feedback states
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (alert) {
      showToast(alert);
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  /* -------------------------------------------------------
     FETCH LIVE DATA FROM DJANGO BACKEND
  ------------------------------------------------------- */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [returnsData, ordersData, productsData] = await Promise.all([
        getReturns().catch((err) => {
          console.error("Failed to load returns:", err);
          return [];
        }),
        getOrders().catch((err) => {
          console.error("Failed to load orders:", err);
          return [];
        }),
        getProducts().catch((err) => {
          console.error("Failed to load products:", err);
          return [];
        }),
      ]);

      setReturns(Array.isArray(returnsData) ? returnsData : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error("Failed to fetch returns data:", err);
      setError("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* -------------------------------------------------------
     FILTERED DELIVERED ORDERS
     Only delivered orders can be returned per policy
  ------------------------------------------------------- */
  const deliveredOrders = useMemo(() => {
    return orders.filter(
      (o) => String(o.status).toUpperCase() === "DELIVERED"
    );
  }, [orders]);

  const activeOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return (
      deliveredOrders.find(
        (o) =>
          String(o.id) === String(selectedOrderId) ||
          o.order_number === selectedOrderId
      ) || null
    );
  }, [deliveredOrders, selectedOrderId]);

  /* -------------------------------------------------------
     KPI METRICS
  ------------------------------------------------------- */
  const openReturnsCount = useMemo(() => {
    return returns.filter(
      (r) =>
        String(r.status).toUpperCase() !== "REFUNDED" &&
        String(r.normalized_status || "").toUpperCase() !== "REFUNDED"
    ).length;
  }, [returns]);

  const awaitingInspectionCount = useMemo(() => {
    return returns.filter(
      (r) =>
        String(r.status).toUpperCase() === "RECEIVED" ||
        String(r.normalized_status || "").toUpperCase() === "RECEIVED"
    ).length;
  }, [returns]);

  const failedQcCount = useMemo(() => {
    return returns.filter(
      (r) =>
        String(r.status).toUpperCase() === "FAILED" ||
        String(r.status).toUpperCase() === "INSPECTED_FAILED" ||
        String(r.normalized_status || "").toUpperCase() === "FAILED"
    ).length;
  }, [returns]);

  const totalRefundValue = useMemo(() => {
    return returns
      .filter(
        (r) =>
          String(r.status).toUpperCase() === "REFUNDED" ||
          String(r.normalized_status || "").toUpperCase() === "REFUNDED"
      )
      .reduce((acc, r) => acc + (Number(r.refund || r.refund_amount) || 0), 0);
  }, [returns]);

  /* -------------------------------------------------------
     SUBMIT NEW RETURN REQUEST
  ------------------------------------------------------- */
  const handleCreateReturn = async (e) => {
    e?.preventDefault();

    if (!selectedOrderId || !selectedItemSku) {
      setAlert({
        type: "error",
        text: "Pick a delivered order and an item",
      });
      return;
    }

    if (!activeOrder) {
      setAlert({
        type: "error",
        text: "Only delivered orders can be returned",
      });
      return;
    }

    // Find the item line inside the delivered order
    const lineItem = (activeOrder.lines || activeOrder.items || []).find(
      (l) => (l.skuId || l.sku) === selectedItemSku
    );

    // Cross reference with products catalogue to verify return policy
    const matchedProduct = products.find(
      (p) => p.sku === selectedItemSku || p.id === lineItem?.product
    );

    const isReturnable =
      matchedProduct?.returnable !== false &&
      matchedProduct?.return_policy !== "FINAL_SALE" &&
      lineItem?.return_policy !== "FINAL_SALE";

    if (!isReturnable) {
      setAlert({
        type: "error",
        text: "This SKU is final sale (policy check failed)",
      });
      return;
    }

    // Check if duplicate return exists
    const alreadyExists = returns.some(
      (r) =>
        (String(r.order) === String(activeOrder.id) ||
          r.order_number === activeOrder.order_number ||
          r.orderId === activeOrder.order_number) &&
        (r.sku === selectedItemSku || r.skuId === selectedItemSku) &&
        r.status !== "REJECTED"
    );

    if (alreadyExists) {
      setAlert({
        type: "error",
        text: "A return already exists for this item",
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        order: activeOrder.id,
        orderId: activeOrder.order_number,
        order_item: lineItem?.id,
        sku: selectedItemSku,
        skuId: selectedItemSku,
        reason: reason.trim() || "Not specified",
      };

      const newReturn = await createReturn(payload);
      setAlert({
        type: "success",
        text: `${newReturn.return_number || `RMA-${newReturn.id}`} raised`,
      });

      // Reset item selection
      setSelectedItemSku("");
      // Reload fresh data from backend
      loadData();
    } catch (err) {
      console.error("Failed to create return:", err);
      setAlert({
        type: "error",
        text: err.message || "Failed to create return request",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------------------------------------
     ADVANCE RETURN STATUS
  ------------------------------------------------------- */
  const handleAdvance = async (ret) => {
    try {
      setActionLoadingId(ret.id);
      const updated = await transitionReturn(ret.id);
      setAlert({
        type: "success",
        text: `${ret.return_number || `RMA-${ret.id}`} updated`,
      });
      setReturns((prev) =>
        prev.map((r) => (r.id === ret.id ? { ...r, ...updated } : r))
      );
    } catch (err) {
      console.error("Failed to advance return:", err);
      setAlert({
        type: "error",
        text: err.message || "Failed to advance return status",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  /* -------------------------------------------------------
     INSPECT OUTCOME (PASSED vs FAILED)
  ------------------------------------------------------- */
  const handleInspect = async (retId, outcome) => {
    try {
      setActionLoadingId(retId);
      const updated = await transitionReturn(retId, outcome);
      if (outcome === "PASSED") {
        setAlert({
          type: "success",
          text: "Inspection passed — unit back to available",
        });
      } else {
        setAlert({
          type: "success",
          text: "Inspection failed — unit marked damaged",
        });
      }
      setReturns((prev) =>
        prev.map((r) => (r.id === retId ? { ...r, ...updated } : r))
      );
    } catch (err) {
      console.error("Failed to record inspection outcome:", err);
      setAlert({
        type: "error",
        text: err.message || "Failed to update inspection status",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="ZENVE-returns-layout">
      {/* =====================================================
          HEADER SECTION
      ===================================================== */}
      <header className="ZENVE-returns-header">
        <div className="ZENVE-header-left">
          <Link to="/" className="ZENVE-portal-logo" aria-label="Go to home">
            <img src={zenveLogo} alt="Zippy Vendor CRM" />
          </Link>

          <div className="ZENVE-header-title-block">
            <Link to="/" className="ZENVE-back-link">
              <BackIcon />
              <span>ALL 12 LAYERS</span>
            </Link>

            <h1 className="ZENVE-portal-title">
              <span className="ZENVE-layer-num">09</span>
              <span>Returns Engine</span>
            </h1>

            <p className="ZENVE-portal-desc">
              Returns layer · Request, pickup, inspection, refund / exchange
            </p>
          </div>
        </div>

        <div className="ZENVE-header-right">
          <SearchBar />
        </div>
      </header>

      {/* =====================================================
          MAIN CONTENT AREA
      ===================================================== */}
      <main className="ZENVE-returns-main">
        {/* TOAST NOTIFICATION BANNER */}
        {alert && alert.type !== "success" && (
          <div className={`ZENVE-returns-alert ${alert.type}`}>
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

        {/* ERROR BANNER */}
        {error && (
          <div className="ZENVE-returns-alert error">
            <span>{error}</span>
            <button
              type="button"
              className="ZENVE-alert-close"
              onClick={loadData}
              aria-label="Retry loading data"
            >
              Retry
            </button>
          </div>
        )}

        {/* ===================================================
            TOP 4 KPI METRIC CARDS
        =================================================== */}
        <section className="ZENVE-returns-kpi-grid">
          {/* OPEN RETURNS */}
          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Open returns</span>
            <strong className="ZENVE-kpi-value">{openReturnsCount}</strong>
          </div>

          {/* AWAITING INSPECTION */}
          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Awaiting inspection</span>
            <strong className="ZENVE-kpi-value">
              {awaitingInspectionCount}
            </strong>
          </div>

          {/* FAILED QC */}
          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Failed QC</span>
            <strong className="ZENVE-kpi-value">{failedQcCount}</strong>
          </div>

          {/* REFUND VALUE */}
          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Refund value</span>
            <strong className="ZENVE-kpi-value">
              {formatInr(totalRefundValue)}
            </strong>
          </div>
        </section>

        {/* ===================================================
            RAISE A RETURN PANEL
        =================================================== */}
        <section className="ZENVE-panel-card">
          <div className="ZENVE-panel-header">
            <div className="ZENVE-panel-title-block">
              <h2 className="ZENVE-panel-title">Raise a return</h2>
              <p className="ZENVE-panel-desc">
                Only delivered orders and returnable SKUs pass the policy check.
              </p>
            </div>
          </div>

          {deliveredOrders.length === 0 ? (
            <div className="ZENVE-empty-box">
              No delivered orders yet — deliver an order in the OMS layer first.
            </div>
          ) : (
            <form
              className="ZENVE-raise-return-form"
              onSubmit={handleCreateReturn}
            >
              {/* DELIVERED ORDER SELECT */}
              <div className="ZENVE-form-field">
                <label htmlFor="return-order-select">Delivered order</label>
                <select
                  id="return-order-select"
                  className="ZENVE-select"
                  style={{ minWidth: "220px" }}
                  value={selectedOrderId}
                  onChange={(e) => {
                    setSelectedOrderId(e.target.value);
                    setSelectedItemSku("");
                  }}
                >
                  <option value="">Select order</option>
                  {deliveredOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number || `ORD-${o.id}`} · {o.customer_name || o.customer}
                    </option>
                  ))}
                </select>
              </div>

              {/* ITEM SELECT */}
              <div className="ZENVE-form-field">
                <label htmlFor="return-item-select">Item</label>
                <select
                  id="return-item-select"
                  className="ZENVE-select"
                  style={{ minWidth: "260px" }}
                  value={selectedItemSku}
                  disabled={!activeOrder}
                  onChange={(e) => setSelectedItemSku(e.target.value)}
                >
                  <option value="">Select item</option>
                  {activeOrder &&
                    (activeOrder.lines || activeOrder.items || []).map((l) => {
                      const sku = l.skuId || l.sku;
                      const name = l.name || l.product_name || sku;
                      return (
                        <option key={sku || l.id} value={sku}>
                          {name}
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* REASON INPUT */}
              <div className="ZENVE-form-field">
                <label htmlFor="return-reason-input">Reason</label>
                <input
                  id="return-reason-input"
                  type="text"
                  className="ZENVE-input"
                  style={{ minWidth: "220px" }}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              {/* CREATE BUTTON */}
              <button
                type="submit"
                className="ZENVE-btn-primary"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create return"}
              </button>
            </form>
          )}
        </section>

        {/* ===================================================
            RETURN WORKFLOW PANEL
        =================================================== */}
        <section className="ZENVE-panel-card">
          <div className="ZENVE-panel-header">
            <div className="ZENVE-panel-title-block">
              <h2 className="ZENVE-panel-title">Return workflow</h2>
              <p className="ZENVE-panel-desc">
                Requested → pickup → received → inspected → refunded. Inspection
                decides whether stock becomes sellable again.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="ZENVE-empty-box">
              Loading returns from reverse logistics engine...
            </div>
          ) : returns.length === 0 ? (
            <div className="ZENVE-empty-box">No returns raised.</div>
          ) : (
            <div className="ZENVE-returns-list">
              {returns.map((ret) => {
                const currentStatus = (
                  ret.normalized_status ||
                  ret.status ||
                  ""
                ).toUpperCase();
                const isReceived = currentStatus === "RECEIVED";
                const isRefunded = currentStatus === "REFUNDED";
                const returnIdDisplay =
                  ret.return_number || `RMA-${3000 + Number(ret.id || 0)}`;
                const orderIdDisplay =
                  ret.order_number || ret.orderId || `ORD-${ret.order}`;
                const skuTitle =
                  ret.skuName ||
                  ret.product_name ||
                  products.find((p) => p.sku === (ret.skuId || ret.sku))?.name ||
                  ret.skuId ||
                  ret.sku;
                const refundAmount = Number(ret.refund ?? ret.refund_amount) || 0;

                return (
                  <div key={ret.id} className="ZENVE-return-card">
                    <div className="ZENVE-return-top">
                      <h3 className="ZENVE-return-id">{returnIdDisplay}</h3>
                      <span
                        className={`ZENVE-tone-badge ${getTone(
                          currentStatus
                        )}`}
                      >
                        {currentStatus.replace(/_/g, " ")}
                      </span>
                      <span className="ZENVE-tone-badge neutral">
                        {orderIdDisplay}
                      </span>
                    </div>

                    <p className="ZENVE-return-details">
                      {skuTitle} · {ret.reason || "Size did not fit"} · refund{" "}
                      {formatInr(refundAmount)}
                    </p>

                    <div className="ZENVE-return-actions">
                      {isReceived ? (
                        <>
                          <button
                            type="button"
                            className="ZENVE-btn-sm primary"
                            disabled={actionLoadingId === ret.id}
                            onClick={() => handleInspect(ret.id, "PASSED")}
                          >
                            Inspection passed
                          </button>
                          <button
                            type="button"
                            className="ZENVE-btn-sm danger-outline"
                            disabled={actionLoadingId === ret.id}
                            onClick={() => handleInspect(ret.id, "FAILED")}
                          >
                            Inspection failed
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="ZENVE-btn-sm outline"
                          disabled={isRefunded || actionLoadingId === ret.id}
                          onClick={() => handleAdvance(ret)}
                        >
                          {actionLoadingId === ret.id
                            ? "Updating..."
                            : getNextActionLabel(currentStatus)}
                        </button>
                      )}
                    </div>
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