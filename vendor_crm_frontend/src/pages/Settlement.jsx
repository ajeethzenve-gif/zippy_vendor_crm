import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "../styles/Settlement.css";
import SearchBar from "../components/SearchBar";
import {
  getSettlements,
  transitionSettlement,
  getDesigners,
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

function getStatusTone(status) {
  const s = String(status || "").toUpperCase();
  if (["APPROVED", "DELIVERED", "PASSED", "PAID", "RECONCILED", "ACTIVE", "LIVE"].includes(s)) {
    return "good";
  }
  if (["REJECTED", "CANCELLED", "FAILED", "REVERSED"].includes(s)) {
    return "bad";
  }
  if (["PENDING_QA", "CORRECTION", "PENDING", "REQUESTED", "RECEIVED"].includes(s)) {
    return "warn";
  }
  return "info";
}

const ACTION_LABELS = {
  PENDING: "Approve",
  APPROVED: "Mark paid",
  PAID: "Reconcile",
};

const INCLUDED_POINTS = [
  "GMV — customer realised merchandise value",
  "Take rate — vendor/category specific",
  "Discounts tracked to their funding source",
  "Returns reverse the affected settlement",
  "Taxes and invoicing rules applied",
  "Adjustments only with approval",
  "Net settlement is fully auditable",
  "Status: pending → approved → paid → reconciled",
];

/* =========================================================
   SETTLEMENT COMPONENT (10)
   Direct match to https://zenvefashioncm.ZENVE.app/settlement
========================================================= */

export default function Settlement() {
  const { getLayerDisplayNum } = useAuth();
  const [settlements, setSettlements] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (alert) {
      showToast(alert);
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  /* -------------------------------------------------------
     FETCH SETTLEMENTS & DESIGNERS FROM BACKEND
  ------------------------------------------------------- */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [settlementsData, designersData] = await Promise.all([
        getSettlements().catch((err) => {
          console.error("Failed to load settlements:", err);
          setError("Failed to load settlements. Please try again.");
          return null;
        }),
        getDesigners().catch((err) => {
          console.error("Failed to load vendors:", err);
          return [];
        }),
      ]);

      if (Array.isArray(settlementsData) && settlementsData.length > 0) {
        setSettlements(settlementsData);
      } else {
        // Empty or unavailable settlement data.
        setSettlements([]);
      }

      setDesigners(Array.isArray(designersData) ? designersData : []);
    } catch (err) {
      console.error("Failed to load settlement data:", err);
      setError("Failed to load settlements. Please try again.");
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* -------------------------------------------------------
     NORMALIZED SETTLEMENT ITEMS
  ------------------------------------------------------- */
  const normalizedSettlements = useMemo(() => {
    const sourceList = settlements;
    return sourceList.map((item) => {
      const id = item.settlement_number || `STL-${2000 + Number(item.id || 0)}`;
      const orderId =
        item.order_number ||
        item.orderId ||
        (item.order ? `ZO-${1000 + Number(item.order)}` : "—");
      const designerObj = designers.find(
        (d) => d.id === item.designer || d.id === item.designerId
      );
      const designerName =
        item.brand_name ||
        (typeof item.designer === "string" ? item.designer : null) ||
        designerObj?.brand_name ||
        designerObj?.designer_name ||
        "—";

      const gmv = Math.abs(Number(item.gmv) || 0);
      const takeRate = Number(item.takeRate ?? item.take_rate) || 15;
      const commission = Math.abs(Number(item.commission ?? item.commission_amount) || 0);
      const net = Math.abs(Number(item.net ?? item.payout_amount) || 0);
      const status = String(item.status || "PENDING").toUpperCase();
      const isReversal = Boolean(item.is_reversal || status === "REVERSED");

      return {
        ...item,
        displayId: id,
        displayOrderId: orderId,
        designerName,
        gmv,
        takeRate,
        commission,
        net,
        status,
        is_reversal: isReversal,
      };
    });
  }, [settlements, designers]);

  /* -------------------------------------------------------
     TOP 4 KPI METRICS
  ------------------------------------------------------- */
  const activeSettlements = useMemo(() => {
    return normalizedSettlements.filter(
      (s) => s.status !== "REVERSED" && !s.is_reversal && s.gmv > 0
    );
  }, [normalizedSettlements]);

  const settledGmv = useMemo(() => {
    return activeSettlements.reduce((acc, s) => acc + s.gmv, 0);
  }, [activeSettlements]);

  const zenveCommission = useMemo(() => {
    return activeSettlements.reduce((acc, s) => acc + s.commission, 0);
  }, [activeSettlements]);

  const payableToDesigners = useMemo(() => {
    return activeSettlements
      .filter((s) => s.status === "PENDING" || s.status === "APPROVED")
      .reduce((acc, s) => acc + Math.max(0, s.net), 0);
  }, [activeSettlements]);

  const reversedByReturnsCount = useMemo(() => {
    return normalizedSettlements.filter(
      (s) => s.status === "REVERSED" || s.is_reversal === true
    ).length;
  }, [normalizedSettlements]);

  /* -------------------------------------------------------
     ADVANCE SETTLEMENT STATUS
  ------------------------------------------------------- */
  const handleAdvance = async (item) => {
    const actionLabel = ACTION_LABELS[item.status] || "Update";
    try {
      setActionLoadingId(item.id);
      const nextStatus =
        item.status === "PENDING"
          ? "APPROVED"
          : item.status === "APPROVED"
            ? "PAID"
            : "RECONCILED";

      if (typeof item.id === "number" && item.id < 1000) {
        try {
          const updated = await transitionSettlement(item.id);
          setSettlements((prev) =>
            prev.map((s) => (s.id === item.id ? { ...s, ...updated } : s))
          );
        } catch (apiErr) {
          console.warn("API transition failed, updating locally:", apiErr);
          setSettlements((prev) =>
            prev.map((s) => (s.id === item.id ? { ...s, status: nextStatus } : s))
          );
        }
      } else {
        setSettlements((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, status: nextStatus } : s))
        );
      }

      setAlert({
        type: "success",
        text: `${item.displayId} advanced to ${nextStatus}`,
      });
    } catch (err) {
      console.error("Failed to advance settlement:", err);
      setAlert({
        type: "error",
        text: err.message || "Failed to update settlement",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="ZENVE-settlement-layout">
      {/* =====================================================
          HEADER SECTION
      ===================================================== */}
      <header className="ZENVE-settlement-header">
        <div className="ZENVE-header-left">
          <div className="ZENVE-header-title-block">
            <h1 className="ZENVE-portal-title">
              <span className="ZENVE-layer-num">{getLayerDisplayNum("10")}</span>
              <span>Settlement</span>
            </h1>

            <p className="ZENVE-portal-desc">
              Finance layer · Take rate, payout, refunds, reconciliation
            </p>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN CONTENT AREA
      ===================================================== */}
      <main className="ZENVE-settlement-main">
        {/* TOAST / ALERT BANNER */}
        {alert && alert.type !== "success" && (
          <div className={`ZENVE-settlement-alert ${alert.type}`}>
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
          <div className="ZENVE-settlement-alert error">
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
        <section className="ZENVE-settlement-kpi-grid">
          {/* SETTLED GMV */}
          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Settled GMV</span>
            <strong className="ZENVE-kpi-value">{formatInr(settledGmv)}</strong>
            <span className="ZENVE-kpi-hint">{activeSettlements.length} settlements</span>
          </div>

          {/* ZENVE COMMISSION */}
          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Zenve commission</span>
            <strong className="ZENVE-kpi-value">{formatInr(zenveCommission)}</strong>
            <span className="ZENVE-kpi-hint">Take rate earnings</span>
          </div>

          {/* PAYABLE TO DESIGNERS */}
          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Payable to vendors</span>
            <strong className="ZENVE-kpi-value">{formatInr(payableToDesigners)}</strong>
            <span className="ZENVE-kpi-hint">Not yet paid</span>
          </div>

          {/* REVERSED BY RETURNS */}
          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Reversed by returns</span>
            <strong className="ZENVE-kpi-value">{reversedByReturnsCount}</strong>
          </div>
        </section>

        {/* ===================================================
            SETTLEMENT LEDGER PANEL
        =================================================== */}
        <section className="ZENVE-panel-card">
          <div className="ZENVE-panel-header">
            <div className="ZENVE-panel-title-block">
              <h2 className="ZENVE-panel-title">Settlement ledger</h2>
              <p className="ZENVE-panel-desc">
                A settlement is created the moment an order is delivered, and reversed when a refund is issued.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="ZENVE-empty-box">
              Loading settlements from finance engine...
            </div>
          ) : normalizedSettlements.length === 0 ? (
            <div className="ZENVE-empty-box">
              No settlements yet — deliver an order in the OMS layer.
            </div>
          ) : (
            <div className="ZENVE-table-wrap">
              <table className="ZENVE-settlement-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>MRP</th>
                    <th>Price</th>
                    <th>Commission</th>
                    <th>Sold Product</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedSettlements.map((item) => {
                    const isReversed = item.status === "REVERSED";
                    const isReconciled = item.status === "RECONCILED";
                    const actionLabel = isReversed
                      ? "Reversed"
                      : isReconciled
                        ? "Reconciled"
                        : ACTION_LABELS[item.status] || "Reconciled";

                    return (
                      <tr key={item.id}>
                        <td>
                          <div>
                            <p>{item.designerName}</p>
                            <p className="settlement-cell-id">{item.displayId}</p>
                            <p className="settlement-cell-order">{item.displayOrderId}</p>
                          </div>
                        </td>

                        <td>{item.mrp == null ? "—" : formatInr(item.mrp)}</td>

                        <td>{item.unit_price == null ? "—" : formatInr(item.unit_price)}</td>

                        <td>{formatInr(item.commission)}</td>

                        <td>
                          <p className="settlement-cell-id">{item.product_name || "—"}</p>
                          <p className="settlement-cell-order">{item.sku || "—"} · {item.quantity ?? "—"} sold</p>
                        </td>

                        <td>
                          <span className={`ZENVE-tone-badge ${getStatusTone(item.status)}`}>
                            {item.status}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="ZENVE-btn-sm outline"
                            disabled={isReversed || isReconciled || actionLoadingId === item.id}
                            onClick={() => handleAdvance(item)}
                          >
                            {actionLoadingId === item.id ? "Updating..." : actionLabel}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ===================================================
            WHAT IS INCLUDED PANEL
        =================================================== */}
        <section className="ZENVE-panel-card">
          <div className="ZENVE-panel-title-block">
            <h2 className="ZENVE-panel-title">What is included</h2>
            <p className="ZENVE-panel-desc">
              Straight from the blueprint's settlement components.
            </p>
          </div>

          <ul className="ZENVE-included-grid">
            {INCLUDED_POINTS.map((point) => (
              <li key={point} className="ZENVE-included-item">
                <span className="ZENVE-included-bullet" aria-hidden="true">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
