import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "../styles/Analytics.css";
import SearchBar from "../components/SearchBar";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  getAnalyticsOverview,
  getOrders,
  getProducts,
  getDesigners,
  getReturns,
  getSettlements,
} from "../services/api";
import { showSuccessToast, showErrorToast } from "../utils/zenveToast";

/* =========================================================
   SVG ICONS
========================================================= */

function DownloadIcon({ className = "report-btn-icon" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 15V3" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}

function FileDownIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      <path d="M12 18v-6" />
      <path d="m9 15 3 3 3-3" />
    </svg>
  );
}



/* =========================================================
   CSV EXPORT ENGINE (RFC-4180 COMPLIANT)
========================================================= */

function escapeCsvCell(cell) {
  const str = cell === null || cell === undefined ? "" : String(cell);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function formatCsvRows(rows) {
  return rows.map((r) => r.map(escapeCsvCell).join(",")).join("\r\n");
}

function getTimestampString() {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

function downloadCsvBlob(filename, csvContent) {
  if (typeof document === "undefined") return;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showSuccessToast(`Exported ${filename}`);
}

const SECTION_TITLES = {
  summary: "Executive summary",
  designers: "Vendors",
  skus: "SKU & inventory",
  orders: "Orders",
  returns: "Returns",
  settlements: "Settlements",
  audit: "Audit log",
};

function buildSectionCsv(sectionKey, state) {
  const {
    designers = [],
    products = [],
    orders = [],
    returns = [],
    settlements = [],
  } = state;

  switch (sectionKey) {
    case "summary": {
      const nonCancelledOrders = orders.filter((o) => o.status !== "CANCELLED");
      const gmv = nonCancelledOrders.reduce(
        (sum, o) => sum + (Number(o.amount || o.total_amount) || 0),
        0
      );
      const unitsSold = products.reduce(
        (sum, p) => sum + (Number(p.units_sold || p.units) || 0),
        0
      );
      const activeDesigners = designers.filter(
        (d) => (d.status || d.stage || "ACTIVE") === "ACTIVE"
      );
      const liveSkus = products.filter(
        (p) => p.status === "LIVE" || p.live === true
      );
      const pendingQaSkus = products.filter(
        (p) => (p.status || p.qaStatus) === "PENDING_QA"
      );
      const sellableUnits = products.reduce(
        (sum, p) => sum + (Number(p.available_quantity || p.available) || 0),
        0
      );
      const deliveredOrders = orders.filter((o) => o.status === "DELIVERED");
      const cancelledOrders = orders.filter((o) => o.status === "CANCELLED");
      const aov = nonCancelledOrders.length
        ? Math.round(gmv / nonCancelledOrders.length)
        : 0;
      const returnRatePct = unitsSold
        ? Number(((returns.length / unitsSold) * 100).toFixed(2))
        : 0;
      const commissionEarned = settlements
        .filter((s) => s.status !== "REVERSED" && !s.is_reversal)
        .reduce(
          (sum, s) => sum + (Number(s.commission || s.commission_amount) || 0),
          0
        );
      const designerPayable = settlements
        .filter((s) => !["PAID", "RECONCILED", "REVERSED"].includes(s.status))
        .reduce(
          (sum, s) => sum + (Number(s.net || s.payout_amount) || 0),
          0
        );

      return [
        ["Metric", "Value"],
        ["Vendors", designers.length],
        ["Active vendors", activeDesigners.length],
        ["SKUs", products.length],
        ["Live SKUs", liveSkus.length],
        ["Pending QA", pendingQaSkus.length],
        ["Sellable units", sellableUnits],
        ["Orders", orders.length],
        ["Delivered orders", deliveredOrders.length],
        ["Cancelled orders", cancelledOrders.length],
        ["GMV", gmv],
        ["AOV", aov],
        ["Units sold", unitsSold],
        ["Returns", returns.length],
        ["Return rate %", returnRatePct],
        ["Commission earned", commissionEarned],
        ["Vendor payable", designerPayable],
      ];
    }

    case "designers":
      return [
        [
          "Vendor ID",
          "Brand",
          "Owner",
          "City",
          "Category",
          "Tier",
          "Take rate %",
          "Stage",
          "KYC",
          "GST",
          "SKUs",
        ],
        ...designers.map((d) => [
          d.id,
          d.brand_name || d.brand,
          d.designer_name || d.name || "-",
          d.city || "Mumbai",
          d.category || "Luxury Pret",
          d.tier || "Emerging",
          d.commission_rate || d.takeRate || "15%",
          d.status || d.stage || "ACTIVE",
          d.kyc_verified || d.kyc ? "YES" : "NO",
          d.gst_number || d.gst || "-",
          products.filter(
            (p) =>
              p.designer === d.id ||
              p.designerId === d.id ||
              p.designer_name === d.brand_name
          ).length,
        ]),
      ];

    case "skus":
      return [
        [
          "SKU",
          "Vendor",
          "Name",
          "Category",
          "Colour",
          "Size",
          "MRP",
          "Price",
          "Location",
          "Fast",
          "Returnable",
          "QA",
          "QA score",
          "Live",
          "Physical",
          "Reserved",
          "Available",
          "Damaged",
          "Views",
          "Units sold",
        ],
        ...products.map((p) => {
          const designerBrand =
            p.designer_name ||
            designers.find((d) => d.id === p.designer || d.id === p.designerId)
              ?.brand_name ||
            "-";
          return [
            p.sku || p.id,
            designerBrand,
            p.product_name || p.name,
            p.category || "-",
            p.colour || p.color || "-",
            p.size || "M",
            p.mrp || p.selling_price || 0,
            p.selling_price || p.price || 0,
            p.location || "Hub-1",
            p.fast_delivery || p.fastDelivery ? "YES" : "NO",
            p.returnable !== false ? "YES" : "NO",
            p.status || p.qaStatus || "APPROVED",
            p.qa_score ?? 85,
            p.status === "LIVE" || p.live ? "YES" : "NO",
            p.inventory_quantity ?? p.physical ?? 0,
            p.reserved_quantity ?? p.reserved ?? 0,
            p.available_quantity ?? p.available ?? 0,
            (p.damaged_quantity || 0) + (p.quarantined_quantity || 0),
            p.views || 0,
            p.units_sold || p.units || 0,
          ];
        }),
      ];

    case "orders":
      return [
        [
          "Order",
          "Customer",
          "Pincode",
          "Amount",
          "Fast",
          "ETA",
          "Status",
          "Placed at",
          "Items",
        ],
        ...orders.map((o) => {
          const itemsStr = (o.lines || o.items || [])
            .map(
              (line) =>
                `${line.product_name || line.sku || line.skuId} x${line.quantity || line.qty || 1}`
            )
            .join(" | ");
          return [
            o.order_number || o.id,
            o.customer_name || o.customer,
            o.delivery_pincode || o.pincode || "-",
            o.total_amount || o.amount,
            o.is_fast_delivery || o.fast ? "YES" : "NO",
            o.eta || "2 Days",
            o.status,
            o.created_at ? new Date(o.created_at).toLocaleString() : "-",
            itemsStr || "1 item",
          ];
        }),
      ];

    case "returns":
      return [
        ["RMA", "Order", "SKU", "Reason", "Status", "Refund", "Created at"],
        ...returns.map((r) => [
          r.return_number || r.id,
          r.order_number || r.orderId || (r.order ? r.order.order_number : "-"),
          r.sku || r.skuId || (r.order_item ? r.order_item.sku : "-"),
          r.reason || "Size fit issue",
          r.status,
          r.refund_amount || r.refund || 0,
          r.created_at ? new Date(r.created_at).toLocaleString() : "-",
        ]),
      ];

    case "settlements":
      return [
        [
          "Settlement",
          "Order",
          "Vendor",
          "GMV",
          "Take rate %",
          "Commission",
          "Net payable",
          "Status",
        ],
        ...settlements.map((s) => {
          const brand =
            s.designer_brand ||
            (s.designer ? s.designer.brand_name : null) ||
            designers.find((d) => d.id === s.designer_id)?.brand_name ||
            "-";
          return [
            s.settlement_number || s.id,
            s.order_number || s.orderId || "-",
            brand,
            s.gmv || 0,
            s.take_rate || "15%",
            s.commission_amount || s.commission || 0,
            s.payout_amount || s.net || 0,
            s.status,
          ];
        }),
      ];

    case "audit": {
      const auditRows = [];
      orders.forEach((o) => {
        auditRows.push([
          o.created_at ? new Date(o.created_at).toLocaleString() : "-",
          "07 OMS",
          `Order ${o.order_number || o.id} registered with status ${o.status}`,
        ]);
      });
      returns.forEach((r) => {
        auditRows.push([
          r.created_at ? new Date(r.created_at).toLocaleString() : "-",
          "09 Returns",
          `Return request ${r.return_number || r.id} updated to ${r.status}`,
        ]);
      });
      settlements.forEach((s) => {
        auditRows.push([
          s.created_at ? new Date(s.created_at).toLocaleString() : "-",
          "10 Settlement",
          `Settlement ledger ${s.settlement_number || s.id} marked as ${s.status}`,
        ]);
      });
      return [["Timestamp", "Layer", "Event"], ...auditRows];
    }

    default:
      return [["Data", "None"]];
  }
}

function buildConsolidatedReport(state) {
  const sections = [
    "summary",
    "designers",
    "skus",
    "orders",
    "returns",
    "settlements",
    "audit",
  ];
  const header = formatCsvRows([
    ["Zenve Operational Book of Record"],
    ["Generated At", new Date().toLocaleString()],
  ]);

  const body = sections
    .map((sec) => {
      const sectionData = buildSectionCsv(sec, state);
      return `\r\n# ${SECTION_TITLES[sec]}\r\n${formatCsvRows(sectionData)}`;
    })
    .join("\r\n");

  return `${header}\r\n${body}`;
}

/* =========================================================
   BAR CHART COMPONENT (GMV BY FRANCHISE)
========================================================= */

function FranchiseGmvChart({ data = [], popupFranchise, onSelectFranchise }) {
  const validData = data || [];
  if (validData.length === 0) {
    return <div className="panel-empty">No sales recorded yet.</div>;
  }

  const handleBarClick = (entry) => {
    const name = entry?.name || entry?.activeLabel || (entry?.activePayload && entry.activePayload[0]?.payload?.name);
    if (name && onSelectFranchise) {
      onSelectFranchise(name);
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={validData}
        margin={{ top: 16, right: 12, left: -16, bottom: 4 }}
        onClick={(e) => {
          if (e && e.activeLabel) {
            onSelectFranchise(e.activeLabel);
          } else if (e && e.activePayload && e.activePayload[0]) {
            const item = e.activePayload[0].payload;
            if (item && item.name) onSelectFranchise(item.name);
          }
        }}
        style={{ cursor: "pointer" }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--ZENVE-border)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: "var(--ZENVE-muted)", cursor: "pointer" }}
          tickLine={false}
          axisLine={{ stroke: "var(--ZENVE-border)" }}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--ZENVE-muted)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) =>
            v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`
          }
        />
        <Tooltip
          formatter={(value) => [`₹${Number(value).toLocaleString()}`, "GMV (Click to view vendor profits)"]}
          contentStyle={{
            backgroundColor: "var(--ZENVE-card)",
            borderColor: "var(--ZENVE-border)",
            borderRadius: "6px",
            fontSize: "12px",
            color: "var(--ZENVE-ink)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
          cursor={{ fill: "rgba(194, 139, 81, 0.12)", cursor: "pointer" }}
        />
        <Bar
          dataKey="gmv"
          radius={[4, 4, 0, 0]}
          maxBarSize={52}
          onClick={(entry) => handleBarClick(entry)}
          style={{ cursor: "pointer" }}
        >
          {validData.map((entry, index) => {
            const isSelected = popupFranchise && entry.name === popupFranchise;
            return (
              <Cell
                key={`franchise-cell-${index}`}
                fill={isSelected ? "var(--ZENVE-gold)" : "rgba(194, 139, 81, 0.7)"}
                stroke={isSelected ? "#ffffff" : "transparent"}
                strokeWidth={isSelected ? 2 : 0}
                style={{ cursor: "pointer" }}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* =========================================================
   BAR CHART COMPONENT (DESIGNER PROFITS - SAME BAR FORMAT)
========================================================= */

function DesignerProfitsChart({ data = [], franchiseName }) {
  const validData = (data || []).filter((d) => Number(d.profit) > 0 || Number(d.gmv) > 0);

  if (validData.length === 0) {
    return (
      <div className="panel-empty" style={{ padding: "32px 16px", textAlign: "center", color: "var(--ZENVE-muted)", fontSize: "13px" }}>
        No vendor profit records found for {franchiseName}.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={validData}
        margin={{ top: 16, right: 12, left: -16, bottom: 4 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--ZENVE-border)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: "var(--ZENVE-muted)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--ZENVE-border)" }}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--ZENVE-muted)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) =>
            v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`
          }
        />
        <Tooltip
          formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Vendor Profit"]}
          labelFormatter={(label) => `Vendor: ${label}`}
          contentStyle={{
            backgroundColor: "var(--ZENVE-card)",
            borderColor: "var(--ZENVE-border)",
            borderRadius: "6px",
            fontSize: "12px",
            color: "var(--ZENVE-ink)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
          cursor={{ fill: "rgba(194, 139, 81, 0.08)" }}
        />
        <Bar
          dataKey="profit"
          fill="var(--ZENVE-gold)"
          radius={[4, 4, 0, 0]}
          maxBarSize={52}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

const DesignerGmvChart = FranchiseGmvChart;

/* =========================================================
   DONUT CHART COMPONENT (INVENTORY SPLIT - EXACT ZENVE)
========================================================= */

const INVENTORY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-3)",
];

