import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/VendorCrm.css";
import SearchBar from "../components/SearchBar";
import {
  getVendors as getDesigners,
  createVendor as createDesigner,
  updateVendor as updateDesigner,
  getOnlineVendorPlans,
  getOrders,
  getProducts,
  getReturns,
  getSettlements,
} from "../services/api";

import { maskGstNumber } from "../utils/gstUtils.js";
import { getVendorLoginUrl } from "../utils/vendorLoginLink.js";
import { showSuccessToast, showErrorToast, showWarningToast } from "../utils/zenveToast";

/* =========================================================
   CONSTANTS & BLUEPRINT SEQUENCE
========================================================= */

export const COMPANY_GST_INFO = {
  name: "ZENVE FASHION PRIVATE LIMITED",
  gstNumber: "29AABCZ1234F1Z8",
  state: "Karnataka (All-India E-Commerce Coverage)",
  type: "E-Commerce Marketplace Operator & Master Platform GSTIN",
  section: "Section 9(5) & Section 52 CGST Act",
  hsnSac: "998311 / 998439 (Fashion Marketplace & Creator Supply Services)",
};

function WhatsAppIcon({ size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

const STAGES_SEQUENCE = [
  "LEAD",
  "QUALIFIED",
  "PORTFOLIO",
  "REVIEW",
  "APPROVED",
  "CONTRACT",
  "SIGNED",
  "LIVE",
  "ACTIVE",
  "REJECTED",
];

const SALES_OWNERS = [
  "Nisha Kapoor",
  "Dev Ranganathan",
  "Sana Qureshi",
  "Unassigned",
];

const LEAD_SOURCES = [
  "Referral",
  "Outreach",
  "Inbound",
  "Instagram",
  "Trade Show",
  "Agency",
];

const LOST_REASONS = [
  "Price / take rate",
  "Exclusivity with another marketplace",
  "Capacity constraints",
  "Quality below standard",
  "Went silent",
];

function getStageTone(stage) {
  switch (stage) {
    case "ACTIVE":
    case "LIVE":
    case "SIGNED":
      return "good";
    case "APPROVED":
    case "CONTRACT":
    case "REVIEW":
      return "info";
    case "QUALIFIED":
    case "PORTFOLIO":
      return "warn";
    case "REJECTED":
    case "OFFBOARDED":
      return "bad";
    default:
      return "neutral";
  }
}

const CREDIT_PLANS = [
  { id: 1, code: "SILVER", name: "Silver", credit_points: 200000, sku_limit: 24, tier: "EMERGING" },
  { id: 2, code: "GOLD", name: "Gold", credit_points: 375000, sku_limit: 49, tier: "CORE" },
  { id: 3, code: "PLATINUM", name: "Platinum", credit_points: 500000, sku_limit: 65, tier: "PREMIUM" },
];

const DEFAULT_VENDOR_PLANS = CREDIT_PLANS;

/* =========================================================
   MAIN COMPONENT: 01 DESIGNER CRM
========================================================= */

export default function DesignerCRM() {
  const [vendorPlans, setVendorPlans] = useState(DEFAULT_VENDOR_PLANS);
  const [designers, setDesigners] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [returns, setReturns] = useState([]);
  const [settlements, setSettlements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // New task inputs per designer
  const [taskInputs, setTaskInputs] = useState({});

  // Add lead form state (clean initial state)
  const [newLead, setNewLead] = useState({
    name: "",
    brand: "",
    email: "",
    phone: "",
    city: "",
    category: "",
    tier: "Emerging",
    selectedPlan: "",
    fashionCreditPlan: "",
    creditPoints: 0,
    takeRate: "",
    gst: "",
    contractEnds: "",
    source: "Referral",
    owner: "Nisha Kapoor",
    nextFollowUp: "",
    fulfillment: "",
    renewalProbability: "0",
  });

  // GST Modal & Company GST State
  const [showGstModal, setShowGstModal] = useState(false);
  const [useCompanyGst, setUseCompanyGst] = useState(false);
  const [gstModalTarget, setGstModalTarget] = useState("newLead"); // 'newLead' | designer object

  const showToast = (msg, isError = false) => {
    setToastMessage(msg);
    if (isError) {
      showErrorToast(msg);
    } else {
      showSuccessToast(msg);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirmCompanyGst = async () => {
    const masked = maskGstNumber(COMPANY_GST_INFO.gstNumber);
    if (gstModalTarget === "newLead") {
      setNewLead((prev) => ({ ...prev, gst: COMPANY_GST_INFO.gstNumber }));
      setUseCompanyGst(true);
      showToast(`Applied ZENVE Company GST (${masked})`);
    } else if (gstModalTarget && typeof gstModalTarget === "object") {
      try {
        await handleUpdateField(gstModalTarget.id, {
          gst_number: COMPANY_GST_INFO.gstNumber,
        });
        showToast(
          `Applied Company GST (${masked}) to ${gstModalTarget.brand_name || gstModalTarget.designer_name || "designer"
          }`
        );
      } catch (err) {
        console.error("Failed to update vendor GST:", err);
      }
    }
    setShowGstModal(false);
  };

  const handleRequestCompanyGstCreation = async () => {
    const targetName =
      gstModalTarget === "newLead"
        ? newLead.brand || newLead.name || "New Vendor Lead"
        : gstModalTarget?.brand_name ||
        gstModalTarget?.designer_name ||
        "Vendor";

    const targetCity =
      gstModalTarget === "newLead"
        ? newLead.city || "Regional Hub"
        : gstModalTarget?.city || gstModalTarget?.state || "Regional Hub";

    if (gstModalTarget === "newLead") {
      setNewLead((prev) => ({ ...prev, gst: "COMPANY_GST_REQUESTED" }));
      setUseCompanyGst(true);
      showToast(
        `Requested company-side GST creation for ${targetName}! Company will create a new GST number.`
      );
    } else if (gstModalTarget && typeof gstModalTarget === "object") {
      try {
        const existingTasks = gstModalTarget.follow_up_tasks || [];
        const newTask = {
          id: Date.now(),
          text: `Company Tax Team: Create dedicated company GST number for ${targetName} (${targetCity})`,
          due_date: new Date().toISOString().split("T")[0],
          completed: false,
        };

        await handleUpdateField(gstModalTarget.id, {
          gst_number: "COMPANY_GST_REQUESTED",
          follow_up_tasks: [...existingTasks, newTask],
        });

        showToast(
          `Requested! Company side will create a new GST number for ${targetName}.`
        );
      } catch (err) {
        console.error("Failed to request company GST creation:", err);
      }
    }
    setShowGstModal(false);
  };

  const handleCloseGstModal = () => {
    setShowGstModal(false);
    if (
      gstModalTarget === "newLead" &&
      newLead.gst.trim().toUpperCase() !== COMPANY_GST_INFO.gstNumber &&
      newLead.gst !== "COMPANY_GST_REQUESTED"
    ) {
      setUseCompanyGst(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showGstModal) {
        handleCloseGstModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showGstModal, newLead.gst, gstModalTarget]);

  const handleCopyVendorLoginLink = async () => {
    const url = getVendorLoginUrl();
    try {
      await navigator.clipboard.writeText(url);
      showToast("Vendor login link copied. Share it by WhatsApp, email, or any messaging service.");
    } catch {
      window.prompt("Copy the vendor login link:", url);
    }
  };

  // Prepare a WhatsApp message for the team to review and send.
  const handleSendWhatsAppPortalLink = (designer) => {
    if (!designer) return;
    const phoneRaw = designer.phone || designer.contact || "";
    let cleanPhone = phoneRaw.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    if (!cleanPhone) {
      const input = window.prompt(
        `Enter WhatsApp phone number for ${designer.designer_name || designer.brand_name} (with country code, e.g. 919876543210):`,
        "91"
      );
      if (!input) return;
      cleanPhone = input.replace(/[^0-9]/g, "");
    }

    const designerName = designer.designer_name || designer.brand_name || "Vendor";
    const brandName = designer.brand_name || designer.designer_name || "Vendor Brand";
    const portalUrl = getVendorLoginUrl();

    const message = `*Zippy Vendor Login*

Hello *${designerName}*,

Sign in to your vendor account using this link:
${portalUrl}

Use your registered username or email and password to open your vendor portal.

If you need help accessing your account, please contact our team.

Team Zippy`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    showToast(`WhatsApp login message opened for ${brandName}. Review it and press Send in WhatsApp.`);
  };

  // Fetch all live records
  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [designersRes, plansRes] = await Promise.all([
        getDesigners(),
        getOnlineVendorPlans().catch(() => DEFAULT_VENDOR_PLANS),
      ]);
      if (Array.isArray(plansRes) && plansRes.length > 0) {
        setVendorPlans(plansRes);
      }
      const [
        ordersRes,
        productsRes,
        returnsRes,
        settlementsRes,
      ] = await Promise.all([
        getOrders().catch(() => []),
        getProducts().catch(() => []),
        getReturns().catch(() => []),
        getSettlements().catch(() => []),
      ]);

      setDesigners(Array.isArray(designersRes) ? designersRes : []);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setProducts(Array.isArray(productsRes) ? productsRes : []);
      setReturns(Array.isArray(returnsRes) ? returnsRes : []);
      setSettlements(Array.isArray(settlementsRes) ? settlementsRes : []);

      if (isManual) showToast("Live vendor pipeline refreshed.");
    } catch (err) {
      console.error("Failed to load CRM data:", err);
      setError(err.message || "Failed to connect to backend server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Top 5 KPIs
  const pipelineCount = designers.length;

  const sellingNowCount = useMemo(() => {
    return designers.filter((d) => ["LIVE", "ACTIVE"].includes(d.stage)).length;
  }, [designers]);

  const kycPendingCount = useMemo(() => {
    return designers.filter((d) => !d.kyc_verified && d.kyc_status !== "VERIFIED")
      .length;
  }, [designers]);

  const followupsOverdueCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    let count = 0;
    designers.forEach((d) => {
      (d.follow_up_tasks || []).forEach((t) => {
        if (!t.completed && t.due_date && t.due_date < today) {
          count += 1;
        }
      });
    });
    return count;
  }, [designers]);

  const allSalesOwners = useMemo(() => {
    const list = new Set(SALES_OWNERS);
    designers.forEach((d) => {
      if (d.sales_owner) list.add(d.sales_owner);
    });
    return Array.from(list);
  }, [designers]);

  const allLeadSources = useMemo(() => {
    const list = new Set(LEAD_SOURCES);
    designers.forEach((d) => {
      if (d.lead_source) list.add(d.lead_source);
    });
    return Array.from(list);
  }, [designers]);

  const partnershipRevenue = useMemo(() => {
    return settlements
      .filter((s) => s.status !== "REVERSED" && !s.is_reversal)
      .reduce(
        (sum, s) => sum + (Number(s.commission || s.commission_amount) || 0),
        0
      );
  }, [settlements]);

  // Designer Economics & Health Score calculation from live DB metrics
  const getDesignerEconomics = (designer) => {
    const isKyc =
      designer.is_kyc_verified ??
      (designer.kyc_verified || designer.kyc_status === "VERIFIED");

    // Match all products belonging to this designer
    const designerProducts = products.filter(
      (p) =>
        (designer.legacy_designer_id != null && p.designer === designer.legacy_designer_id) ||
        (designer.legacy_designer_id != null && p.designerId === designer.legacy_designer_id) ||
        p.designer_code === designer.designer_code ||
        p.designer_brand === designer.brand_name ||
        p.designer_name === designer.brand_name ||
        p.designer_name === designer.designer_name ||
        p.designer_name === designer.owner_name
    );
    const designerProductIds = designerProducts.map((p) => String(p.id));
    const designerSkus = designerProducts.map((p) => p.sku).filter(Boolean);

    // Calculate line-item totals from database orders
    let orderItemsSum = 0;
    let orderItemsMonthlySum = 0;
    const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;

    orders.forEach((o) => {
      const isCancelled =
        String(o.status || o.order_status || "").toUpperCase() === "CANCELLED";
      if (isCancelled) return;

      const orderTime = o.created_at ? new Date(o.created_at).getTime() : 0;
      const isRecent = orderTime >= monthAgo;

      const items = o.items || o.lines || [];
      items.forEach((item) => {
        const matches =
          (item.brand_name && item.brand_name === designer.brand_name) ||
          (item.brand && item.brand === designer.brand_name) ||
          (item.product_id && designerProductIds.includes(String(item.product_id))) ||
          (item.sku && designerSkus.includes(item.sku)) ||
          (item.skuId && designerSkus.includes(item.skuId));

        if (matches) {
          const itemTotal =
            Number(
              item.total ||
              item.total_price ||
              (Number(item.price || 0) * Number(item.quantity || item.qty || 1))
            ) || 0;
          orderItemsSum += itemTotal;
          if (isRecent) {
            orderItemsMonthlySum += itemTotal;
          }
        }
      });
    });

    // Prefer backend calculated DB metrics if available, fallback to computed items
    const gmv =
      designer.lifetime_gmv !== undefined && Number(designer.lifetime_gmv) > 0
        ? Number(designer.lifetime_gmv)
        : orderItemsSum;

    const monthlyGmv =
      designer.monthly_gmv !== undefined && Number(designer.monthly_gmv) > 0
        ? Number(designer.monthly_gmv)
        : (orderItemsMonthlySum > 0 ? orderItemsMonthlySum : gmv);

    const takeRatePct = Number(designer.take_rate) || 0;
    const ltv =
      designer.designer_ltv !== undefined && Number(designer.designer_ltv) > 0
        ? Number(designer.designer_ltv)
        : Math.round((gmv * takeRatePct) / 100);

    const cac = Number(designer.designer_cac ?? designer.acquisition_cost) || 0;
    const roi =
      designer.ltv_cac_ratio ||
      (cac > 0 && ltv > 0
        ? `${Math.round((ltv / cac) * 100) / 100}×`
        : "0×");

    const liveSkus = designerProducts.filter(
      (p) => p.status === "LIVE" || p.status === "APPROVED" || p.is_live
    ).length;

    const skuProductivity =
      designer.effective_sku_productivity !== undefined &&
        Number(designer.effective_sku_productivity) > 0
        ? Number(designer.effective_sku_productivity)
        : (liveSkus > 0 ? Math.round(gmv / liveSkus) : Math.round(gmv));

    // Health score from real DB data
    const totalProds = designerProducts.length;
    const qaApproved = designerProducts.filter(
      (p) =>
        p.status === "LIVE" ||
        p.status === "APPROVED" ||
        p.qa_status === "APPROVED"
    ).length;
    const qaRate = totalProds > 0 ? (qaApproved / totalProds) * 100 : 0;
    const inStock = designerProducts.filter(
      (p) => Number(p.available_quantity || p.inventory_quantity || 0) > 0
    ).length;
    const stockRate = totalProds > 0 ? (inStock / totalProds) * 100 : 0;
    const renewalProb = Number(designer.renewal_likelihood ?? 0);

    const health =
      designer.health_score !== undefined && Number(designer.health_score) > 0
        ? Number(designer.health_score)
        : totalProds > 0 || gmv > 0
          ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                qaRate * 0.25 +
                stockRate * 0.2 +
                Math.min(100, monthlyGmv / 500) * 0.25 +
                (isKyc ? 100 : 0) * 0.1 +
                renewalProb * 0.2
              )
            )
          )
          : Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (isKyc ? 100 : 0) * 0.3 +
                renewalProb * 0.4 +
                (designer.contract_signed ? 30 : 0)
              )
            )
          );

    return {
      monthlyGmv,
      gmv,
      ltv,
      cac,
      roi,
      skuProductivity,
      health,
      isKyc,
    };
  };

  // Actions
  const handleStageChange = async (designerId, nextStage) => {
    try {
      await updateDesigner(designerId, { stage: nextStage });
      setDesigners((list) =>
        list.map((d) => (d.id === designerId ? { ...d, stage: nextStage } : d))
      );
      showToast(`Updated stage to ${nextStage}.`);
    } catch (err) {
      console.error("Failed to update stage:", err);
      showErrorToast("Failed to update stage.");
    }
  };

  const handleAdvanceStage = async (designer) => {
    const currentIdx = STAGES_SEQUENCE.indexOf(designer.stage);
    if (currentIdx === -1 || currentIdx >= STAGES_SEQUENCE.length - 2) {
      showToast(`${designer.brand_name} is at final stage.`);
      return;
    }
    const nextStage = STAGES_SEQUENCE[currentIdx + 1];
    await handleStageChange(designer.id, nextStage);
    showToast(`${designer.brand_name} advanced to ${nextStage}.`);
  };

  const handleToggleKyc = async (designer) => {
    const currentVerified =
      designer.kyc_verified || designer.kyc_status === "VERIFIED";
    const nextStatus = currentVerified ? "PENDING" : "VERIFIED";
    try {
      await updateDesigner(designer.id, {
        kyc_status: nextStatus,
        kyc_verified: !currentVerified,
      });
      setDesigners((list) =>
        list.map((d) =>
          d.id === designer.id
            ? {
              ...d,
              kyc_status: nextStatus,
              kyc_verified: !currentVerified,
            }
            : d
        )
      );
      showToast(
        !currentVerified
          ? `${designer.brand_name} KYC verified.`
          : `${designer.brand_name} KYC revoked.`
      );
    } catch (err) {
      console.error("Failed to toggle KYC:", err);
      showErrorToast("Failed to update KYC status.");
    }
  };

  const handleUpdateField = async (designerId, patch) => {
    try {
      const updated = await updateDesigner(designerId, patch);
      setDesigners((list) =>
        list.map((d) => (d.id === designerId ? { ...d, ...updated } : d))
      );
      showToast("Updated vendor details.");
    } catch (err) {
      console.error("Failed to update vendor:", err);
      showErrorToast(err.message || "Failed to update vendor details.");
    }
  };

  // Follow-up tasks
  const handleToggleTask = async (designerId, taskId) => {
    const target = designers.find((d) => d.id === designerId);
    if (!target) return;
    const updatedTasks = (target.follow_up_tasks || []).map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed, done: !t.done } : t
    );

    setDesigners((list) =>
      list.map((d) =>
        d.id === designerId ? { ...d, follow_up_tasks: updatedTasks } : d
      )
    );

    try {
      await updateDesigner(designerId, { follow_up_tasks: updatedTasks });
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const handleAddTask = async (designerId) => {
    const input = taskInputs[designerId] || {};
    const text = (input.text || "").trim();
    const due = input.due || new Date().toISOString().split("T")[0];

    if (!text) {
      showWarningToast("Task title is required.");
      return;
    }

    const newTask = {
      id: Date.now(),
      text,
      title: text,
      due,
      due_date: due,
      completed: false,
      done: false,
    };

    const target = designers.find((d) => d.id === designerId);
    const updatedTasks = [...(target?.follow_up_tasks || []), newTask];

    setDesigners((list) =>
      list.map((d) =>
        d.id === designerId ? { ...d, follow_up_tasks: updatedTasks } : d
      )
    );

    setTaskInputs((prev) => ({
      ...prev,
      [designerId]: { text: "", due: "" },
    }));

    try {
      await updateDesigner(designerId, { follow_up_tasks: updatedTasks });
      showToast("Follow-up scheduled.");
    } catch (err) {
      console.error("Failed to save task:", err);
    }
  };

  // Create lead
  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLead.name.trim() || !newLead.brand.trim()) {
      showWarningToast("Vendor name and brand name are required.");
      return;
    }
    if (!newLead.email.trim() && !newLead.phone.trim()) {
      showWarningToast("Please provide at least an email address or mobile number.");
      return;
    }

    const designerCode = `DSG-${String(Date.now()).slice(-4)}`;

    const payload = {

      vendor_name: newLead.name.trim(),
      brand_name: newLead.brand.trim(),
      owner_name: newLead.name.trim(),
      email: newLead.email.trim() || null,
      phone: newLead.phone.trim() || null,
      city: newLead.city.trim() || "",
      primary_category: newLead.category.trim() || "",
      tier: (newLead.tier || "EMERGING").toUpperCase(),
      plan_type: newLead.fashionCreditPlan ? Number(newLead.fashionCreditPlan) : null,
      online_membership_plan: newLead.selectedPlan
        ? newLead.selectedPlan.toUpperCase()
        : newLead.fashionCreditPlan
          ? (vendorPlans.find((p) => p.id === Number(newLead.fashionCreditPlan)) || CREDIT_PLANS.find((p) => p.id === Number(newLead.fashionCreditPlan)))?.code || null
          : null,
      credit_points: newLead.creditPoints || 0,
      take_rate: newLead.takeRate !== "" ? Number(newLead.takeRate) : 0,
      gst_number: newLead.gst.trim()
        ? newLead.gst === "COMPANY_GST_REQUESTED"
          ? ""
          : newLead.gst.trim().toUpperCase() === maskGstNumber(COMPANY_GST_INFO.gstNumber)
            ? COMPANY_GST_INFO.gstNumber
            : newLead.gst.trim().toUpperCase()
        : "",
      contract_end_date: newLead.contractEnds || null,
      lead_source: newLead.source,
      sales_owner: newLead.owner,
      next_followup_date: newLead.nextFollowUp || null,
      fulfillment: newLead.fulfillment,
      // Keep the existing percentage storage compatible with CRM analytics.
      renewal_likelihood: Number(newLead.renewalProbability),
      stage: "LEAD",
      kyc_status: "PENDING",
      kyc_verified: false,
      follow_up_tasks:
        newLead.gst === "COMPANY_GST_REQUESTED"
          ? [
            {
              id: Date.now(),
              text: `Company Tax Team: Create dedicated company GST for ${newLead.brand.trim()} (${newLead.city.trim() || "Regional Hub"})`,
              due_date: new Date().toISOString().split("T")[0],
              completed: false,
            },
          ]
          : [],
    };

    try {
      const created = await createDesigner(payload);
      setDesigners((prev) => [created, ...prev]);
      showToast(`${newLead.brand} added as a new lead.`);
      setNewLead({
        name: "",
        brand: "",
        email: "",
        phone: "",
        city: "",
        category: "",
        tier: "Emerging",
        selectedPlan: "",
        fashionCreditPlan: "",
        creditPoints: 0,
        takeRate: "",
        gst: "",
        contractEnds: "",
        source: "Referral",
        owner: "Nisha Kapoor",
        nextFollowUp: "",
        fulfillment: "",
        renewalProbability: "0",
      });
      setUseCompanyGst(false);
    } catch (err) {
      console.error("Failed to create vendor lead:", err);
      showErrorToast(err.message || "Failed to create vendor lead.");
    }
  };

  return (
    <div className="designer-crm-page">
      {/* HEADER */}
      <header className="ZENVE-header">
        <div className="ZENVE-header-inner">
          <div className="ZENVE-header-left">
            <div className="ZENVE-header-title-block">
              <h1 className="ZENVE-portal-title">
                <span className="ZENVE-layer-num">01</span>
                <span>Vendor CRM</span>
              </h1>

              <p className="ZENVE-portal-desc">
                Supply layer · Lead, qualification, approval, KYC, contract, status
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* TOAST ALERT */}
      {toastMessage && <div className="crm-toast">{toastMessage}</div>}

      {/* MAIN CONTAINER */}
      <main className="crm-container">
        {/* ERROR BANNER */}
        {error && (
          <div className="crm-error-banner">
            <span>{error}</span>
            <button type="button" onClick={() => loadData(true)}>
              Retry
            </button>
          </div>
        )}

        {/* 1. TOP 5 KPI CARDS */}
        <section className="crm-kpi-grid">
          <div className="crm-kpi-card">
            <p className="label-caps">Pipeline</p>
            <p className="crm-kpi-value">{loading ? "..." : pipelineCount}</p>
            <p className="crm-kpi-hint">All vendors</p>
          </div>

          <div className="crm-kpi-card">
            <p className="label-caps">Selling now</p>
            <p className="crm-kpi-value">{loading ? "..." : sellingNowCount}</p>
            <p className="crm-kpi-hint">Live or active</p>
          </div>

          <div className="crm-kpi-card">
            <p className="label-caps">KYC pending</p>
            <p className="crm-kpi-value">{loading ? "..." : kycPendingCount}</p>
            <p className="crm-kpi-hint">Blocks contract</p>
          </div>

          <div className="crm-kpi-card">
            <p className="label-caps">Follow-ups overdue</p>
            <p className="crm-kpi-value">{loading ? "..." : followupsOverdueCount}</p>
            <p className="crm-kpi-hint">Needs a call today</p>
          </div>

          <div className="crm-kpi-card">
            <p className="label-caps">Partnership revenue</p>
            <p className="crm-kpi-value">
              {loading ? "..." : `₹${partnershipRevenue.toLocaleString()}`}
            </p>
            <p className="crm-kpi-hint">Commission earned by Zenve</p>
          </div>
        </section>

        {/* 2. DESIGNER PIPELINE */}
        <section className="crm-panel">
          <div className="crm-panel-header">
            <div className="crm-panel-title-block">
              <h2 className="crm-panel-title">Vendor pipeline</h2>
              <p className="crm-panel-desc">
                Stages follow the blueprint: lead → qualified → portfolio →
                review → approved → contract → signed → live → active.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="crm-empty-state">Loading vendor records...</div>
          ) : designers.length === 0 ? (
            <div className="crm-empty-state">
              No vendors yet. Add a lead below.
            </div>
          ) : (
            <div className="designer-cards-list">
              {designers.map((designer) => {
                const econ = getDesignerEconomics(designer);
                const tasks = designer.follow_up_tasks || [];
                const currentInput = taskInputs[designer.id] || {
                  text: "",
                  due: "",
                };

                return (
                  <article className="designer-card" key={designer.id}>
                    {/* Top Row: Brand, Badges, Stage Actions */}
                    <div className="designer-card-top">
                      <div className="designer-info-left">
                        <div className="designer-header-row">
                          <h3 className="designer-brand-name">
                            {designer.brand_name || designer.name || "Brand"}
                          </h3>

                          <span
                            className={`tone-badge ${getStageTone(
                              designer.stage
                            )}`}
                          >
                            {designer.stage || "LEAD"}
                          </span>

                          <span className="tone-badge info">
                            {designer.tier || "Emerging"}
                          </span>

                          {designer.online_membership_plan && (
                            <span
                              className="tone-badge"
                              style={{
                                background: "rgba(223, 177, 108, 0.15)",
                                color: "#dfb16c",
                                border: "1px solid rgba(223, 177, 108, 0.35)",
                                fontWeight: "600",
                              }}
                              title={`Credit Points: ${Number(designer.credit_points || 0).toLocaleString("en-IN")}`}
                            >
                              ★ {designer.online_membership_plan} ({Number(designer.credit_points || 0).toLocaleString("en-IN")} Pts)
                            </span>
                          )}

                          <span
                            className={`tone-badge ${econ.isKyc ? "good" : "bad"
                              }`}
                          >
                            {econ.isKyc ? "KYC verified" : "KYC missing"}
                          </span>

                          <span
                            className={`tone-badge ${econ.health >= 70
                              ? "good"
                              : econ.health >= 45
                                ? "warn"
                                : "bad"
                              }`}
                          >
                            Health {econ.health}/100
                          </span>

                          <span
                            className={`tone-badge ${designer.gst_number || designer.gst ? "good" : "warn"
                              }`}
                          >
                            {designer.gst_number || designer.gst
                              ? (designer.gst_number === COMPANY_GST_INFO.gstNumber ||
                                designer.gst === COMPANY_GST_INFO.gstNumber
                                ? "Company GST"
                                : (designer.gst_number === "COMPANY_GST_REQUESTED" ||
                                  designer.gst === "COMPANY_GST_REQUESTED")
                                  ? "GST Requested (Company)"
                                  : "GST Verified")
                              : "No GST"}
                          </span>
                        </div>

                        {/* Meta Line 1 */}
                        <p className="designer-subtext-line">
                          {designer.designer_code || `DSG-${designer.id}`} ·{" "}
                          {designer.designer_name || designer.owner_name || "—"} ·{" "}
                          {designer.email || designer.phone || "—"} ·{" "}
                          {designer.city || "—"} ·{" "}
                          {designer.primary_category || "—"} · take
                          rate {designer.take_rate != null ? `${Number(designer.take_rate)}%` : "0%"}
                          {designer.online_membership_plan
                            ? ` · Credits: ${designer.online_membership_plan} (${Number(designer.credit_points || 0).toLocaleString("en-IN")} pts)`
                            : ""}
                          {designer.contract_end_date
                            ? ` · contract ends ${designer.contract_end_date}`
                            : ""} · GST:{" "}
                          {designer.gst_number || designer.gst ? (
                            <span className="designer-gst-code">
                              {designer.gst_number === "COMPANY_GST_REQUESTED" ||
                                designer.gst === "COMPANY_GST_REQUESTED" ? (
                                <span className="tone-badge warn" style={{ fontSize: "11px", padding: "2px 6px" }}>
                                  Creation Requested (Company)
                                </span>
                              ) : (
                                <>
                                  {(designer.gst_number === COMPANY_GST_INFO.gstNumber ||
                                    designer.gst === COMPANY_GST_INFO.gstNumber)
                                    ? maskGstNumber(designer.gst_number || designer.gst)
                                    : (designer.gst_number || designer.gst)}
                                  {(designer.gst_number === COMPANY_GST_INFO.gstNumber ||
                                    designer.gst === COMPANY_GST_INFO.gstNumber) && (
                                      <span className="designer-gst-corp-tag">ZENVE</span>
                                    )}
                                </>
                              )}
                              <button
                                type="button"
                                className="crm-gst-switch-btn"
                                title="Change or request Company GST"
                                onClick={() => {
                                  setGstModalTarget(designer);
                                  setShowGstModal(true);
                                }}
                              >
                                ✎
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="crm-gst-assign-link"
                              onClick={() => {
                                setGstModalTarget(designer);
                                setShowGstModal(true);
                              }}
                            >
                              + Assign Company GST
                            </button>
                          )}
                        </p>

                        {/* Meta Line 2 */}
                        <p className="designer-subtext-line">
                          Source {designer.lead_source || "Referral"} · sales admin{" "}
                          {designer.sales_owner || "Unassigned"} · next follow-up{" "}
                          {designer.next_followup_date
                            ? new Date(
                              designer.next_followup_date
                            ).toLocaleDateString()
                            : "not set"}{" "}
                          · renewal likelihood{" "}
                          {designer.renewal_likelihood === 100 ? "Yes" : designer.renewal_likelihood === 0 ? "No" : designer.renewal_likelihood != null ? `${designer.renewal_likelihood}%` : "—"}
                          {designer.lost_reason
                            ? ` · lost: ${designer.lost_reason}`
                            : ""}
                        </p>
                      </div>

                      {/* Right Actions */}
                      <div className="designer-actions-right">
                        <select
                          className="designer-stage-select"
                          value={designer.stage || "LEAD"}
                          onChange={(e) =>
                            handleStageChange(designer.id, e.target.value)
                          }
                        >
                          {STAGES_SEQUENCE.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="btn-crm-action outline"
                          onClick={() => handleToggleKyc(designer)}
                        >
                          {econ.isKyc ? "Revoke KYC" : "Verify KYC"}
                        </button>

                        <button
                          type="button"
                          className="btn-crm-action primary"
                          onClick={() => handleAdvanceStage(designer)}
                        >
                          Advance stage
                        </button>
                      </div>
                    </div>

                    {/* 6 Economics Boxes */}
                    <div className="designer-economics-grid">
                      <div className="econ-box">
                        <span className="label-caps">Monthly GMV</span>
                        <span className="econ-val">
                          ₹{econ.monthlyGmv.toLocaleString()}
                        </span>
                      </div>

                      <div className="econ-box">
                        <span className="label-caps">Lifetime GMV</span>
                        <span className="econ-val">
                          ₹{econ.gmv.toLocaleString()}
                        </span>
                      </div>

                      <div className="econ-box">
                        <span className="label-caps">Vendor LTV</span>
                        <span className="econ-val">
                          ₹{econ.ltv.toLocaleString()}
                        </span>
                      </div>

                      <div className="econ-box">
                        <span className="label-caps">Vendor CAC</span>
                        <span className="econ-val">
                          ₹{econ.cac.toLocaleString()}
                        </span>
                      </div>

                      <div className="econ-box">
                        <span className="label-caps">LTV / CAC</span>
                        <span className="econ-val">
                          {econ.roi !== null ? `${econ.roi}×` : "—"}
                        </span>
                      </div>

                      <div className="econ-box">
                        <span className="label-caps">SKU productivity</span>
                        <span className="econ-val">
                          ₹{econ.skuProductivity.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* EXTRA DIV: WHATSAPP DIRECT PORTAL ACCESS NOTIFICATION */}
                    <div className="crm-whatsapp-portal-card">
                      <div className="whatsapp-card-badge-row">
                        <span className="whatsapp-pill">
                          <WhatsAppIcon size={13} /> VENDOR LOGIN LINK
                        </span>
                        <span className="whatsapp-status-tag">
                          {designer.phone || designer.contact ? "WhatsApp Ready" : "Contact On File"}
                        </span>
                      </div>

                      <div className="whatsapp-card-content">
                        <div className="whatsapp-card-info">
                          <h4 className="whatsapp-designer-title">
                            {designer.brand_name || designer.designer_name} Company Access
                          </h4>
                          <p className="whatsapp-designer-desc">
                            Company details confirmed: <strong>{COMPANY_GST_INFO.name}</strong> · GST: <strong>{maskGstNumber(designer.gst_number || designer.gst || COMPANY_GST_INFO.gstNumber)}</strong> · City: <strong>{designer.city || "Corporate Hub"}</strong>
                          </p>
                          <span className="whatsapp-phone-hint">
                            📱 Registered contact: <strong>{designer.phone || designer.contact || designer.email || "No phone added"}</strong>
                          </span>
                        </div>

                        <button
                          type="button"
                          className="btn-send-whatsapp-portal"
                          onClick={() => handleSendWhatsAppPortalLink(designer)}
                          title="Prepare a WhatsApp message with the vendor login link"
                        >
                          <WhatsAppIcon size={16} />
                          <span>Share Login on WhatsApp</span>
                        </button>
                        <button type="button" className="btn-secondary" onClick={handleCopyVendorLoginLink}>Copy vendor login link</button>
                      </div>
                    </div>

                    {/* Bottom Row: Follow-Up Tasks (Left) & Controls (Right) */}
                    <div className="designer-bottom-grid">
                      {/* Left: Follow-up Tasks */}
                      <div className="crm-col-box">
                        <span className="label-caps">Follow-up tasks</span>
                        {tasks.length === 0 ? (
                          <p className="designer-subtext-line">Nothing scheduled.</p>
                        ) : (
                          <ul className="tasks-list">
                            {tasks.map((task) => {
                              const isDone = task.completed || task.done;
                              const isOverdue =
                                !isDone &&
                                task.due_date &&
                                task.due_date <
                                new Date().toISOString().split("T")[0];
                              return (
                                <li key={task.id} className="task-row-item">
                                  <input
                                    type="checkbox"
                                    checked={!!isDone}
                                    onChange={() =>
                                      handleToggleTask(designer.id, task.id)
                                    }
                                  />
                                  <span
                                    className={`task-title ${isDone ? "done" : ""
                                      }`}
                                  >
                                    {task.title || task.text}
                                  </span>
                                  {task.due_date && (
                                    <span className="task-due">
                                      due {task.due_date}
                                    </span>
                                  )}
                                  {isOverdue && (
                                    <span className="tone-badge bad">
                                      Overdue
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        {/* Add task inline */}
                        <div className="task-add-row">
                          <input
                            type="text"
                            className="task-input-text"
                            placeholder="New follow-up task"
                            value={currentInput.text || ""}
                            onChange={(e) =>
                              setTaskInputs((prev) => ({
                                ...prev,
                                [designer.id]: {
                                  ...prev[designer.id],
                                  text: e.target.value,
                                },
                              }))
                            }
                          />
                          <input
                            type="date"
                            className="task-input-date"
                            value={currentInput.due || ""}
                            onChange={(e) =>
                              setTaskInputs((prev) => ({
                                ...prev,
                                [designer.id]: {
                                  ...prev[designer.id],
                                  due: e.target.value,
                                },
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="btn-crm-action outline"
                            onClick={() => handleAddTask(designer.id)}
                          >
                            Add task
                          </button>
                        </div>
                      </div>

                      {/* Right: Sales Controls */}
                      <div className="crm-controls-grid">
                        <div className="crm-control-item">
                          <span className="label-caps">Sales admin</span>
                          <select
                            className="crm-select"
                            value={designer.sales_owner || "Nisha Kapoor"}
                            onChange={(e) =>
                              handleUpdateField(designer.id, {
                                sales_owner: e.target.value,
                              })
                            }
                          >
                            {allSalesOwners.map((owner) => (
                              <option key={owner} value={owner}>
                                {owner}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="crm-control-item">
                          <span className="label-caps">Given credits plan</span>
                          <select
                            className="crm-select"
                            value={designer.plan_type || ""}
                            onChange={(e) => {
                              handleUpdateField(designer.id, {
                                plan_type: e.target.value ? Number(e.target.value) : null,
                              });
                            }}
                          >
                            <option value="">No Plan</option>
                            {designer.plan_type && !vendorPlans.some((plan) => plan.id === designer.plan_type) && (
                              <option value={designer.plan_type}>{designer.plan_details?.name || "Current plan"} (Inactive)</option>
                            )}
                            {vendorPlans.map((plan) => (
                              <option key={plan.id} value={plan.id}>{plan.name} ({plan.credit_points.toLocaleString("en-IN")} Pts){plan.sku_limit != null ? ` — ${plan.sku_limit} SKUs` : ""}</option>
                            ))}
                          </select>
                        </div>

                        <div className="crm-control-item">
                          <span className="label-caps">Renewal likelihood</span>
                          <select
                            aria-label="Renewal likelihood"
                            className="crm-select"
                            value={[0, 100].includes(designer.renewal_likelihood) ? designer.renewal_likelihood : ""}
                            onChange={(e) =>
                              handleUpdateField(designer.id, {
                                renewal_likelihood: Number(e.target.value),
                              })
                            }
                          >
                            <option value="" disabled>Select Yes or No</option>
                            <option value="100">Yes</option>
                            <option value="0">No</option>
                          </select>
                        </div>

                        <div className="crm-control-item">
                          <span className="label-caps">Fulfillment</span>
                          <select
                            aria-label="Fulfillment"
                            className="crm-select"
                            value={designer.fulfillment || ""}
                            onChange={(e) => handleUpdateField(designer.id, { fulfillment: e.target.value })}
                          >
                            <option value="">Select fulfillment</option>
                            <option value="HUBSHIP">Hubship</option>
                            <option value="DROPSHIP">Dropship</option>
                            <option value="BOTH">Both</option>
                          </select>
                        </div>

                        <div className="crm-control-item full-width">
                          <span className="label-caps">Mark lost with a reason</span>
                          <select
                            className="crm-select"
                            value={designer.lost_reason || ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleUpdateField(designer.id, {
                                  lost_reason: e.target.value,
                                  stage: "REJECTED",
                                });
                              }
                            }}
                          >
                            <option value="">Select a lost reason</option>
                            {LOST_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. ADD A DESIGNER LEAD (15 Fields) */}
        <section className="crm-panel vendor-lead-panel">
          <div className="crm-panel-header">
            <div className="crm-panel-title-block">
              <h2 className="crm-panel-title">Add a vendor lead</h2>
              <p className="crm-panel-desc">
                Creates the vendor record used by every other layer.
              </p>
            </div>
          </div>



          <form onSubmit={handleCreateLead} className="lead-form-grid">
            <div className="lead-form-field">
              <label className="label-caps">Vendor name</label>
              <input
                type="text"
                className="lead-input"
                placeholder="e.g. Rohini Sharma"
                value={newLead.name}
                onChange={(e) =>
                  setNewLead({ ...newLead, name: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Brand</label>
              <input
                type="text"
                className="lead-input"
                placeholder="e.g. Velvet Canine"
                value={newLead.brand}
                onChange={(e) =>
                  setNewLead({ ...newLead, brand: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Email address</label>
              <input
                type="email"
                className="lead-input"
                placeholder="e.g. designer@brand.com"
                value={newLead.email}
                onChange={(e) =>
                  setNewLead({ ...newLead, email: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Mobile number</label>
              <input
                type="tel"
                className="lead-input"
                placeholder="e.g. 9876543210"
                value={newLead.phone}
                onChange={(e) =>
                  setNewLead({ ...newLead, phone: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Lead source</label>
              <select
                className="lead-select"
                value={newLead.source}
                onChange={(e) =>
                  setNewLead({ ...newLead, source: e.target.value })
                }
              >
                {allLeadSources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Sales admin</label>
              <select
                className="lead-select"
                value={newLead.owner}
                onChange={(e) =>
                  setNewLead({ ...newLead, owner: e.target.value })
                }
              >
                {allSalesOwners.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Next follow-up date</label>
              <input
                type="date"
                className="lead-input"
                value={newLead.nextFollowUp}
                onChange={(e) =>
                  setNewLead({ ...newLead, nextFollowUp: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">City</label>
              <input
                type="text"
                className="lead-input"
                value={newLead.city}
                onChange={(e) =>
                  setNewLead({ ...newLead, city: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Primary category</label>
              <input
                type="text"
                className="lead-input"
                value={newLead.category}
                onChange={(e) =>
                  setNewLead({ ...newLead, category: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Select plan</label>
              <select
                className="lead-select"
                value={newLead.selectedPlan || ""}
                onChange={(e) => {
                  const chosenPlanName = e.target.value;
                  const plan = CREDIT_PLANS.find(
                    (p) => p.name.toLowerCase() === chosenPlanName.toLowerCase()
                  );
                  if (plan) {
                    setNewLead({
                      ...newLead,
                      selectedPlan: plan.name,
                      tier: plan.tier,
                      fashionCreditPlan: plan.id,
                      creditPoints: plan.credit_points,
                    });
                  } else {
                    setNewLead({
                      ...newLead,
                      selectedPlan: "",
                      tier: "EMERGING",
                      fashionCreditPlan: "",
                      creditPoints: 0,
                    });
                  }
                }}
              >
                <option value="">Select plan...</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
              </select>
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Given credits (Points)</label>
              <input
                type="text"
                className="lead-input"
                readOnly
                placeholder="Triggered by selected plan"
                value={
                  newLead.creditPoints
                    ? `${Number(newLead.creditPoints).toLocaleString("en-IN")} Points`
                    : ""
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Rate Taken %</label>
              <input
                type="number"
                className="lead-input"
                min="1"
                max="100"
                value={newLead.takeRate}
                onChange={(e) =>
                  setNewLead({ ...newLead, takeRate: Number(e.target.value) })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps" htmlFor="lead-fulfillment">Fulfillment</label>
              <select
                id="lead-fulfillment"
                className="lead-select"
                value={newLead.fulfillment}
                onChange={(e) =>
                  setNewLead({ ...newLead, fulfillment: e.target.value })
                }
              >
                <option value="">Select fulfillment</option>
                <option value="HUBSHIP">Hubship</option>
                <option value="DROPSHIP">Dropship</option>
                <option value="BOTH">Both</option>
              </select>
            </div>

            <div className="lead-form-field">
              <label className="label-caps" htmlFor="lead-renewal">Renewal likelihood</label>
              <select
                id="lead-renewal"
                className="lead-select"
                value={newLead.renewalProbability}
                onChange={(e) =>
                  setNewLead({
                    ...newLead,
                    renewalProbability: e.target.value,
                  })
                }
              >
                <option value="100">Yes</option>
                <option value="0">No</option>
              </select>
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Contract end date</label>
              <input
                type="date"
                className="lead-input"
                value={newLead.contractEnds}
                onChange={(e) =>
                  setNewLead({ ...newLead, contractEnds: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field lead-form-field-gst">
              <div className="lead-field-header-row">
                <label className="label-caps">
                  GST number <span className="optional-tag">(Optional)</span>
                </label>
                {useCompanyGst && (
                  <span className="lead-company-gst-badge">
                    <span className="badge-dot"></span>{" "}
                    {newLead.gst === "COMPANY_GST_REQUESTED"
                      ? "Creation Requested (Company Side)"
                      : "Company GST Applied"}
                  </span>
                )}
              </div>
              <input
                type="text"
                className={`lead-input ${useCompanyGst ? "input-company-gst" : ""}`}
                placeholder="27AAAAA0000A1Z5 (or use company GST)"
                value={
                  newLead.gst === COMPANY_GST_INFO.gstNumber
                    ? maskGstNumber(newLead.gst)
                    : newLead.gst === "COMPANY_GST_REQUESTED"
                      ? "Creation Requested (Company creating GST)"
                      : newLead.gst
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setNewLead({ ...newLead, gst: val });
                  if (val.trim().toUpperCase() === COMPANY_GST_INFO.gstNumber) {
                    setUseCompanyGst(true);
                  } else if (val !== "COMPANY_GST_REQUESTED") {
                    setUseCompanyGst(false);
                  }
                }}
              />
              <div className="lead-gst-checkbox-row">
                <label className="lead-gst-checkbox-label">
                  <input
                    type="checkbox"
                    checked={useCompanyGst}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setGstModalTarget("newLead");
                        setShowGstModal(true);
                      } else {
                        setUseCompanyGst(false);
                        if (
                          newLead.gst.trim().toUpperCase() === COMPANY_GST_INFO.gstNumber ||
                          newLead.gst === "COMPANY_GST_REQUESTED"
                        ) {
                          setNewLead({ ...newLead, gst: "" });
                        }
                      }
                    }}
                  />
                  <span>Vendor doesn't have a GST number? (Use / Request Company GST)</span>
                </label>
                {useCompanyGst && (
                  <button
                    type="button"
                    className="lead-gst-change-btn"
                    onClick={() => {
                      setGstModalTarget("newLead");
                      setShowGstModal(true);
                    }}
                  >
                    Change / Request GST
                  </button>
                )}
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn-create-lead">
                Create lead
              </button>
            </div>
          </form >
        </section >
      </main >

      {/* COMPANY GST INFORMATION & CONFIRMATION MODAL */}
      {
        showGstModal && (
          <div className="gst-modal-overlay" onClick={handleCloseGstModal}>
            <div className="gst-modal" onClick={(e) => e.stopPropagation()}>
              <div className="gst-modal-header">
                <div className="gst-modal-icon-badge">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div className="gst-modal-title-wrap">
                  <span className="gst-modal-badge">PLATFORM TAX COMPLIANCE</span>
                  <h3 className="gst-modal-title">Company GST Coverage & Creation</h3>
                  <p className="gst-modal-desc">
                    Assign our master company GST number or request our company to create a new dedicated GST number for this vendor.
                  </p>
                </div>
                <button
                  type="button"
                  className="gst-modal-close-btn"
                  onClick={handleCloseGstModal}
                  aria-label="Close dialog"
                >
                  &times;
                </button>
              </div>

              <div className="gst-modal-body">
                {/* Option 1: Master Company GSTIN (Masked for Security) */}
                <div className="gst-company-card">
                  <div className="gst-company-row">
                    <span className="gst-field-label">Master Legal Entity</span>
                    <span className="gst-field-val strong">{COMPANY_GST_INFO.name}</span>
                  </div>
                  <div className="gst-company-row">
                    <span className="gst-field-label">Company GSTIN</span>
                    <span className="gst-field-val gst-code-val">
                      <code>{maskGstNumber(COMPANY_GST_INFO.gstNumber)}</code>
                      <span className="gst-active-pill">ACTIVE · VERIFIED</span>
                    </span>
                  </div>
                  <div className="gst-company-row">
                    <span className="gst-field-label">Security Mask</span>
                    <span className="gst-field-val" style={{ color: "#786d5e", fontSize: "12px" }}>
                      Protected for security (Only last 4 digits shown)
                    </span>
                  </div>
                  <div className="gst-company-row">
                    <span className="gst-field-label">Jurisdiction</span>
                    <span className="gst-field-val">{COMPANY_GST_INFO.state}</span>
                  </div>
                </div>

                {/* Option 2: Request Company-Side Creation for this Designer */}
                <div className="gst-request-box">
                  <div className="gst-request-box-header">
                    <span className="gst-request-badge">CREATE NEW GST</span>
                    <h4 className="gst-request-title">Request Company to Create New GST for Vendor</h4>
                  </div>
                  <p className="gst-request-desc">
                    Does this vendor need their own dedicated company-developed GST number? Submit a request and our company tax team will register a new compliant GSTIN for this vendor.
                  </p>
                  <button
                    type="button"
                    className="btn-request-company-gst"
                    onClick={handleRequestCompanyGstCreation}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Request Company to Create New GST for This Vendor
                  </button>
                </div>

                {/* Confirmation Question */}
                <div className="gst-confirm-box">
                  <p className="gst-confirm-question">
                    Or apply our existing company master GST (<strong>{maskGstNumber(COMPANY_GST_INFO.gstNumber)}</strong>) for{" "}
                    <strong>
                      {gstModalTarget === "newLead"
                        ? newLead.brand || newLead.name || "this new vendor lead"
                        : gstModalTarget?.brand_name ||
                        gstModalTarget?.designer_name ||
                        "this vendor"}
                    </strong> immediately?
                  </p>
                </div>
              </div>

              {/* Modal Actions: Apply Existing / Request New / Cancel */}
              <div className="gst-modal-actions">
                <button
                  type="button"
                  className="btn-modal-yes"
                  onClick={handleConfirmCompanyGst}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Yes, Use Company GST ({COMPANY_GST_INFO.gstNumber.slice(-4)})
                </button>
                <button
                  type="button"
                  className="btn-modal-request"
                  onClick={handleRequestCompanyGstCreation}
                >
                  + Request New Company GST
                </button>
                <button
                  type="button"
                  className="btn-modal-no"
                  onClick={handleCloseGstModal}
                >
                  No, Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
