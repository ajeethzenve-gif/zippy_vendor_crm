import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/CommandCentre.css";
import SearchBar from "../components/SearchBar";
import {
  getCommandCentreOverview,
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

function DownloadIcon({ className = "cc-report-icon" }) {
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
      width="15"
      height="15"
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

function RefreshIcon({ spinning }) {
  return (
    <svg
      className={spinning ? "cc-spinner" : ""}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

/* =========================================================
   CSV EXPORT ENGINE (RFC-4180)
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
          "OMS",
          `Order ${o.order_number || o.id} registered with status ${o.status}`,
        ]);
      });
      returns.forEach((r) => {
        auditRows.push([
          r.created_at ? new Date(r.created_at).toLocaleString() : "-",
          "Returns",
          `Return request ${r.return_number || r.id} updated to ${r.status}`,
        ]);
      });
      settlements.forEach((s) => {
        auditRows.push([
          s.created_at ? new Date(s.created_at).toLocaleString() : "-",
          "Settlement",
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
   TIME FILTER RANGES (MATCHING ZENVE)
========================================================= */

const TIME_RANGES = [
  { id: "all", label: "All time", ms: Infinity },
  { id: "15m", label: "Last 15 min", ms: 15 * 60 * 1000 },
  { id: "1h", label: "Last hour", ms: 60 * 60 * 1000 },
  { id: "24h", label: "Last 24 hours", ms: 24 * 60 * 60 * 1000 },
  { id: "7d", label: "Last 7 days", ms: 7 * 24 * 60 * 60 * 1000 },
];

/* =========================================================
   12 OPERATIONAL LAYERS
========================================================= */

const ALL_12_LAYERS = [
  { no: 1, module: "Vendor CRM", to: "/vendor-crm" },
  { no: 2, module: "Vendor Portal", to: "/vendor-portal" },
  { no: 3, module: "Product / SKU", to: "/catalogue" },
  { no: 4, module: "Catalogue QA", to: "/catalogue-qa" },
  { no: 5, module: "Inventory Engine", to: "/inventory" },
  { no: 6, module: "Storefront", to: "/storefront" },
  { no: 7, module: "OMS", to: "/orders" },
  { no: 8, module: "Delivery Engine", to: "/delivery" },
  { no: 9, module: "Returns Engine", to: "/returns" },
  { no: 10, module: "Settlement", to: "/settlement" },
  { no: 11, module: "Analytics & BI", to: "/analytics" },
  { no: 12, module: "Command Centre", to: "/command-centre" },
];

/* =========================================================
   MAIN COMPONENT: 12 COMMAND CENTRE
========================================================= */

export default function CommandCentre() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Live Data Collections
  const [overviewData, setOverviewData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [returns, setReturns] = useState([]);
  const [settlements, setSettlements] = useState([]);

  // Audit Log Filters
  const [auditSearch, setAuditSearch] = useState("");
  const [auditLayerFilter, setAuditLayerFilter] = useState("ALL");
  const [auditTimeFilter, setAuditTimeFilter] = useState("all");
  const [visibleAuditCount, setVisibleAuditCount] = useState(40);

  const showToast = (msg, isError = false) => {
    setToastMessage(msg);
    if (isError) {
      showErrorToast(msg);
    } else {
      showSuccessToast(msg);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch live system state from Django
  const fetchAllData = async (isManual = false) => {
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
        getCommandCentreOverview().catch(() => null),
        getOrders().catch(() => []),
        getProducts().catch(() => []),
        getDesigners().catch(() => []),
        getReturns().catch(() => []),
        getSettlements().catch(() => []),
      ]);

      if (overviewRes) setOverviewData(overviewRes);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setProducts(Array.isArray(productsRes) ? productsRes : []);
      setDesigners(Array.isArray(designersRes) ? designersRes : []);
      setReturns(Array.isArray(returnsRes) ? returnsRes : []);
      setSettlements(Array.isArray(settlementsRes) ? settlementsRes : []);

      if (isManual) showToast("Live Command Centre metrics synchronized.");
    } catch (err) {
      console.error("Failed to load Command Centre overview:", err);
      setError("Failed to connect to live backend.");
      showErrorToast("Failed to connect to live backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

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

  // 1. Executive KPIs
  const nonCancelledOrders = useMemo(
    () => orders.filter((o) => o.status !== "CANCELLED"),
    [orders]
  );

  const gmv = useMemo(() => {
    if (overviewData?.kpis?.raw_gmv !== undefined) {
      return overviewData.kpis.raw_gmv;
    }
    return nonCancelledOrders.reduce(
      (sum, o) => sum + (Number(o.amount || o.total_amount) || 0),
      0
    );
  }, [overviewData, nonCancelledOrders]);

  const sellableUnits = useMemo(() => {
    if (overviewData?.kpis?.sellable_units !== undefined) {
      return overviewData.kpis.sellable_units;
    }
    return products.reduce(
      (sum, p) => sum + (Number(p.available_quantity || p.available) || 0),
      0
    );
  }, [overviewData, products]);

  const activeDesigners = useMemo(() => {
    if (overviewData?.kpis?.active_designers !== undefined) {
      return overviewData.kpis.active_designers;
    }
    return designers.filter(
      (d) => (d.status || d.stage || "ACTIVE") === "ACTIVE"
    ).length;
  }, [overviewData, designers]);

  // 2. Pending Approvals
  const pendingApprovalsList = useMemo(() => {
    const skusPendingQa = products.filter(
      (p) => (p.status || p.qaStatus) === "PENDING_QA"
    ).length;
    const designersAwaitingContract = designers.filter((d) =>
      ["APPROVED", "CONTRACT"].includes(d.stage || d.status)
    ).length;
    const returnsAwaitingInspection = returns.filter(
      (r) => r.status === "RECEIVED" || r.status === "REQUESTED"
    ).length;
    const settlementsToApprove = settlements.filter(
      (s) => s.status === "PENDING"
    ).length;
    const ordersToDispatch = orders.filter((o) =>
      ["PLACED", "CONFIRMED", "PACKED"].includes(o.status)
    ).length;

    return [
      {
        label: "SKUs pending QA",
        count: overviewData?.pending_approvals?.skus_pending_qa ?? skusPendingQa,
        to: "/catalogue-qa",
      },
      {
        label: "Vendors awaiting contract",
        count:
          overviewData?.pending_approvals?.designers_awaiting_contract ??
          designersAwaitingContract,
        to: "/vendor-crm",
      },
      {
        label: "Returns awaiting inspection",
        count:
          overviewData?.pending_approvals?.returns_awaiting_inspection ??
          returnsAwaitingInspection,
        to: "/returns",
      },
      {
        label: "Settlements to approve",
        count:
          overviewData?.pending_approvals?.settlements_to_approve ??
          settlementsToApprove,
        to: "/settlement",
      },
      {
        label: "Orders to dispatch",
        count:
          overviewData?.pending_approvals?.orders_to_dispatch ??
          ordersToDispatch,
        to: "/orders",
      },
    ];
  }, [overviewData, products, designers, returns, settlements, orders]);

  // 3. Exceptions & Automation Alerts
  const exceptions = useMemo(() => {
    if (overviewData?.exceptions && overviewData.exceptions.length > 0) {
      return overviewData.exceptions.map((ex) => ({
        level: ex.severity === "danger" ? "high" : "medium",
        layer: ex.type || ex.layer || "System",
        message: ex.text,
        path: ex.path,
      }));
    }

    const list = [];
    // Rule: SKUs pending QA
    products
      .filter((p) => (p.status || p.qaStatus) === "PENDING_QA")
      .forEach((p) => {
        list.push({
          level: "medium",
          layer: "QA",
          message: `${p.sku || p.id} pending QA review`,
          path: "/catalogue-qa",
        });
      });

    // Rule: Low stock
    products
      .filter((p) => p.status === "LIVE" && Number(p.available_quantity || 0) <= 2)
      .forEach((p) => {
        list.push({
          level: "high",
          layer: "Inventory",
          message: `Low stock on ${p.product_name || p.name} (${p.available_quantity || 0} units left)`,
          path: "/inventory",
        });
      });

    // Rule: Fast promise unsafe
    products
      .filter(
        (p) =>
          (p.fast_delivery || p.fastDelivery) &&
          Number(p.available_quantity || 0) === 0
      )
      .forEach((p) => {
        list.push({
          level: "high",
          layer: "Delivery",
          message: `Fast promise unsafe on ${p.product_name || p.name} — no stock`,
          path: "/delivery",
        });
      });

    // Rule: Returns awaiting inspection
    returns
      .filter((r) => r.status === "RECEIVED")
      .forEach((r) => {
        list.push({
          level: "medium",
          layer: "Returns",
          message: `${r.return_number || r.id} awaiting inspection`,
          path: "/returns",
        });
      });

    // Rule: Settlements pending approval
    settlements
      .filter((s) => s.status === "PENDING")
      .forEach((s) => {
        list.push({
          level: "medium",
          layer: "Finance",
          message: `${s.settlement_number || s.id} awaiting approval`,
          path: "/settlement",
        });
      });

    // Rule: Designers missing KYC
    designers
      .filter((d) => !d.kyc_verified && d.stage !== "LEAD")
      .forEach((d) => {
        list.push({
          level: "high",
          layer: "CRM",
          message: `${d.brand_name || d.brand} missing KYC`,
          path: "/vendor-crm",
        });
      });

    return list;
  }, [overviewData, products, returns, settlements, designers]);

  // 4. Cross-Layer Audit Log
  const allAuditLogs = useMemo(() => {
    if (overviewData?.audit_logs && overviewData.audit_logs.length > 0) {
      return overviewData.audit_logs.map((item, idx) => ({
        id: `log-${idx}`,
        at: item.timestamp || new Date().toISOString(),
        layer: item.layer,
        message: item.event,
      }));
    }

    const logs = [];
    orders.forEach((o, i) => {
      logs.push({
        id: `ord-${i}`,
        at: o.created_at || new Date().toISOString(),
        layer: "OMS",
        message: `Order ${o.order_number || o.id} status is ${o.status}`,
      });
    });
    returns.forEach((r, i) => {
      logs.push({
        id: `ret-${i}`,
        at: r.created_at || new Date().toISOString(),
        layer: "Returns",
        message: `Return ${r.return_number || r.id} state updated to ${r.status}`,
      });
    });
    settlements.forEach((s, i) => {
      logs.push({
        id: `stl-${i}`,
        at: s.created_at || new Date().toISOString(),
        layer: "Settlement",
        message: `Settlement ${s.settlement_number || s.id} marked as ${s.status}`,
      });
    });

    return logs.sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [overviewData, orders, returns, settlements]);

  // Unique layers for dropdown filter
  const uniqueAuditLayers = useMemo(() => {
    return Array.from(new Set(allAuditLogs.map((l) => l.layer))).sort();
  }, [allAuditLogs]);

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    const selectedTime = TIME_RANGES.find((r) => r.id === auditTimeFilter);
    const msLimit = selectedTime ? selectedTime.ms : Infinity;
    const minTimestamp = msLimit === Infinity ? 0 : Date.now() - msLimit;
    const query = auditSearch.trim().toLowerCase();

    return allAuditLogs.filter((item) => {
      const matchLayer =
        auditLayerFilter === "ALL" || item.layer === auditLayerFilter;
      const matchTime = new Date(item.at).getTime() >= minTimestamp;
      const matchQuery =
        !query ||
        `${item.layer} ${item.message}`.toLowerCase().includes(query);
      return matchLayer && matchTime && matchQuery;
    });
  }, [allAuditLogs, auditLayerFilter, auditTimeFilter, auditSearch]);

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
      rows: allAuditLogs.length,
    },
  ];

  // CSV Exporters
  const handleExportFilteredAudit = () => {
    const rows = [
      ["Timestamp", "Layer", "Event"],
      ...filteredAuditLogs.map((item) => [
        new Date(item.at).toLocaleString(),
        item.layer,
        item.message,
      ]),
    ];
    const content = formatCsvRows(rows);
    const filename = `zenve-audit-${getTimestampString()}.csv`;
    downloadCsvBlob(filename, content);
    showToast(`Exported ${filteredAuditLogs.length} audit log entries.`);
  };

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

  const handleClearFilters = () => {
    setAuditSearch("");
    setAuditLayerFilter("ALL");
    setAuditTimeFilter("all");
  };

  return (
    <div className="command-centre-page">
      {/* HEADER */}
      <header className="ZENVE-header">
        <div className="ZENVE-header-inner">
          <div className="ZENVE-header-left">
            <div className="ZENVE-header-title-block">
              <h1 className="ZENVE-portal-title">
                <span className="ZENVE-layer-num">12</span>
                <span>Command Centre</span>
              </h1>

              <p className="ZENVE-portal-desc">
                Admin layer · Approvals, controls, exceptions
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* TOAST ALERT */}
      {toastMessage && <div className="cc-toast">{toastMessage}</div>}

      {/* MAIN CONTAINER */}
      <main className="command-centre-container">
        {/* ERROR BANNER */}
        {error && (
          <div className="cc-error-banner">
            <span>{error}</span>
            <button type="button" onClick={() => fetchAllData(true)}>
              Retry
            </button>
          </div>
        )}

        {/* 1. TOP 4 KPIS */}
        <section className="cc-kpi-grid">
          <div className="cc-kpi-card">
            <p className="label-caps">Open exceptions</p>
            <p className="cc-kpi-val">{loading ? "..." : exceptions.length}</p>
            <p className="cc-kpi-hint">Active rule alerts</p>
          </div>

          <div className="cc-kpi-card">
            <p className="label-caps">GMV booked</p>
            <p className="cc-kpi-val">
              {loading ? "..." : `₹${gmv >= 1000 ? gmv.toLocaleString() : gmv.toFixed(2)}`}
            </p>
            <p className="cc-kpi-hint">{orders.length} orders</p>
          </div>

          <div className="cc-kpi-card">
            <p className="label-caps">Sellable units</p>
            <p className="cc-kpi-val">{loading ? "..." : sellableUnits}</p>
            <p className="cc-kpi-hint">Available stock</p>
          </div>

          <div className="cc-kpi-card">
            <p className="label-caps">Active vendors</p>
            <p className="cc-kpi-val">{loading ? "..." : activeDesigners}</p>
            <p className="cc-kpi-hint">Supply partners</p>
          </div>
        </section>

        {/* 2. PENDING APPROVALS */}
        <section className="cc-panel">
          <div className="cc-panel-header">
            <div className="cc-panel-title-block">
              <h2 className="cc-panel-title">Pending approvals</h2>
              <p className="cc-panel-desc">
                Every item links to the layer where it gets cleared.
              </p>
            </div>
          </div>

          <div className="cc-approvals-grid">
            {pendingApprovalsList.map((item) => (
              <Link key={item.label} to={item.to} className="cc-approval-link">
                <span>{item.label}</span>
                <span
                  className={`tone-badge ${item.count > 0 ? "warn" : "good"}`}
                >
                  {loading ? "..." : item.count}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 3. EXCEPTIONS & AUTOMATION ALERTS */}
        <section className="cc-panel">
          <div className="cc-panel-header">
            <div className="cc-panel-title-block">
              <h2 className="cc-panel-title">Exceptions & automation alerts</h2>
              <p className="cc-panel-desc">
                Generated by the rules in the blueprint.
              </p>
            </div>
          </div>

          {exceptions.length === 0 ? (
            <div className="cc-panel-empty">All clear. No exceptions raised.</div>
          ) : (
            <ul className="cc-exceptions-list">
              {exceptions.map((item, idx) => (
                <li
                  key={idx}
                  className="cc-exception-item"
                  onClick={() => item.path && navigate(item.path)}
                  title={item.path ? `Jump to ${item.layer}` : ""}
                >
                  <span
                    className={`tone-badge ${item.level === "high" ? "bad" : "warn"
                      }`}
                  >
                    {item.layer}
                  </span>
                  <span className="cc-exception-msg">{item.message}</span>
                  {item.path && <span className="cc-exception-arrow">→</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 4. AUDIT LOG */}
        <section className="cc-panel">
          <div className="cc-panel-header">
            <div className="cc-panel-title-block">
              <h2 className="cc-panel-title">Audit log</h2>
              <p className="cc-panel-desc">
                Every price, inventory, approval, order and settlement change — filterable and exportable.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="cc-header-btn"
                onClick={() => fetchAllData(true)}
                disabled={refreshing}
                title="Refresh live metrics from database"
              >
                <RefreshIcon spinning={refreshing} />
                <span>{refreshing ? "Refreshing..." : "Refresh data"}</span>
              </button>

              <button
                type="button"
                className="cc-header-btn"
                onClick={handleExportFilteredAudit}
              >
                <DownloadIcon className="cc-report-icon" />
                <span>Export filtered</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="cc-audit-toolbar">
            <input
              type="text"
              className="cc-audit-search"
              placeholder="Search events, IDs, statuses…"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
            />

            <select
              className="cc-audit-select"
              value={auditLayerFilter}
              onChange={(e) => setAuditLayerFilter(e.target.value)}
            >
              <option value="ALL">All layers</option>
              {uniqueAuditLayers.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              className="cc-audit-select"
              value={auditTimeFilter}
              onChange={(e) => setAuditTimeFilter(e.target.value)}
            >
              {TIME_RANGES.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.label}
                </option>
              ))}
            </select>

            <span className="tone-badge info">
              {filteredAuditLogs.length} of {allAuditLogs.length} events
            </span>

            {(auditSearch ||
              auditLayerFilter !== "ALL" ||
              auditTimeFilter !== "all") && (
                <button
                  type="button"
                  className="cc-clear-btn"
                  onClick={handleClearFilters}
                >
                  Clear filters
                </button>
              )}
          </div>

          {/* Events List */}
          {filteredAuditLogs.length === 0 ? (
            <div className="cc-panel-empty">No events match these filters.</div>
          ) : (
            <ul className="cc-audit-list">
              {filteredAuditLogs.slice(0, visibleAuditCount).map((item) => (
                <li key={item.id} className="cc-audit-row">
                  <span className="cc-audit-timestamp">
                    {new Date(item.at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  <span className="tone-badge neutral">{item.layer}</span>
                  <span className="cc-audit-msg">{item.message}</span>
                </li>
              ))}
            </ul>
          )}

          {filteredAuditLogs.length > visibleAuditCount && (
            <button
              type="button"
              className="cc-show-more-btn"
              onClick={() => setVisibleAuditCount((c) => c + 60)}
            >
              Show more ({filteredAuditLogs.length - visibleAuditCount} older)
            </button>
          )}
        </section>

        {/* 5. OPERATIONAL REPORT EXPORT */}
        <section className="cc-panel">
          <div className="cc-panel-header">
            <div className="cc-panel-title-block">
              <h2 className="cc-panel-title">Operational report export</h2>
              <p className="cc-panel-desc">
                Download the whole book of record, or just the section you need. Opens directly in Excel or Sheets.
              </p>
            </div>

            <button
              type="button"
              className="cc-header-btn primary"
              onClick={handleExportFullReport}
            >
              <FileDownIcon />
              <span>Export full report</span>
            </button>
          </div>

          <div className="cc-reports-grid">
            {exportCards.map((card) => (
              <button
                type="button"
                key={card.key}
                className="cc-report-btn"
                onClick={() => handleExportSection(card.key)}
              >
                <div className="cc-report-left">
                  <span className="cc-report-title">{card.title}</span>
                  <span className="cc-report-rows">{card.rows} rows</span>
                </div>
                <DownloadIcon />
              </button>
            ))}
          </div>
        </section>

        {/* 6. JUMP TO A LAYER */}
        <section className="cc-panel">
          <div className="cc-panel-header">
            <div className="cc-panel-title-block">
              <h2 className="cc-panel-title">Jump to a layer</h2>
            </div>
          </div>

          <div className="cc-jump-grid">
            {ALL_12_LAYERS.map((layer) => (
              <Link key={layer.to} to={layer.to} className="cc-jump-card">
                <span className="cc-jump-num">
                  {String(layer.no).padStart(2, "0")}
                </span>
                <span>· {layer.module}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}