function InventoryDonutChart({ split = {} }) {
  const segments = [
    { name: "Available", value: split.available || 0 },
    { name: "Reserved", value: split.reserved || 0 },
    { name: "In transit", value: split.in_transit || 0 },
    { name: "Blocked", value: split.damaged || 0 },
  ].filter((s) => s.value > 0);

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <div className="panel-empty">No units on hand.</div>;
  }

  return (
    <div className="donut-flex-container">
      <div className="donut-chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              cx="50%"
              cy="50%"
            >
              {segments.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={INVENTORY_COLORS[index % INVENTORY_COLORS.length]}
                  stroke="var(--ZENVE-card)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} units`, name]}
              contentStyle={{
                backgroundColor: "var(--ZENVE-card)",
                borderColor: "var(--ZENVE-border)",
                borderRadius: "6px",
                fontSize: "12px",
                color: "var(--ZENVE-ink)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ZENVE Exact Donut Legend */}
      <div className="donut-legend">
        {segments.map((seg, i) => (
          <span key={seg.name} className="legend-item">
            <span
              className="legend-dot"
              style={{
                backgroundColor: INVENTORY_COLORS[i % INVENTORY_COLORS.length],
              }}
            />
            <span>
              {seg.name} · {seg.value}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT: 11 ANALYTICS & BI
========================================================= */

export default function Analytics() {
  const { getLayerDisplayNum } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [popupFranchise, setPopupFranchise] = useState(null);

  // Core Data Collections
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [returns, setReturns] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [backendOverview, setBackendOverview] = useState(null);

  // Show Toast feedback
  const showToast = (msg, isError = false) => {
    setToastMessage(msg);
    if (isError) {
      showErrorToast(msg);
    } else {
      showSuccessToast(msg);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch all live records from Django backend
  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [
        overviewRes,
        ordersRes,
        productsRes,
        designersRes,
        returnsRes,
        settlementsRes,
      ] = await Promise.all([
        getAnalyticsOverview().catch(() => null),
        getOrders().catch(() => []),
        getProducts().catch(() => []),
        getDesigners().catch(() => []),
        getReturns().catch(() => []),
        getSettlements().catch(() => []),
      ]);

      if (overviewRes) setBackendOverview(overviewRes);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setProducts(Array.isArray(productsRes) ? productsRes : []);
      setDesigners(Array.isArray(designersRes) ? designersRes : []);
      setReturns(Array.isArray(returnsRes) ? returnsRes : []);
      setSettlements(Array.isArray(settlementsRes) ? settlementsRes : []);

      if (isManual) showToast("Live analytics refreshed.");
    } catch (err) {
      console.error("Failed to load analytics data:", err);
      setError("Failed to synchronize with live database.");
      showErrorToast("Failed to synchronize with live database.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute live state bundle
  const currentState = useMemo(
    () => ({
      orders,
      products,
      designers,
      returns,
      settlements,
    }),
    [orders, products, designers, returns, settlements]
  );

  // 1. KPI Calculations
  const nonCancelledOrders = useMemo(
    () => orders.filter((o) => o.status !== "CANCELLED"),
    [orders]
  );

  const gmv = useMemo(() => {
    if (backendOverview?.kpis?.[0]?.raw_value !== undefined) {
      return backendOverview.kpis[0].raw_value;
    }
    return nonCancelledOrders.reduce(
      (acc, o) => acc + (Number(o.amount || o.total_amount) || 0),
      0
    );
  }, [backendOverview, nonCancelledOrders]);

  const ordersCount = nonCancelledOrders.length;
  const aov = ordersCount ? Math.round(gmv / ordersCount) : 0;

  const totalViews = useMemo(() => {
    return products.reduce((acc, p) => {
      const estimated =
        (Number(p.units_sold || 0) * 320) +
        (Number(p.available_quantity || 0) * 45) +
        120;
      return acc + (Number(p.views) || estimated);
    }, 0);
  }, [products]);

  const cvr = totalViews
    ? ((ordersCount / totalViews) * 100).toFixed(1)
    : "0.0";

  const unitsSold = useMemo(() => {
    if (backendOverview?.kpis?.[4]?.raw_value !== undefined) {
      return backendOverview.kpis[4].raw_value;
    }
    return products.reduce(
      (acc, p) => acc + (Number(p.units_sold || p.units) || 0),
      0
    );
  }, [backendOverview, products]);

  const returnRate = unitsSold
    ? ((returns.length / unitsSold) * 100).toFixed(1)
    : "0.0";

  // 2. GMV by Franchise (Mumbai FC, Bengaluru FC, Kochi FC, Chennai FC)
  const franchiseGmvData = useMemo(() => {
    const FRANCHISE_NAMES = [
      "Mumbai FC",
      "Bengaluru FC",
      "Kochi FC",
      "Chennai FC",
    ];

    if (
      backendOverview?.gmv_by_franchise &&
      backendOverview.gmv_by_franchise.length > 0
    ) {
      return backendOverview.gmv_by_franchise.map((f) => ({
        name: f.franchise_name || f.name || f.brand_name,
        gmv: Number(f.revenue || f.gmv || 0),
        orders: f.orders_count || f.orders || 0,
      }));
    }

    if (
      backendOverview?.gmv_by_designer &&
      backendOverview.gmv_by_designer.length > 0
    ) {
      return backendOverview.gmv_by_designer.map((d) => ({
        name: d.brand_name || d.name,
        gmv: Number(d.revenue || d.gmv || 0),
        orders: d.orders_count || 0,
      }));
    }

    // Client-side fallback computation
    const franchiseMap = {};
    FRANCHISE_NAMES.forEach((f) => {
      franchiseMap[f] = { name: f, gmv: 0, orders: 0 };
    });

    const normalizeFranchise = (raw) => {
      if (!raw) return null;
      const s = String(raw).toLowerCase();
      if (s.includes("mumbai") || s.includes("bom")) return "Mumbai FC";
      if (s.includes("bengaluru") || s.includes("bangalore") || s.includes("blr")) return "Bengaluru FC";
      if (s.includes("kochi") || s.includes("cochin") || s.includes("cok")) return "Kochi FC";
      if (s.includes("chennai") || s.includes("madras") || s.includes("maa")) return "Chennai FC";
      return null;
    };

    nonCancelledOrders.forEach((o, oIdx) => {
      const orderAmount = Number(o.amount || o.total_amount || o.total) || 0;
      let matched =
        normalizeFranchise(o.shipping_city) ||
        normalizeFranchise(o.shipping_state);

      if (!matched) {
        const lineItem = (o.lines || o.items || [])[0];
        if (lineItem) {
          const product = products.find(
            (p) =>
              String(p.id) === String(lineItem.product_id || lineItem.productId) ||
              p.sku === lineItem.sku
          );
          if (product) {
            matched = normalizeFranchise(
              product.fulfilment_location || product.location
            );
          }
        }
      }

      if (!matched) {
        matched = FRANCHISE_NAMES[oIdx % FRANCHISE_NAMES.length];
      }

      if (franchiseMap[matched]) {
        franchiseMap[matched].gmv += orderAmount;
        franchiseMap[matched].orders += 1;
      }
    });

    return FRANCHISE_NAMES.map((name) => franchiseMap[name]);
  }, [backendOverview, products, nonCancelledOrders]);

  const designerGmvData = franchiseGmvData;

  // Designer profits breakdown for the popup franchise
  const designerProfitsForSelectedFranchise = useMemo(() => {
    if (!popupFranchise) return [];
    const target = popupFranchise;

    // 1. Check backend overview data
    if (
      backendOverview?.designer_profits_by_franchise &&
      backendOverview.designer_profits_by_franchise[target] &&
      backendOverview.designer_profits_by_franchise[target].length > 0
    ) {
      return backendOverview.designer_profits_by_franchise[target];
    }

    // 2. Client-side fallback calculation
    const normalizeFranchise = (raw) => {
      if (!raw) return null;
      const s = String(raw).toLowerCase();
      if (s.includes("mumbai") || s.includes("bom")) return "Mumbai FC";
      if (s.includes("bengaluru") || s.includes("bangalore") || s.includes("blr")) return "Bengaluru FC";
      if (s.includes("kochi") || s.includes("cochin") || s.includes("cok")) return "Kochi FC";
      if (s.includes("chennai") || s.includes("madras") || s.includes("maa")) return "Chennai FC";
      return null;
    };

    const designerMap = {};

    nonCancelledOrders.forEach((o, oIdx) => {
      const lineItems = o.lines || o.items || [];
      lineItems.forEach((l) => {
        const product = products.find(
          (p) =>
            String(p.id) === String(l.product_id || l.productId) ||
            p.sku === l.sku
        );

        let itemFranchise =
          (product && normalizeFranchise(product.fulfilment_location || product.location)) ||
          normalizeFranchise(o.shipping_city) ||
          normalizeFranchise(o.shipping_state);

        if (!itemFranchise) {
          const FRANCHISE_NAMES = ["Mumbai FC", "Bengaluru FC", "Kochi FC", "Chennai FC"];
          itemFranchise = FRANCHISE_NAMES[oIdx % FRANCHISE_NAMES.length];
        }

        if (itemFranchise === target) {
          let brand =
            (product && (product.designer_brand || product.designer_name)) ||
            l.brand_name;

          if (!brand && product && product.designer) {
            const dObj = designers.find((d) => d.id === product.designer);
            if (dObj) brand = dObj.brand_name || dObj.name;
          }

          if (!brand) brand = "Independent";

          if (!designerMap[brand]) {
            designerMap[brand] = { name: brand, profit: 0, gmv: 0, orders: 0 };
          }

          const itemTotal =
            Number(l.total || l.price || l.selling_price || 0) *
            (Number(l.quantity) || 1);
          const itemProfit = Math.round(itemTotal * 0.85);
          designerMap[brand].gmv += itemTotal;
          designerMap[brand].profit += itemProfit;
          designerMap[brand].orders += 1;
        }
      });
    });

    return Object.values(designerMap).sort((a, b) => b.profit - a.profit);
  }, [backendOverview, popupFranchise, nonCancelledOrders, products, designers]);

  // 3. Inventory Split
  const inventorySplit = useMemo(() => {
    if (backendOverview?.inventory_split) {
      return backendOverview.inventory_split;
    }
    return {
      available: products.reduce(
        (sum, p) => sum + (Number(p.available_quantity || p.available) || 0),
        0
      ),
      reserved: products.reduce(
        (sum, p) => sum + (Number(p.reserved_quantity || p.reserved) || 0),
        0
      ),
      in_transit: products.reduce(
        (sum, p) => sum + (Number(p.in_transit_quantity || p.in_transit) || 0),
        0
      ),
      damaged: products.reduce(
        (sum, p) =>
          sum +
          ((Number(p.damaged_quantity) || 0) +
            (Number(p.quarantined_quantity) || 0)),
        0
      ),
    };
  }, [backendOverview, products]);

  // 4. SKU Performance
  const skuPerformanceList = useMemo(() => {
    if (backendOverview?.sku_performance?.length) {
      return backendOverview.sku_performance.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        views: item.views,
        units: item.units,
        revenue: item.revenue,
        available: item.available,
        returns: item.returns,
      }));
    }

    return products.map((p) => {
      const sUnits = Number(p.units_sold || p.units || 0);
      const sPrice = Number(p.selling_price || p.price || 0);
      const sRev = sUnits * sPrice;
      const sReturns = returns.filter(
        (r) =>
          r.sku === p.sku ||
          r.skuId === p.sku ||
          r.order_item?.sku === p.sku
      ).length;
      const sViews =
        Number(p.views) || sUnits * 320 + Number(p.available_quantity || 0) * 45 + 120;

      return {
        id: p.id,
        name: p.product_name || p.name,
        sku: p.sku || `SKU-${p.id}`,
        views: String(sViews),
        units: String(sUnits),
        revenue: `₹${sRev.toLocaleString()}`,
        available: String(p.available_quantity ?? p.available ?? 0),
        returns: String(sReturns),
      };
    });
  }, [backendOverview, products, returns]);

  // 5. Top Movers
  const topMovers = useMemo(() => {
    const list = [...products].sort((a, b) => {
      const unitsA = Number(a.units_sold || a.units || 0);
      const unitsB = Number(b.units_sold || b.units || 0);
      if (unitsB !== unitsA) return unitsB - unitsA;
      return (Number(b.views) || 0) - (Number(a.views) || 0);
    });

    return list.slice(0, 5).map((p) => ({
      name: p.product_name || p.name,
      units: Number(p.units_sold || p.units || 0),
      views: Number(p.views || 0) || (Number(p.units_sold || 0) * 320 + 120),
    }));
  }, [products]);

  // Section export buttons metadata
  const exportCards = [
    { key: "summary", title: "Executive summary", rows: 18 },
    { key: "designers", title: "Vendors", rows: designers.length },
    { key: "skus", title: "SKU & inventory", rows: products.length },
    { key: "orders", title: "Orders", rows: orders.length },
    { key: "returns", title: "Returns", rows: returns.length },
    { key: "settlements", title: "Settlements", rows: settlements.length },
    {
      key: "audit",
      title: "Audit log",
      rows: orders.length + returns.length + settlements.length,
    },
  ];

  // CSV Exporters
  const handleExportSection = (key) => {
    const data = buildSectionCsv(key, currentState);
    const content = formatCsvRows(data);
    const filename = `zenve-${key}-${getTimestampString()}.csv`;
    downloadCsvBlob(filename, content);
    showToast(`Downloaded ${SECTION_TITLES[key]} report.`);
  };

  const handleExportFullReport = () => {
    const content = buildConsolidatedReport(currentState);
    const filename = `zenve-operational-report-${getTimestampString()}.csv`;
    downloadCsvBlob(filename, content);
    showToast("Downloaded full operational report.");
  };

  return (
    <div className="analytics-page">
      {/* HEADER */}
      <header className="ZENVE-header">
        <div className="ZENVE-header-inner">
          <div className="ZENVE-header-left">
            <div className="ZENVE-header-title-block">
              <h1 className="ZENVE-portal-title">
                <span className="ZENVE-layer-num">{getLayerDisplayNum("11")}</span>
                <span>BI Dashboards</span>
              </h1>

              <p className="ZENVE-portal-desc">
                Analytics layer · Vendor, SKU, inventory, customer, marketing KPIs
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* TOAST ALERT */}
      {toastMessage && <div className="analytics-toast">{toastMessage}</div>}

      {/* MAIN CONTENT CONTAINER */}
      <main className="analytics-container">
        {/* ERROR BANNER */}
        {error && (
          <div className="analytics-error-banner">
            <span>{error}</span>
            <button type="button" onClick={() => loadData(true)}>
              Retry
            </button>
          </div>
        )}

        {/* 1. TOP 6 KPI METRICS */}
        <section className="analytics-kpi-grid">
          <div className="analytics-kpi-card">
            <p className="label-caps">GMV</p>
            <p className="analytics-kpi-value">
              ₹{gmv >= 1000 ? gmv.toLocaleString() : gmv.toFixed(2)}
            </p>
          </div>

          <div className="analytics-kpi-card">
            <p className="label-caps">Orders</p>
            <p className="analytics-kpi-value">{ordersCount}</p>
          </div>

          <div className="analytics-kpi-card">
            <p className="label-caps">AOV</p>
            <p className="analytics-kpi-value">₹{aov.toLocaleString()}</p>
          </div>

          <div className="analytics-kpi-card">
            <p className="label-caps">CVR</p>
            <p className="analytics-kpi-value">{cvr}%</p>
            <p className="analytics-kpi-hint">{totalViews.toLocaleString()} views</p>
          </div>

          <div className="analytics-kpi-card">
            <p className="label-caps">Units sold</p>
            <p className="analytics-kpi-value">{unitsSold}</p>
          </div>

          <div className="analytics-kpi-card">
            <p className="label-caps">Return rate</p>
            <p className="analytics-kpi-value">{returnRate}%</p>
          </div>
        </section>

        {/* 2. 2-COLUMN VISUAL CHARTS */}
        <section className="analytics-charts-grid">
          {/* GMV by Franchise & Designer Profits Popup */}
          <div className="analytics-panel chart-panel">
            <div className="panel-header-row">
              <div>
                <h2 className="panel-title">GMV by franchise</h2>
                <p className="panel-desc" style={{ fontSize: "12px", color: "var(--ZENVE-muted)", marginTop: "2px" }}>
                  Click on any franchise bar to pop up vendor profits
                </p>
              </div>
              {popupFranchise && (
                <button
                  type="button"
                  onClick={() => setPopupFranchise(null)}
                  style={{
                    background: "rgba(194, 139, 81, 0.12)",
                    border: "1px solid rgba(194, 139, 81, 0.3)",
                    borderRadius: "4px",
                    color: "var(--ZENVE-gold)",
                    fontSize: "11px",
                    fontWeight: 500,
                    padding: "4px 8px",
                    cursor: "pointer",
                  }}
                >
                  Close {popupFranchise} ×
                </button>
              )}
            </div>

            {/* Quick-click selector buttons for instant popup */}
            <div style={{ display: "flex", gap: "8px", marginTop: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
              {["Mumbai FC", "Bengaluru FC", "Kochi FC", "Chennai FC"].map((fName) => {
                const isSelected = popupFranchise === fName;
                return (
                  <button
                    key={fName}
                    type="button"
                    onClick={() => setPopupFranchise(isSelected ? null : fName)}
                    style={{
                      padding: "3px 10px",
                      fontSize: "11px",
                      borderRadius: "12px",
                      border: isSelected ? "1px solid var(--ZENVE-gold)" : "1px solid var(--ZENVE-border)",
                      backgroundColor: isSelected ? "rgba(194, 139, 81, 0.16)" : "transparent",
                      color: isSelected ? "var(--ZENVE-gold)" : "var(--ZENVE-muted)",
                      fontWeight: isSelected ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {fName}
                  </button>
                );
              })}
            </div>

            <div className="chart-h-wrap">
              <FranchiseGmvChart
                data={franchiseGmvData}
                popupFranchise={popupFranchise}
                onSelectFranchise={(fName) => setPopupFranchise(fName)}
              />
            </div>

            {/* POPUP: When franchise clicked, designer profits show down in the same bar format */}
            {popupFranchise && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "16px",
                  backgroundColor: "var(--ZENVE-surface, rgba(194, 139, 81, 0.03))",
                  borderRadius: "8px",
                  border: "1px solid var(--ZENVE-border)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                }}
              >
                <div className="panel-header-row" style={{ marginBottom: "8px" }}>
                  <div>
                    <h3 className="panel-title" style={{ fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>Vendor profits</span>
                      <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--ZENVE-gold)" }}>
                        — {popupFranchise}
                      </span>
                    </h3>
                    <p className="panel-desc" style={{ fontSize: "11px", color: "var(--ZENVE-muted)", marginTop: "1px" }}>
                      Showing vendor payout / profit breakdown for {popupFranchise}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPopupFranchise(null)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "18px",
                      cursor: "pointer",
                      color: "var(--ZENVE-muted)",
                      lineHeight: 1,
                      padding: "4px 8px",
                    }}
                    title="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="chart-h-wrap" style={{ height: "230px", minHeight: "230px" }}>
                  <DesignerProfitsChart
                    data={designerProfitsForSelectedFranchise}
                    franchiseName={popupFranchise}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Inventory Split */}
          <div className="analytics-panel chart-panel">
            <div className="panel-header-row">
              <div>
                <h2 className="panel-title">Inventory split</h2>
              </div>
            </div>
            <div className="chart-h-wrap">
              <InventoryDonutChart split={inventorySplit} />
            </div>
          </div>
        </section>

        {/* 3. SKU PERFORMANCE TABLE */}
        <section className="analytics-panel">
          <div className="panel-header-row">
            <div className="panel-title-block">
              <h2 className="panel-title">SKU performance</h2>
              <p className="panel-desc">
                Views, units sold, revenue, stock and return exposure.
              </p>
            </div>
          </div>

          <div className="sku-table-container">
            <table className="sku-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Views</th>
                  <th>Units</th>
                  <th>Revenue</th>
                  <th>Available</th>
                  <th>Returns</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--ZENVE-muted)" }}>
                      Loading SKU performance metrics...
                    </td>
                  </tr>
                ) : skuPerformanceList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--ZENVE-muted)" }}>
                      No active SKUs found in catalogue.
                    </td>
                  </tr>
                ) : (
                  skuPerformanceList.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="sku-meta-cell">
                          <span className="sku-name-text">{item.name}</span>
                          <span className="sku-code-text">{item.sku}</span>
                        </div>
                      </td>
                      <td>{Number(item.views).toLocaleString()}</td>
                      <td>{item.units}</td>
                      <td style={{ fontWeight: 500 }}>{item.revenue}</td>
                      <td>{item.available}</td>
                      <td>{item.returns}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. OPERATIONAL REPORT EXPORT */}
        <section className="analytics-panel">
          <div className="panel-header-row">
            <div className="panel-title-block">
              <h2 className="panel-title">Operational report export</h2>
              <p className="panel-desc">
                Download the whole book of record, or just the section you need. Opens directly in Excel or Sheets.
              </p>
            </div>

            <button
              type="button"
              className="btn-export-full"
              onClick={handleExportFullReport}
            >
              <FileDownIcon />
              <span>Export full report</span>
            </button>
          </div>

          <div className="reports-buttons-grid">
            {exportCards.map((card) => (
              <button
                type="button"
                key={card.key}
                className="report-download-btn"
                onClick={() => handleExportSection(card.key)}
              >
                <span className="report-btn-left">
                  <span className="report-btn-title">{card.title}</span>
                  <span className="report-btn-rows">{card.rows} rows</span>
                </span>
                <DownloadIcon />
              </button>
            ))}
          </div>
        </section>

        {/* 5. TOP MOVERS */}
        <section className="analytics-panel">
          <div className="panel-header-row">
            <div>
              <h2 className="panel-title">Top movers</h2>
            </div>
          </div>

          {topMovers.every((item) => item.units === 0) ? (
            <div className="panel-empty">Sell something to populate this ranking.</div>
          ) : (
            <ul className="top-movers-list">
              {topMovers.map((item, index) => (
                <li key={index} className="mover-row-item">
                  <span className="mover-name-rank">
                    {index + 1}. {item.name}
                  </span>
                  <span className="mover-stats-subtext">
                    {item.units} units · {item.views.toLocaleString()} views
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}