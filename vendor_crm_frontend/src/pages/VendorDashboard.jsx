import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { MediaWorkspace } from "./MediaStudio";
import { showToast, showErrorToast } from "../utils/zenveToast";
import "../styles/VendorPortal.css";
import SearchBar from "../components/SearchBar";

import {
  getDesigners,
  getDesignerPortalDashboard,
  markDesignerNotificationsRead,
  createProduct,
  updateDesigner,
  getDesignerAccountDetails,
  saveDesignerAccountDetails,
  getDesignerCredits,
} from "../services/api";

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

function ArrowDownIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 9L12 15L18 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditPencilIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 4-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function UserProfileIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function EyeIcon({ off }) {
  if (off) {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* =========================================================
   BANK IFSC MAP
========================================================= */

const BANK_IFSC_MAP = {
  HDFC: "HDFC Bank",
  SBIN: "State Bank of India",
  ICIC: "ICICI Bank",
  UTIB: "Axis Bank",
  KKBK: "Kotak Mahindra Bank",
  BARB: "Bank of Baroda",
  PUNB: "Punjab National Bank",
  CNRB: "Canara Bank",
  UBIN: "Union Bank of India",
  IDIB: "Indian Bank",
  YESB: "Yes Bank",
  INDB: "IndusInd Bank",
  FDRL: "Federal Bank",
  IDFB: "IDFC First Bank",
};

function getBankNameFromIfsc(ifsc) {
  if (!ifsc || ifsc.length < 4) return "";

  const prefix = ifsc.substring(0, 4).toUpperCase();

  return BANK_IFSC_MAP[prefix] || "Verified Bank";
}

/* =========================================================
   SWITCH
========================================================= */

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`ZENVE-switch ${checked ? "checked" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="ZENVE-switch-thumb" />
    </button>
  );
}

/* =========================================================
   HELPERS
========================================================= */

const formatInr = (val) => {
  const num = Number(val) || 0;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
};

const cleanCode = (str, len = 3) => {
  return (
    (str || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, len) || "XXX"
  );
};

const getDesignerInitials = (name, brand) => {
  const target = (brand || name || "DP").trim();
  const parts = target.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* =========================================================
   EMPTY ACCOUNT FORM
========================================================= */

const EMPTY_ACCOUNT_FORM = {
  accountHolderName: "",
  accountNumber: "",
  ifscCode: "",
  panNumber: "",
};

/* =========================================================
   API RESPONSE HELPERS
   Supports both direct JSON responses and axios-style
   { data: ... } responses without changing the API service.
========================================================= */

const unwrapApiResponse = (response) => {
  if (response && Object.prototype.hasOwnProperty.call(response, "data")) {
    return response.data;
  }
  return response;
};

const getListFromResponse = (response) => {
  const data = unwrapApiResponse(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.designers)) return data.designers;
  return [];
};

const getErrorMessage = (error, fallback) => {
  const responseData = error?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (responseData?.detail) return String(responseData.detail);
  if (responseData?.message) return String(responseData.message);

  if (responseData && typeof responseData === "object") {
    const firstError = Object.values(responseData).flat?.()[0];
    if (firstError) return String(firstError);
  }

  return error?.message || fallback;
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function VendorDashboard() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const isVendor = currentUser?.id === "designer";
  /* =======================================================
     DESIGNER SELECTION
  ======================================================= */

  const [designers, setDesigners] = useState([]);
  const [selectedDesignerId, setSelectedDesignerId] = useState(() => {
    if (isVendor) return currentUser?.vendorId ? String(currentUser.vendorId) : "";
    try {
      return localStorage.getItem("zippy_selected_vendor_id") || "";
    } catch {
      return "";
    }
  });
  const [loadingDesigners, setLoadingDesigners] = useState(true);

  /* =======================================================
     PORTAL DASHBOARD
  ======================================================= */

  const [portalData, setPortalData] = useState(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalError, setPortalError] = useState("");

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  const searchParams = new URLSearchParams(location.search);
  const initialView = searchParams.get("view");

  const [notifSidebarOpen, setNotifSidebarOpen] = useState(initialView === "notifications");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && notifSidebarOpen) {
        setNotifSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [notifSidebarOpen]);

  useEffect(() => {
    if (notifSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [notifSidebarOpen]);

  /* =======================================================
     ALERT
  ======================================================= */

  const [alertMessage, setAlertMessage] = useState(null);

  useEffect(() => {
    if (alertMessage) {
      showToast(alertMessage);
    }
  }, [alertMessage]);

  useEffect(() => {
    if (portalError) {
      showErrorToast(portalError);
    }
  }, [portalError]);

  /* =======================================================
     SKU FORM
  ======================================================= */
  const PRODUCT_SIZES = [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "FREE",
  ];

  const createEmptySizeStocks = () => ({
    XS: { online_quantity: "" },
    S: { online_quantity: "" },
    M: { online_quantity: "" },
    L: { online_quantity: "" },
    XL: { online_quantity: "" },
    XXL: { online_quantity: "" },
    FREE: { online_quantity: "" },
  });

  const [form, setForm] = useState({
    name: "",
    category: "",
    subcategory: "",
    colour: "",

    mrp: "",
    price: "",
    fabric: "",

    petSafety:
      "No loose beads. Breathable fabric. Supervised wear recommended.",


    fastDelivery: true,
    returnable: true,

    // Growth Add-ons (Charged in credit points)
    growthVideoShoot: false,
    growthSocialPromotion: false,

    // NEW
    selectedSizes: [],

    // NEW

    // NEW
    sizeStocks: createEmptySizeStocks(),
  });
  const isClothing = form.category === "Pet Fashion" && ["Clothes", "Dress"].includes(form.subcategory);
  const stockSizes = isClothing ? form.selectedSizes : ["FREE"];
  const changeCategory = (category) => setForm((prev) => ({
    ...prev, category, subcategory: "", colour: "", selectedSizes: [],
    sizeStocks: createEmptySizeStocks(),
  }));
  const toggleProductSize = (size) => {
    setForm((prev) => {
      const alreadySelected =
        prev.selectedSizes.includes(size);

      return {
        ...prev,

        selectedSizes: alreadySelected
          ? prev.selectedSizes.filter(
            (item) => item !== size
          )
          : [...prev.selectedSizes, size],
      };
    });
  };


  const handleSizeQuantityChange = (
    size,
    field,
    value
  ) => {
    const cleanValue = String(value).replace(
      /[^0-9]/g,
      ""
    );

    setForm((prev) => ({
      ...prev,

      sizeStocks: {
        ...prev.sizeStocks,

        [size]: {
          ...prev.sizeStocks[size],
          [field]: cleanValue,
        },
      },
    }));
  };


  const selectedSizeStocks = useMemo(() => {
    return (isClothing ? form.selectedSizes : ["FREE"]).map((size) => ({
      size,

      online_quantity:
        Number(
          form.sizeStocks[size]?.online_quantity
        ) || 0,

      offline_quantity: 0,
    }));
  }, [
    isClothing,
    form.selectedSizes,
    form.sizeStocks,
  ]);


  const totalOnlineQuantity = useMemo(() => {
    return selectedSizeStocks.reduce(
      (total, item) =>
        total + item.online_quantity,
      0
    );
  }, [selectedSizeStocks]);


  const totalInventoryQuantity = totalOnlineQuantity;
  const [submittingSku, setSubmittingSku] = useState(false);
  const [pendingProducts, setPendingProducts] = useState([]);
  const submittingProductsRef = useRef(false);
  const vendorPendingProducts = pendingProducts.filter(
    (item) => item.vendorId === String(selectedDesignerId)
  );
  useEffect(() => {
    if (!pendingProducts.length) return;
    const warnBeforeLeaving = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [pendingProducts.length]);

  /* =======================================================
     PRODUCT IMAGES
  ======================================================= */

  const MAX_PRODUCT_IMAGES = 4;

  const [productImages, setProductImages] = useState([]);
  const [imageWarningOpen, setImageWarningOpen] = useState(false);
  const [imageWarningText, setImageWarningText] = useState("");

  const handleProductImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    e.target.value = "";

    if (selectedFiles.length === 0) return;

    const availableSlots =
      MAX_PRODUCT_IMAGES - productImages.length;

    if (availableSlots <= 0) {
      setImageWarningText(
        "You can upload a maximum of 4 product images. Remove an image before adding another."
      );
      setImageWarningOpen(true);
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) => !file.type || !file.type.startsWith("image/")
    );

    if (invalidFile) {
      setImageWarningText("Please select image files only.");
      setImageWarningOpen(true);
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > 5 * 1024 * 1024
    );

    if (oversizedFile) {
      setImageWarningText(
        `"${oversizedFile.name}" is larger than 5 MB. Please choose a smaller image.`
      );
      setImageWarningOpen(true);
      return;
    }

    if (selectedFiles.length > availableSlots) {
      setImageWarningText(
        `Only ${availableSlots} more image${availableSlots === 1 ? "" : "s"
        } can be selected. A product requires 1 to 4 images.`
      );
      setImageWarningOpen(true);
    }

    const filesToAdd = selectedFiles.slice(0, availableSlots);

    setProductImages((prev) => [...prev, ...filesToAdd]);
  };

  const removeProductImage = (indexToRemove) => {
    setProductImages((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  /* =======================================================
     PROFILE
  ======================================================= */

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [profileForm, setProfileForm] = useState({
    brand: "",
    name: "",
    contact: "",
    city: "",
    gst: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [profileImageError, setProfileImageError] = useState(false);
  const profileFileInputRef = useRef(null);

  /* =======================================================
     ACCOUNT DETAILS
     IMPORTANT:
     NO LOCAL STORAGE
     NO MOCK DATA
  ======================================================= */

  const [isEditingAccount, setIsEditingAccount] = useState(false);

  const [accountForm, setAccountForm] = useState(
    EMPTY_ACCOUNT_FORM
  );

  const [savedAccountForm, setSavedAccountForm] = useState(
    EMPTY_ACCOUNT_FORM
  );

  const [savingAccount, setSavingAccount] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [hasAccountDetails, setHasAccountDetails] = useState(false);
  const [isAccountMasked, setIsAccountMasked] = useState(true);

  /* =======================================================
     PROFILE / ACCOUNT VIEW
  ======================================================= */

  const [profileAndAccountOpen, setShowProfileAndAccount] =
    useState(initialView === "profile" || initialView === "profile-account");
  const showProfileAndAccount = isVendor && profileAndAccountOpen;
  const [mediaContentOpen, setMediaContentOpen] = useState(initialView === "media");
  const showMediaContent = isVendor && mediaContentOpen;

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const view = searchParams.get("view");
    if (view === "profile" || view === "profile-account") {
      setShowProfileAndAccount(true);
      setMediaContentOpen(false);
      setNotifSidebarOpen(false);
    } else if (view === "media") {
      setShowProfileAndAccount(false);
      setMediaContentOpen(true);
      setNotifSidebarOpen(false);
    } else if (view === "notifications") {
      setShowProfileAndAccount(false);
      setMediaContentOpen(false);
      setNotifSidebarOpen(true);
    }
  }, [location.search]);

  /* =======================================================
     CREDIT POINTS STATE
  ======================================================= */

  const [creditsOverride, setCreditsOverride] = useState(null);
  /* =======================================================
     LOAD DESIGNERS
  ======================================================= */

  const fetchDesigners = async () => {
    try {
      setLoadingDesigners(true);

      const response = await getDesigners();
      const allVendors = getListFromResponse(response);
      const list = currentUser?.vendorId ? allVendors.filter(v => String(v.id) === String(currentUser.vendorId)) : allVendors;

      setDesigners(list);

      if (list.length > 0) {
        setSelectedDesignerId((prev) => {
          let saved = "";
          try {
            saved = localStorage.getItem("zippy_selected_vendor_id") || "";
          } catch {
            saved = "";
          }
          const candidate = prev || saved;
          const exists = list.some(
            (d) => String(d.id) === String(candidate)
          );

          const chosen = exists ? String(candidate) : String(list[0].id);
          try {
            localStorage.setItem("zippy_selected_vendor_id", chosen);
          } catch {
            // ignore
          }
          return chosen;
        });
      }
    } catch (err) {
      console.error("Failed to load vendors:", err);

      setPortalError(
        getErrorMessage(
          err,
          "Unable to fetch vendors list from backend."
        )
      );
    } finally {
      setLoadingDesigners(false);
    }
  };

  useEffect(() => {
    fetchDesigners();
  }, []);

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  const loadDashboard = async (designerId) => {
    if (!designerId) {
      setPortalData(null);
      setCreditsOverride(null);
      return;
    }

    try {
      setLoadingPortal(true);
      setPortalError("");
      setCreditsOverride(null);

      const response =
        await getDesignerPortalDashboard(designerId);

      const data = unwrapApiResponse(response);
      setPortalData(data || null);

      if (!data?.credits) {
        try {
          const credRes = await getDesignerCredits(designerId);
          const credData = unwrapApiResponse(credRes);
          if (credData) {
            setCreditsOverride(credData);
          }
        } catch (credErr) {
          console.warn("Direct credits fallback fetch failed:", credErr);
        }
      }

      if (data?.account_details) {
        const acc = data.account_details;
        const normalized = {
          accountHolderName: acc.account_holder_name || "",
          accountNumber: acc.account_number || "",
          ifscCode: acc.ifsc_code || "",
          panNumber: acc.pan_number || "",
        };
        setAccountForm(normalized);
        setSavedAccountForm(normalized);
        const hasCriticalDetails = Boolean(normalized.accountNumber || normalized.ifscCode);
        setHasAccountDetails(hasCriticalDetails);
        setIsAccountMasked(true);
      }
    } catch (err) {
      console.error(
        "Failed to fetch portal dashboard:",
        err
      );

      setPortalError(
        getErrorMessage(
          err,
          "Could not retrieve portal dashboard metrics."
        )
      );
    } finally {
      setLoadingPortal(false);
    }
  };

  useEffect(() => {
    if (selectedDesignerId) {
      loadDashboard(selectedDesignerId);
    }
  }, [selectedDesignerId]);

  /* =======================================================
     ACTIVE DESIGNER
  ======================================================= */

  const activeDesigner =
    portalData?.designer ||
    portalData?.designer_details ||
    null;

  useEffect(() => {
    setProfileImageError(false);
  }, [selectedDesignerId, activeDesigner?.profile_image]);

  const kpis = portalData?.kpis || {};
  const pendingActions =
    portalData?.pendingActions || [];
  const notifications =
    portalData?.notifications || [];
  const unreadNotifications =
    notifications.filter((n) => !n.read).length;
  const skus = portalData?.skus || [];
  const orders = portalData?.orders || [];
  const settlements =
    portalData?.settlements || [];

  /* =======================================================
     CREDIT POINTS DATA & ACTIONS
  ======================================================= */

  const formatPoints = (val) => {
    if (val === undefined || val === null || isNaN(val)) return "0";
    return Number(val).toLocaleString("en-IN");
  };

  const creditsData = creditsOverride || portalData?.credits || null;

  const creditWallet = creditsData?.wallet || {
    online_credits: activeDesigner?.credit_points || 0,
    points_used: 0,
    total_balance: activeDesigner?.credit_points || 0,
    online_plan: activeDesigner?.online_membership_plan
      ? activeDesigner.online_membership_plan.charAt(0).toUpperCase() +
      activeDesigner.online_membership_plan.slice(1).toLowerCase()
      : "—",
    online_listings_left: activeDesigner?.credit_points
      ? Math.floor(activeDesigner.credit_points / 500)
      : 0,
    points_used_subtitle: "0 points used",
  };

  const activeSkusCount = skus.filter(
    (s) => s.is_live || s.status === "LIVE" || s.status === "APPROVED"
  ).length;
  const storeSkusCount = skus.filter((s) =>
    (s.fulfilment_location || "").toUpperCase().includes("STORE")
  ).length;

  const dailyBurn = creditsData?.daily_burn || {
    online_count: activeSkusCount,
    online_pts_each: 3,
    online_subtotal: activeSkusCount * 3,
    store_count: storeSkusCount,
    store_pts_each: 5,
    store_subtotal: storeSkusCount * 5,
    total_burn_per_day: activeSkusCount * 3 + storeSkusCount * 5,
    rates_text:
      "Catalogue listing 500 pts · Exclusive video & photo shoot 5,000 pts · Exclusive social media promotion 5,000 pts",
  };

  const creditStatements = creditsData?.statements || [];

  /* =======================================================
     SKU PREVIEW
  ======================================================= */

  const skuPreview = useMemo(() => {
    if (!activeDesigner || !form.name.trim()) {
      return "—";
    }

    const brandCode = cleanCode(
      activeDesigner.brand,
      3
    );

    const catCode = cleanCode(
      form.category,
      3
    );

    const nameCode = cleanCode(
      form.name,
      6
    );

    const colCode = cleanCode(
      form.colour,
      5
    );

    const sizeCode = cleanCode(
      form.selectedSizes.length
        ? form.selectedSizes.join("-")
        : "SIZE",
      12
    );

    return `ZNV-${brandCode}-${catCode}-${nameCode}-${colCode}-${sizeCode}`;
  }, [activeDesigner, form]);

  /* =======================================================
     LOAD ACCOUNT DETAILS FROM DJANGO
  ======================================================= */

  const canManageAccount = Boolean(
    portalData?.can_manage_account &&
    String(portalData?.vendor?.id) === String(selectedDesignerId)
  );

  const loadAccountDetails = async (designerId) => {
    if (!designerId || !canManageAccount) {
      setAccountForm(EMPTY_ACCOUNT_FORM);
      setSavedAccountForm(EMPTY_ACCOUNT_FORM);
      setHasAccountDetails(false);
      setLoadingAccount(false);
      return;
    }

    try {
      setLoadingAccount(true);

      const response =
        await getDesignerAccountDetails(designerId);

      const rawPayload = response;
      const unwrappedPayload = unwrapApiResponse(response);

      let record = null;
      let accountExists = false;

      if (rawPayload && rawPayload.exists !== undefined) {
        accountExists = Boolean(rawPayload.exists && rawPayload.data);
        record = rawPayload.data;
      } else if (unwrappedPayload && unwrappedPayload.exists !== undefined) {
        accountExists = Boolean(unwrappedPayload.exists && unwrappedPayload.data);
        record = unwrappedPayload.data;
      } else if (
        unwrappedPayload &&
        (unwrappedPayload.account_number ||
          unwrappedPayload.account_holder_name ||
          unwrappedPayload.ifsc_code)
      ) {
        accountExists = true;
        record = unwrappedPayload;
      }

      if (accountExists && record) {
        const normalizedAccount = {
          accountHolderName:
            record.account_holder_name || "",

          accountNumber:
            record.account_number || "",

          ifscCode:
            record.ifsc_code || "",

          panNumber:
            record.pan_number || "",
        };

        setAccountForm(normalizedAccount);
        setSavedAccountForm(normalizedAccount);
        
        const hasCriticalDetails = Boolean(normalizedAccount.accountNumber || normalizedAccount.ifscCode);
        setHasAccountDetails(hasCriticalDetails);
        setIsAccountMasked(true);
      } else {
        setAccountForm(EMPTY_ACCOUNT_FORM);
        setSavedAccountForm(EMPTY_ACCOUNT_FORM);
        setHasAccountDetails(false);
        setIsAccountMasked(true);
      }
    } catch (err) {
      console.error(
        "Failed to load account details:",
        err
      );

      setAccountForm(EMPTY_ACCOUNT_FORM);
      setSavedAccountForm(EMPTY_ACCOUNT_FORM);
      setHasAccountDetails(false);
      setIsAccountMasked(true);
    } finally {
      setLoadingAccount(false);
    }
  };

  useEffect(() => {
    // Only reset state if the selected designer changes
    setAccountForm(EMPTY_ACCOUNT_FORM);
    setSavedAccountForm(EMPTY_ACCOUNT_FORM);
    setHasAccountDetails(false);
    setIsEditingAccount(false);
    if (selectedDesignerId && canManageAccount) {
      loadAccountDetails(selectedDesignerId);
    }
  }, [selectedDesignerId, canManageAccount]);

  /* =======================================================
     SKU SUBMIT
  ======================================================= */

  const handleSkuSubmit = async (e) => {
    e.preventDefault();
    if (submittingProductsRef.current) return;

    if (!activeDesigner || !activeDesigner.id) {
      setAlertMessage({
        type: "error",
        text: "Please select a valid vendor first.",
      });
      return;
    }

    const allowedStages = [
      "SIGNED",
      "LIVE",
      "ACTIVE",
      "CONTRACT",
    ];

    if (
      !allowedStages.includes(
        String(activeDesigner.stage || "").toUpperCase()
      )
    ) {
      setAlertMessage({
        type: "error",
        text:
          "Vendor must reach CONTRACT stage in the CRM before uploading SKUs.",
      });
      return;
    }

    if (!form.name.trim()) {
      setAlertMessage({
        type: "error",
        text: "Product name is required.",
      });
      return;
    }

    if (!form.category.trim()) {
      setAlertMessage({
        type: "error",
        text: "Category is required.",
      });
      return;
    }

    if (isClothing && !form.colour.trim()) {
      setAlertMessage({
        type: "error",
        text: "Colour is required.",
      });
      return;
    }

    if (form.category === "Pet Fashion" && !form.subcategory) {
      setAlertMessage({ type: "error", text: "Choose Clothes or Dress." });
      return;
    }
    const numMrp = Number(form.mrp);
    const numPrice = Number(form.price);

    if (isClothing && form.selectedSizes.length === 0) {
      setAlertMessage({
        type: "error",
        text: "Please select at least one product size.",
      });

      return;
    }


    const missingOnlineQuantity =
      stockSizes.find(
        (size) =>
          form.sizeStocks[size]?.online_quantity === ""
      );

    if (missingOnlineQuantity) {
      setAlertMessage({
        type: "error",
        text: `Please enter online quantity for size ${missingOnlineQuantity}.`,
      });

      return;
    }


    if (totalInventoryQuantity <= 0) {
      setAlertMessage({
        type: "error",
        text: "Product total quantity must be greater than 0.",
      });

      return;
    }

    if (!Number.isFinite(numMrp) || numMrp <= 0) {
      setAlertMessage({
        type: "error",
        text: "Please enter a valid MRP.",
      });
      return;
    }

    if (!Number.isFinite(numPrice) || numPrice <= 0) {
      setAlertMessage({
        type: "error",
        text: "Please enter a valid selling price.",
      });
      return;
    }

    if (numPrice > numMrp) {
      setAlertMessage({
        type: "error",
        text:
          "Selling price must not be greater than MRP.",
      });
      return;
    }

    if (
      productImages.length < 1 || productImages.length > MAX_PRODUCT_IMAGES
    ) {
      setImageWarningText(
        `Please select 1 to ${MAX_PRODUCT_IMAGES} product images. You currently selected ${productImages.length}.`
      );

      setImageWarningOpen(true);
      return;
    }

    const fulfilmentLocation = "MUMBAI_FC";

    const payload = new FormData();

    payload.append(
      "product_name",
      form.name.trim()
    );

    payload.append("sku", skuPreview);
    payload.append(
      "designer",
      String(activeDesigner.id)
    );

    payload.append(
      "category",
      form.category.trim()
    );

    payload.append(
      "colour",
      isClothing ? form.colour.trim() : "N/A"
    );
    payload.append("subcategory", form.subcategory);
    // Backward compatibility for your existing Django size field
    payload.append(
      "size",
      stockSizes[0] || "FREE"
    );





    // Multiple selected sizes
    payload.append(
      "sizes",
      JSON.stringify(stockSizes)
    );


    // Quantity for every size
    payload.append(
      "size_stocks",
      JSON.stringify(selectedSizeStocks)
    );


    // Total online stock
    payload.append(
      "online_quantity",
      String(totalOnlineQuantity)
    );


    // Total offline stock
    payload.append(
      "offline_quantity",
      "0"
    );

    payload.append(
      "mrp",
      numMrp.toFixed(2)
    );

    payload.append(
      "selling_price",
      numPrice.toFixed(2)
    );

    payload.append(
      "material",
      form.fabric.trim()
    );

    payload.append(
      "pet_safety",
      form.petSafety.trim()
    );

    payload.append(
      "fulfilment_location",
      fulfilmentLocation
    );

    payload.append(
      "fast_delivery",
      form.fastDelivery ? "true" : "false"
    );

    payload.append(
      "return_policy",
      form.returnable
        ? "RETURNABLE"
        : "FINAL_SALE"
    );

    // Growth Add-ons
    payload.append(
      "growth_video_shoot",
      form.growthVideoShoot ? "true" : "false"
    );
    payload.append(
      "growth_social_promotion",
      form.growthSocialPromotion ? "true" : "false"
    );
    payload.append("sales_channel", "ONLINE");
    payload.append("push_to_store", "ONLINE_ONLY");

    payload.append(
      "status",
      "PENDING_QA"
    );

    payload.append(
      "inventory_quantity",
      String(totalInventoryQuantity)
    );

    payload.append(
      "reserved_quantity",
      "0"
    );

    payload.append(
      "damaged_quantity",
      "0"
    );

    payload.append(
      "quarantined_quantity",
      "0"
    );

    payload.append(
      "in_transit_quantity",
      "0"
    );

    payload.append(
      "returned_quantity",
      "0"
    );

    payload.append(
      "low_stock_threshold",
      "5"
    );

    payload.append(
      "gst_rate",
      "12.00"
    );

    payload.append(
      "weight_g",
      "250"
    );

    payload.append(
      "dimensions",
      "25x20x3 cm"
    );

    payload.append(
      "origin",
      "India"
    );

    payload.append(
      "manufacturer",
      "Crafted in India"
    );

    payload.append(
      "care",
      "Dry clean only or gentle hand wash."
    );

    payload.append(
      "collection",
      "Diwali Luxe"
    );

    payload.append(
      "occasion",
      "Festive"
    );

    payload.append(
      "season",
      "AW 2026"
    );

    payload.append(
      "new_arrival",
      "true"
    );

    payload.append(
      "bestseller",
      "false"
    );

    payload.append(
      "featured",
      "false"
    );

    payload.append(
      "limited_edition",
      "false"
    );

    payload.append(
      "is_active",
      "true"
    );

    payload.append(
      "is_live",
      "false"
    );

    payload.append(
      "discount_percentage",
      (
        ((numMrp - numPrice) / numMrp) *
        100
      ).toFixed(2)
    );

    productImages.forEach((file) => {
      payload.append(
        "images",
        file,
        file.name
      );
    });

    if (import.meta.env.DEV) {
      console.group(
        "ZENVE Product FormData"
      );

      for (const [
        key,
        value,
      ] of payload.entries()) {
        console.log(
          key,
          value instanceof File
            ? `${value.name} (${value.type}, ${value.size} bytes)`
            : value
        );
      }

      console.groupEnd();
    }

    if (pendingProducts.some((item) => item.sku === skuPreview)) {
      setAlertMessage({ type: "error", text: "This SKU is already in your product list. Remove it before adding a replacement." });
      return;
    }
    setPendingProducts((items) => [...items, {
      sku: skuPreview,
      vendorId: String(activeDesigner.id),
      name: form.name.trim(),
      quantity: totalInventoryQuantity,
      price: numPrice,
      imageCount: productImages.length,
      payload,
    }]);

      setAlertMessage({
        type: "success",
        text: `${form.name.trim()} added. Add more products or submit your list below.`,
      });

      setForm((prev) => ({
        ...prev,

        name: "",
        colour: "",
        mrp: "",
        price: "",
        fabric: "",

        growthVideoShoot: false,
        growthSocialPromotion: false,

        selectedSizes: [],
        sizeStocks: createEmptySizeStocks(),
      }));

      setProductImages([]);
  };

  const handleSubmitAllProducts = async () => {
    if (submittingProductsRef.current || !vendorPendingProducts.length) return;
    submittingProductsRef.current = true;
    setSubmittingSku(true);
    let submitted = 0;
    try {
      for (const item of vendorPendingProducts) {
        await createProduct(item.payload);
        submitted += 1;
        setPendingProducts((items) => items.filter((pending) => pending !== item));
      }
      setAlertMessage({ type: "success", text: `${submitted} product(s) submitted to Catalogue QA.` });
    } catch (err) {
      setAlertMessage({
        type: "error",
        text: `${submitted} product(s) submitted. Remaining products are kept for retry. ${getErrorMessage(err, "Could not submit products.")}`,
      });
    } finally {
      try {
        if (submitted) await loadDashboard(selectedDesignerId);
      } finally {
        submittingProductsRef.current = false;
        setSubmittingSku(false);
      }
    }
  };

  /* =======================================================
     MARK NOTIFICATIONS READ
  ======================================================= */

  const handleMarkNotificationsRead =
    async () => {
      if (!selectedDesignerId) return;

      try {
        await markDesignerNotificationsRead(
          selectedDesignerId
        );

        setPortalData((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            notifications: (
              prev.notifications || []
            ).map((n) => ({
              ...n,
              read: true,
            })),
          };
        });

        setAlertMessage({
          type: "success",
          text: "Notifications marked as read.",
        });
      } catch (err) {
        console.error(
          "Mark notifications read error:",
          err
        );
      }
    };

  /* =======================================================
     PROFILE HANDLERS
  ======================================================= */

  const handleStartEditProfile = () => {
    if (!activeDesigner) return;

    setProfileForm({
      brand:
        activeDesigner.brand ||
        activeDesigner.brand_name ||
        "",
      name:
        activeDesigner.name ||
        activeDesigner.owner_name ||
        activeDesigner.designer_name ||
        "",
      contact:
        activeDesigner.contact ||
        activeDesigner.email ||
        activeDesigner.phone ||
        "",
      city: activeDesigner.city || "",
      gst:
        activeDesigner.gst ||
        activeDesigner.gst_number ||
        "",
    });

    setProfileImage(null);
    setProfileImagePreview(
      activeDesigner.profile_image || ""
    );
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    if (
      profileImagePreview &&
      profileImagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(profileImagePreview);
    }

    setProfileImage(null);
    setProfileImagePreview("");
    setProfileImageError(false);
    setIsEditingProfile(false);
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    if (
      !file.type ||
      !file.type.startsWith("image/")
    ) {
      setAlertMessage({
        type: "error",
        text: "Please select a valid image file.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAlertMessage({
        type: "error",
        text: "Profile image must be 5 MB or smaller.",
      });
      return;
    }

    if (
      profileImagePreview &&
      profileImagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(profileImagePreview);
    }

    setProfileImage(file);
    setProfileImagePreview(
      URL.createObjectURL(file)
    );
    setProfileImageError(false);
  };

  const handleSaveProfile = async () => {
    if (!activeDesigner || !selectedDesignerId) {
      return;
    }

    if (
      !profileForm.brand.trim() ||
      !profileForm.name.trim()
    ) {
      setAlertMessage({
        type: "error",
        text:
          "Brand name and Owner name cannot be empty.",
      });
      return;
    }

    try {
      setSavingProfile(true);

      const contact =
        profileForm.contact.trim();
      const isEmail = contact.includes("@");

      const payload = new FormData();

      payload.append(
        "brand_name",
        profileForm.brand.trim()
      );
      payload.append(
        "vendor_name",
        profileForm.name.trim()
      );
      payload.append(
        "owner_name",
        profileForm.name.trim()
      );
      payload.append(
        "city",
        profileForm.city.trim()
      );

      if (isEmail) {
        payload.append("email", contact);
        payload.append(
          "phone",
          activeDesigner.phone || ""
        );
      } else {
        payload.append(
          "email",
          activeDesigner.email || ""
        );
        payload.append("phone", contact);
      }

      payload.append(
        "gst_number",
        profileForm.gst.trim().toUpperCase()
      );

      if (profileImage) {
        payload.append(
          "profile_image",
          profileImage,
          profileImage.name
        );
      }

      await updateDesigner(
        selectedDesignerId,
        payload
      );

      if (
        profileImagePreview &&
        profileImagePreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          profileImagePreview
        );
      }

      setProfileImage(null);
      setProfileImagePreview("");

      await loadDashboard(
        selectedDesignerId
      );
      await fetchDesigners();

      setIsEditingProfile(false);

      setAlertMessage({
        type: "success",
        text:
          "Profile details updated successfully.",
      });
    } catch (err) {
      console.error(
        "Failed to update profile:",
        err
      );

      setAlertMessage({
        type: "error",
        text: getErrorMessage(
          err,
          "Failed to update profile."
        ),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  /* =======================================================
     ACCOUNT HANDLERS
  ======================================================= */

  const handleStartEditAccount = () => {
    if (!activeDesigner) return;

    setIsEditingAccount(true);
  };

  /* =======================================================
     ACCOUNT DETAILS INCOMPLETE SWEETALERT REMINDER
  ======================================================= */

  const hasPromptedAccountRef = useRef({});

  useEffect(() => {
    if (
      showProfileAndAccount &&
      !loadingAccount &&
      !hasAccountDetails &&
      !isEditingAccount &&
      selectedDesignerId &&
      activeDesigner
    ) {
      if (hasPromptedAccountRef.current[selectedDesignerId]) {
        return;
      }

      hasPromptedAccountRef.current[selectedDesignerId] = true;

      const brandOrName =
        activeDesigner.brand ||
        activeDesigner.brand_name ||
        activeDesigner.name ||
        "This vendor";

      Swal.fire({
        title: "Account Details Setup",
        html: `
          <div class="zenve-swal-info-container">
            <div class="zenve-swal-info-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <p class="zenve-swal-info-desc">
              <strong>${brandOrName}</strong>'s bank settlement account and PAN card details are pending completion.
            </p>
            <p class="zenve-swal-info-subtext">
              Completing these details enables seamless payout disbursements and order settlements.
            </p>
          </div>
        `,
        showCloseButton: true,
        showCancelButton: true,
        confirmButtonText: "Complete Details",
        cancelButtonText: "Dismiss",
        reverseButtons: true,
        backdrop: "rgba(0, 0, 0, 0.4)",
        focusConfirm: false,
        width: "370px",
        customClass: {
          popup: "zenve-swal-popup",
          title: "zenve-swal-title",
          closeButton: "zenve-swal-close-btn",
          confirmButton: "zenve-swal-confirm-btn",
          cancelButton: "zenve-swal-cancel-btn",
          actions: "zenve-swal-actions",
        },
      }).then((result) => {
        if (result.isConfirmed) {
          handleStartEditAccount();
          setTimeout(() => {
            const el = document.getElementById("zenve-account-section");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 150);
        }
      });
    }
  }, [
    showProfileAndAccount,
    loadingAccount,
    hasAccountDetails,
    isEditingAccount,
    selectedDesignerId,
    activeDesigner,
  ]);

  const handleCancelEditAccount = () => {
    setAccountForm(savedAccountForm);
    setIsEditingAccount(false);
  };

  const handleIfscChange = (val) => {
    const formattedIfsc = val
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 11);

    setAccountForm((prev) => ({
      ...prev,
      ifscCode: formattedIfsc,
    }));
  };

  const handleSaveAccountDetails =
    async () => {
      if (!selectedDesignerId) {
        return;
      }

      const accountHolderName =
        accountForm.accountHolderName.trim();

      const accountNumber =
        accountForm.accountNumber.trim();

      const ifscCode =
        accountForm.ifscCode
          .trim()
          .toUpperCase();

      const panNumber =
        accountForm.panNumber
          .trim()
          .toUpperCase();

      if (!accountHolderName) {
        setAlertMessage({
          type: "error",
          text:
            "Account Holder Name is required.",
        });
        return;
      }

      if (!accountNumber) {
        setAlertMessage({
          type: "error",
          text:
            "Account Number is required.",
        });
        return;
      }

      if (
        !/^[0-9]{9,18}$/.test(
          accountNumber
        )
      ) {
        setAlertMessage({
          type: "error",
          text:
            "Account Number must contain 9 to 18 digits.",
        });
        return;
      }

      if (!ifscCode) {
        setAlertMessage({
          type: "error",
          text:
            "IFSC Code is required.",
        });
        return;
      }

      if (
        !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
          ifscCode
        )
      ) {
        setAlertMessage({
          type: "error",
          text:
            "Please enter a valid 11-character IFSC Code.",
        });
        return;
      }

      if (!panNumber) {
        setAlertMessage({
          type: "error",
          text:
            "PAN Number is required.",
        });
        return;
      }

      if (
        !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
          panNumber
        )
      ) {
        setAlertMessage({
          type: "error",
          text:
            "Please enter a valid 10-character PAN Number.",
        });
        return;
      }

      const payload = {
        account_holder_name:
          accountHolderName,

        account_number:
          accountNumber,

        ifsc_code:
          ifscCode,

        pan_number:
          panNumber,
      };

      try {
        setSavingAccount(true);

        const response =
          await saveDesignerAccountDetails(
            selectedDesignerId,
            payload
          );

        const responseData =
          unwrapApiResponse(response) || {};

        const savedData =
          responseData?.data || responseData;

        const normalizedAccount = {
          accountHolderName:
            savedData.account_holder_name ||
            accountHolderName,

          accountNumber:
            savedData.account_number ||
            accountNumber,

          ifscCode:
            savedData.ifsc_code ||
            ifscCode,

          panNumber:
            savedData.pan_number ||
            panNumber,
        };

        setAccountForm(
          normalizedAccount
        );

        setSavedAccountForm(
          normalizedAccount
        );

        const hasCriticalDetails = Boolean(normalizedAccount.accountNumber || normalizedAccount.ifscCode);
        setHasAccountDetails(hasCriticalDetails);
        setIsEditingAccount(false);
        setIsAccountMasked(true);

        setAlertMessage({
          type: "success",
          text:
            "Account & banking details updated successfully.",
        });

        await loadAccountDetails(selectedDesignerId);
      } catch (err) {
        console.error(
          "Failed to save account details:",
          err
        );

        setAlertMessage({
          type: "error",
          text:
            err?.message ||
            "Failed to save account details.",
        });
      } finally {
        setSavingAccount(false);
      }
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="ZENVE-portal-layout">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="ZENVE-portal-header">
        <div className="ZENVE-header-left">
          <div className="ZENVE-header-title-block">
            <h1 className="ZENVE-portal-title">
              <span className="ZENVE-layer-num">
                02
              </span>
              Vendor Portal
            </h1>

            <p className="ZENVE-portal-subtitle">
              Supply layer · Profile, SKU upload,
              inventory, orders, settlement view
            </p>
          </div>
        </div>

        <div className="ZENVE-header-right">
          <div className="ZENVE-header-right-controls">
            {isVendor && <div className="ZENVE-header-actions-group">
              <button
                type="button"
                className={`ZENVE-header-profile-btn ZENVE-header-media-btn ${showMediaContent ? "active" : ""}`}
                aria-label="Media Content"
                aria-pressed={showMediaContent}
                aria-controls="zenve-media-content"
                title={showMediaContent ? "Back to dashboard" : "Media Content"}
                onClick={() => {
                  setShowProfileAndAccount(false);
                  setMediaContentOpen(previous => !previous);
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m21 15-5-5L5 21m9-7-4-4-7 7" /></svg>
                {/*<span>Media Content</span>*/}
              </button>
              <button
                type="button"
                className={`ZENVE-header-profile-btn ${showProfileAndAccount
                  ? "active"
                  : ""
                  }`}
                onClick={() => {
                  setMediaContentOpen(false);
                  setShowProfileAndAccount(
                    (prev) => {
                      const nextState = !prev;

                      if (!prev) {
                        hasPromptedAccountRef.current[selectedDesignerId] = false;
                        setTimeout(() => {
                          const el =
                            document.getElementById(
                              "zenve-profile-account-section"
                            );

                          if (el) {
                            el.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }
                        }, 120);
                      }

                      return nextState;
                    }
                  );
                }}
                title={
                  showProfileAndAccount
                    ? "Hide My Profile & Account Details"
                    : "View My Profile & Account Details"
                }
                aria-expanded={
                  showProfileAndAccount
                }
                aria-label="Profile and Account Details"
              >
                <UserProfileIcon />

                {showProfileAndAccount && (
                  <span className="ZENVE-header-active-dot" />
                )}
              </button>

              <button
                type="button"
                className="ZENVE-header-notif-btn"
                onClick={() =>
                  setNotifSidebarOpen(true)
                }
                aria-label="Open notifications sidebar"
                title={
                  unreadNotifications > 0
                    ? `${unreadNotifications} unread notification${unreadNotifications >
                      1
                      ? "s"
                      : ""
                    }`
                    : "Notifications"
                }
              >
                <BellIcon />

                {unreadNotifications > 0 && (
                  <span className="ZENVE-header-notif-badge">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            </div>}
          </div>
        </div>
      </header>

      {!isVendor && <section className="ZENVE-brand-selection-body ZENVE-portal-card" aria-label="Vendor brand selection">
            <div className="ZENVE-signed-in-box">
              <span className="ZENVE-signed-in-prefix">
                Select brand
              </span>

              <div className="ZENVE-select-wrap">
                <select
                  value={selectedDesignerId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedDesignerId(newId);
                    try {
                      localStorage.setItem("zippy_selected_vendor_id", newId);
                    } catch {
                      // ignore
                    }
                  }}
                  disabled={
                    submittingSku || loadingDesigners ||
                    designers.length === 0
                  }
                  className="ZENVE-designer-select"
                  title="Select vendor brand" aria-label="Select vendor brand"
                >
                  {designers.length === 0 ? (
                    <option value="">
                      {loadingDesigners
                        ? "Loading..."
                        : "No vendors found"}
                    </option>
                  ) : (
                    designers.map((d) => (
                      <option
                        key={d.id}
                        value={d.id}
                      >
                        {d.brand_name ||
                          d.brand ||
                          d.designer_name ||
                          d.name ||
                          `Vendor #${d.id}`}
                      </option>
                    ))
                  )}
                </select>

                <span className="ZENVE-select-chevron">
                  <ArrowDownIcon />
                </span>
              </div>
            </div>

      </section>}

      {/* =====================================================
          EMPTY DESIGNER
      ===================================================== */}

      {!activeDesigner &&
        !loadingPortal &&
        !loadingDesigners ? (
        <div className="ZENVE-empty-state-card">
          <h3>
            Create a vendor in the Vendor CRM
            first.
          </h3>

          <p>
            You need a registered vendor brand
            to access the portal dashboard.
          </p>

          <Link
            to="/vendor-crm"
            className="ZENVE-btn-primary"
          >
            Open 01 Vendor CRM →
          </Link>
        </div>
      ) : (
        <main className="ZENVE-portal-main">
          {!showProfileAndAccount && (!isVendor || showMediaContent) && selectedDesignerId && (
            <div id="zenve-media-content">
              <MediaWorkspace key={selectedDesignerId} designerId={selectedDesignerId} />
            </div>
          )}
          {/* ===================================================
              DASHBOARD
          =================================================== */}

          {!showProfileAndAccount && !showMediaContent && (
            <section className="ZENVE-portal-card">
              <div className="ZENVE-card-header">
                <div>
                  <h2 className="ZENVE-card-title">
                    My dashboard
                  </h2>

                  <p className="ZENVE-card-description">
                    This month at a glance, straight
                    from the live order and settlement
                    ledgers.
                  </p>
                </div>
              </div>

              <div className="ZENVE-kpi-grid">
                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">
                    Sales this month
                  </div>

                  <div className="ZENVE-tile-value">
                    {loadingPortal
                      ? "—"
                      : formatInr(
                        kpis.monthlyGmv
                      )}
                  </div>

                  <div className="ZENVE-tile-hint">
                    Delivered GMV
                  </div>
                </div>

                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">
                    Orders
                  </div>

                  <div className="ZENVE-tile-value">
                    {loadingPortal
                      ? "—"
                      : kpis.orders ?? 0}
                  </div>

                  <div className="ZENVE-tile-hint">
                    {loadingPortal
                      ? "..."
                      : `${kpis.units ?? 0
                      } units sold`}
                  </div>
                </div>

                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">
                    Commission
                  </div>

                  <div className="ZENVE-tile-value">
                    {loadingPortal
                      ? "—"
                      : formatInr(
                        kpis.commission
                      )}
                  </div>

                  <div className="ZENVE-tile-hint">
                    Take rate{" "}
                    {activeDesigner?.takeRate ??
                      0}
                    %
                  </div>
                </div>

                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">
                    Net payable
                  </div>

                  <div className="ZENVE-tile-value">
                    {loadingPortal
                      ? "—"
                      : formatInr(
                        kpis.netPayable
                      )}
                  </div>

                  <div className="ZENVE-tile-hint">
                    {formatInr(kpis.paid)} already
                    paid
                  </div>
                </div>

                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">
                    Conversion
                  </div>

                  <div className="ZENVE-tile-value">
                    {loadingPortal
                      ? "—"
                      : `${kpis.conversion ??
                      0.1
                      }%`}
                  </div>

                  <div className="ZENVE-tile-hint">
                    Units per 100 views
                  </div>
                </div>

                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">
                    Best seller
                  </div>

                  <div
                    className="ZENVE-tile-value ZENVE-truncate"
                    title={
                      kpis.bestSeller?.name ||
                      "—"
                    }
                  >
                    {loadingPortal
                      ? "—"
                      : kpis.bestSeller?.name ||
                      "—"}
                  </div>

                  <div className="ZENVE-tile-hint">
                    {kpis.bestSeller
                      ? `${kpis.bestSeller.units} units`
                      : "No sales yet"}
                  </div>
                </div>

                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">
                    Returns
                  </div>

                  <div className="ZENVE-tile-value">
                    {loadingPortal
                      ? "—"
                      : kpis.returns ?? 0}
                  </div>

                  <div className="ZENVE-tile-hint">
                    {kpis.returnRate ?? 0}% of
                    units
                  </div>
                </div>

                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">
                    Live SKUs
                  </div>

                  <div className="ZENVE-tile-value">
                    {loadingPortal
                      ? "—"
                      : kpis.liveSkus ?? 0}
                  </div>

                  <div className="ZENVE-tile-hint">
                    {kpis.totalSkus ?? 0} total
                  </div>
                </div>

                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">
                    Inventory alerts
                  </div>

                  <div className="ZENVE-tile-value">
                    {loadingPortal
                      ? "—"
                      : kpis.inventoryAlerts ??
                      0}
                  </div>

                  <div className="ZENVE-tile-hint">
                    At or below reorder point
                  </div>
                </div>

                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">
                    Health score
                  </div>

                  <div className="ZENVE-tile-value">
                    {loadingPortal
                      ? "—"
                      : `${kpis.health ?? "—"
                      }/100`}
                  </div>

                  <div className="ZENVE-tile-hint">
                    Zenve partner score
                  </div>
                </div>
              </div>

              <div className="ZENVE-pending-actions-wrap">
                <span className="ZENVE-label-caps">
                  Pending actions
                </span>

                {pendingActions.length ===
                  0 ? (
                  <p className="ZENVE-pending-empty">
                    Nothing needs your attention.
                  </p>
                ) : (
                  <ul className="ZENVE-pending-list">
                    {pendingActions.map(
                      (action, idx) => (
                        <li key={idx}>
                          • {action}
                        </li>
                      )
                    )}
                  </ul>
                )}
              </div>
            </section>
          )}

          {/* ===================================================
              CREDIT POINTS SECTION
          =================================================== */}

          {!showProfileAndAccount && !showMediaContent && (
            <section
              className="ZENVE-portal-card ZENVE-credits-section-card"
              id="zenve-credits-section"
            >
              <div className="ZENVE-card-header">
                <div>
                  <h2 className="ZENVE-card-title">My credit points</h2>
                  <p className="ZENVE-card-description">
                    Online credits come with your joining plan. Every catalogue listing costs 500 points.
                  </p>
                </div>
              </div>

              {/* 4 KPI TILES */}
              <div className="ZENVE-credits-kpi-grid">
                <div className="ZENVE-credits-kpi-tile">
                  <div className="ZENVE-credits-tile-label">ONLINE CREDITS (FREE)</div>
                  <div className="ZENVE-credits-tile-value">
                    {formatPoints(creditWallet.online_credits)}{" "}
                    <span className="ZENVE-pts-unit">pts</span>
                  </div>
                  <div className="ZENVE-credits-tile-subtext">
                    {creditWallet.online_plan} · {creditWallet.online_listings_left} listings left
                  </div>
                </div>

                <div className="ZENVE-credits-kpi-tile">
                  <div className="ZENVE-credits-tile-label">POINTS USED</div>
                  <div className="ZENVE-credits-tile-value">
                    {formatPoints(creditWallet.points_used)}{" "}
                    <span className="ZENVE-pts-unit">pts</span>
                  </div>
                  <div className="ZENVE-credits-tile-subtext">
                    {creditWallet.points_used_subtitle || "5 catalogue listings at 500 pts each"}
                  </div>
                </div>

                <div className="ZENVE-credits-kpi-tile">
                  <div className="ZENVE-credits-tile-label">TOTAL BALANCE</div>
                  <div className="ZENVE-credits-tile-value">
                    {formatPoints(creditWallet.online_credits)}{" "}
                    <span className="ZENVE-pts-unit">pts</span>
                  </div>
                  <div className="ZENVE-credits-tile-subtext">
                    Available online credits
                  </div>
                </div>
              </div>

              {/* DAILY POINT BURN */}
              <div className="ZENVE-daily-burn-banner">
                <div className="ZENVE-daily-burn-label">DAILY POINT BURN</div>
                <div className="ZENVE-daily-burn-calc">
                  {dailyBurn.online_count} product(s) listed online × {dailyBurn.online_pts_each} pts = {dailyBurn.online_subtotal} pts per day
                </div>
                <div className="ZENVE-daily-burn-total">
                  Total {dailyBurn.online_subtotal} pts per day
                </div>
                <div className="ZENVE-daily-burn-rates">
                  {dailyBurn.rates_text}
                </div>
              </div>

              {/* CREDIT STATEMENT */}
              <div className="ZENVE-credits-section-block" style={{ marginBottom: 0 }}>
                <div className="ZENVE-credits-block-heading">CREDIT STATEMENT</div>
                {creditStatements.length === 0 ? (
                  <div
                    style={{
                      padding: "20px",
                      background: "#ffffff",
                      borderRadius: "8px",
                      border: "1px solid var(--ZENVE-line, #e2ddd5)",
                      fontSize: "13px",
                      color: "var(--ZENVE-muted, #746a60)",
                      textAlign: "center",
                    }}
                  >
                    No credit transactions recorded yet for this vendor.
                  </div>
                ) : (
                  <div className="ZENVE-statement-list">
                    {creditStatements.map((stmt, sIdx) => {
                      const isPositive = Number(stmt.points) >= 0;
                      const ptsDisplay = isPositive
                        ? `+${Number(stmt.points).toLocaleString("en-IN")} pts`
                        : `-${Number(Math.abs(stmt.points)).toLocaleString("en-IN")} pts`;

                      return (
                        <div key={stmt.id || sIdx} className="ZENVE-statement-row">
                          <div className="ZENVE-statement-desc">{stmt.description}</div>
                          <div className="ZENVE-statement-meta">
                            <span
                              className={`ZENVE-channel-tag tag-${(stmt.channel || "ONLINE").toLowerCase()}`}
                            >
                              {stmt.channel || "ONLINE"}
                            </span>
                            <span
                              className={`ZENVE-statement-pts ${isPositive ? "positive" : "negative"}`}
                            >
                              {ptsDisplay}
                            </span>
                            <span className="ZENVE-statement-date">{stmt.date_str || "—"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ===================================================
              PROFILE + ACCOUNT
          =================================================== */}

          {showProfileAndAccount && (
            <div
              id="zenve-profile-account-section"
              className="ZENVE-profile-account-exclusive-view"
            >
              {/* =================================================
                  PROFILE
              ================================================= */}

              <section className="ZENVE-portal-card">
                <div className="ZENVE-card-header">
                  <div>
                    <h2 className="ZENVE-card-title">
                      My profile
                    </h2>

                    <p className="ZENVE-card-description">
                      Maintained by the acquisition
                      team in the CRM.
                    </p>
                  </div>

                  <div className="ZENVE-profile-header-actions">
                    {!isEditingProfile ? (
                      <button
                        type="button"
                        className="ZENVE-btn-edit-profile"
                        onClick={
                          handleStartEditProfile
                        }
                        disabled={!activeDesigner}
                        title="Edit profile information"
                      >
                        <EditPencilIcon />
                        <span>
                          Edit profile
                        </span>
                      </button>
                    ) : (
                      <div className="ZENVE-edit-actions-row">
                        <button
                          type="button"
                          className="ZENVE-btn-secondary-sm"
                          onClick={
                            handleCancelEditProfile
                          }
                          disabled={
                            savingProfile
                          }
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          className="ZENVE-btn-save-sm"
                          onClick={
                            handleSaveProfile
                          }
                          disabled={
                            savingProfile
                          }
                        >
                          {savingProfile
                            ? "Saving..."
                            : "Save changes"}
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      className="ZENVE-btn-hide-profile-section"
                      onClick={() =>
                        setShowProfileAndAccount(
                          false
                        )
                      }
                      title="Hide My Profile and Account Details"
                    >
                      ✕ Hide
                    </button>
                  </div>
                </div>

                {!isEditingProfile ? (
                  <div className="ZENVE-profile-card-body">
                    <dl className="ZENVE-profile-dl">
                      <div className="ZENVE-profile-item">
                        <dt className="ZENVE-label-caps">
                          Brand
                        </dt>
                        <dd>
                          {activeDesigner?.brand ||
                            "—"}
                        </dd>
                      </div>

                      <div className="ZENVE-profile-item">
                        <dt className="ZENVE-label-caps">
                          Owner
                        </dt>
                        <dd>
                          {activeDesigner?.name ||
                            "—"}
                        </dd>
                      </div>

                      <div className="ZENVE-profile-item">
                        <dt className="ZENVE-label-caps">
                          Contact
                        </dt>
                        <dd>
                          {activeDesigner?.contact ||
                            "—"}
                        </dd>
                      </div>

                      <div className="ZENVE-profile-item">
                        <dt className="ZENVE-label-caps">
                          City
                        </dt>
                        <dd>
                          {activeDesigner?.city ||
                            "—"}
                        </dd>
                      </div>

                      <div className="ZENVE-profile-item">
                        <dt className="ZENVE-label-caps">
                          Stage
                        </dt>
                        <dd>
                          {activeDesigner?.stage ||
                            "—"}
                        </dd>
                      </div>

                      <div className="ZENVE-profile-item">
                        <dt className="ZENVE-label-caps">
                          KYC
                        </dt>
                        <dd>
                          {activeDesigner?.kyc
                            ? "Verified"
                            : "Pending"}
                        </dd>
                      </div>

                      <div className="ZENVE-profile-item">
                        <dt className="ZENVE-label-caps">
                          GST
                        </dt>
                        <dd>
                          {activeDesigner?.gst ||
                            "—"}
                        </dd>
                      </div>

                      <div className="ZENVE-profile-item">
                        <dt className="ZENVE-label-caps">
                          Contract ends
                        </dt>
                        <dd>
                          {activeDesigner?.contractEnds ||
                            "—"}
                        </dd>
                      </div>

                      <div className="ZENVE-profile-item">
                        <dt className="ZENVE-label-caps">
                          Take rate
                        </dt>
                        <dd>
                          {activeDesigner?.takeRate ??
                            0}
                          %
                        </dd>
                      </div>
                    </dl>

                    <aside className="ZENVE-profile-image-aside">
                      <span className="ZENVE-label-caps" style={{ marginBottom: "10px" }}>
                        Profile image
                      </span>
                      <div className="ZENVE-profile-avatar-wrapper">
                        {activeDesigner?.profile_image && !profileImageError ? (
                          <img
                            src={activeDesigner.profile_image}
                            alt={
                              activeDesigner?.brand ||
                              activeDesigner?.brand_name ||
                              "Vendor"
                            }
                            className="ZENVE-profile-avatar-img"
                            onError={() => setProfileImageError(true)}
                          />
                        ) : (
                          <div className="ZENVE-profile-avatar-fallback">
                            {getDesignerInitials(
                              activeDesigner?.name,
                              activeDesigner?.brand || activeDesigner?.brand_name
                            )}
                          </div>
                        )}
                      </div>
                      <span className="ZENVE-profile-avatar-caption">
                        {activeDesigner?.brand || "Vendor"}
                      </span>
                    </aside>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveProfile();
                    }}
                    className="ZENVE-profile-card-body"
                  >
                    <div className="ZENVE-profile-dl">
                      <div className="ZENVE-profile-item">
                        <label className="ZENVE-label-caps">
                          Brand
                        </label>

                        <input
                          type="text"
                          className="ZENVE-profile-input"
                          value={
                            profileForm.brand
                          }
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              brand:
                                e.target.value,
                            })
                          }
                          placeholder="e.g. Velvet Canine"
                          required
                        />
                      </div>

                      <div className="ZENVE-profile-item">
                        <label className="ZENVE-label-caps">
                          Owner
                        </label>

                        <input
                          type="text"
                          className="ZENVE-profile-input"
                          value={
                            profileForm.name
                          }
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              name:
                                e.target.value,
                            })
                          }
                          placeholder="e.g. Rohini Sharma"
                          required
                        />
                      </div>

                      <div className="ZENVE-profile-item">
                        <label className="ZENVE-label-caps">
                          Contact
                        </label>

                        <input
                          type="text"
                          className="ZENVE-profile-input"
                          value={
                            profileForm.contact
                          }
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              contact:
                                e.target.value,
                            })
                          }
                          placeholder="email@brand.com or 9876543210"
                        />
                      </div>

                      <div className="ZENVE-profile-item">
                        <label className="ZENVE-label-caps">
                          City
                        </label>

                        <input
                          type="text"
                          className="ZENVE-profile-input"
                          value={
                            profileForm.city
                          }
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              city:
                                e.target.value,
                            })
                          }
                          placeholder="e.g. Mumbai"
                        />
                      </div>

                      <div className="ZENVE-profile-item">
                        <span className="ZENVE-label-caps">
                          Stage
                        </span>

                        <div className="ZENVE-profile-readonly-box">
                          <span className="ZENVE-profile-readonly-val">
                            {activeDesigner?.stage ||
                              "—"}
                          </span>

                          <span className="ZENVE-profile-lock-badge">
                            CRM Controlled
                          </span>
                        </div>
                      </div>

                      <div className="ZENVE-profile-item">
                        <span className="ZENVE-label-caps">
                          KYC
                        </span>

                        <div className="ZENVE-profile-readonly-box">
                          <span className="ZENVE-profile-readonly-val">
                            {activeDesigner?.kyc
                              ? "Verified"
                              : "Pending"}
                          </span>

                          <span className="ZENVE-profile-lock-badge">
                            Verified in CRM
                          </span>
                        </div>
                      </div>

                      <div className="ZENVE-profile-item">
                        <label className="ZENVE-label-caps">
                          GST
                        </label>

                        <input
                          type="text"
                          className="ZENVE-profile-input"
                          value={
                            profileForm.gst
                          }
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              gst:
                                e.target.value,
                            })
                          }
                          placeholder="27AAAAA0000A1Z5"
                        />
                      </div>

                      <div className="ZENVE-profile-item">
                        <span className="ZENVE-label-caps">
                          Contract ends
                        </span>

                        <div className="ZENVE-profile-readonly-box">
                          <span className="ZENVE-profile-readonly-val">
                            {activeDesigner?.contractEnds ||
                              "—"}
                          </span>

                          <span className="ZENVE-profile-lock-badge">
                            CRM Contract
                          </span>
                        </div>
                      </div>

                      <div className="ZENVE-profile-item">
                        <span className="ZENVE-label-caps">
                          Take rate
                        </span>

                        <div className="ZENVE-profile-readonly-box">
                          <span className="ZENVE-profile-readonly-val">
                            {activeDesigner?.takeRate ??
                              0}
                            %
                          </span>

                          <span className="ZENVE-profile-lock-badge">
                            Fixed Agreement
                          </span>
                        </div>
                      </div>
                    </div>

                    <aside className="ZENVE-profile-image-aside edit-mode">
                      <span className="ZENVE-label-caps" style={{ marginBottom: "10px" }}>
                        Profile image
                      </span>

                      <div
                        className="ZENVE-profile-avatar-wrapper editable"
                        onClick={() => profileFileInputRef.current?.click()}
                        title="Click to select a new profile photo"
                      >
                        {profileImagePreview ? (
                          <img
                            src={profileImagePreview}
                            alt="Vendor profile"
                            className="ZENVE-profile-avatar-img"
                          />
                        ) : activeDesigner?.profile_image && !profileImageError ? (
                          <img
                            src={activeDesigner.profile_image}
                            alt="Vendor profile"
                            className="ZENVE-profile-avatar-img"
                            onError={() => setProfileImageError(true)}
                          />
                        ) : (
                          <div className="ZENVE-profile-avatar-fallback">
                            {getDesignerInitials(
                              profileForm.name || activeDesigner?.name,
                              profileForm.brand || activeDesigner?.brand
                            )}
                          </div>
                        )}

                        <div className="ZENVE-profile-avatar-overlay">
                          <span>Change</span>
                        </div>
                      </div>

                      <input
                        ref={profileFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                        disabled={savingProfile}
                        style={{ display: "none" }}
                      />

                      <button
                        type="button"
                        className="ZENVE-btn-upload-photo"
                        onClick={() => profileFileInputRef.current?.click()}
                        disabled={savingProfile}
                      >
                        📷 {profileImage || (activeDesigner?.profile_image && !profileImageError) ? "Change photo" : "Upload photo"}
                      </button>

                      {profileImage && (
                        <button
                          type="button"
                          className="ZENVE-btn-remove-photo-link"
                          onClick={() => {
                            if (profileImagePreview && profileImagePreview.startsWith("blob:")) {
                              URL.revokeObjectURL(profileImagePreview);
                            }
                            setProfileImage(null);
                            setProfileImagePreview(activeDesigner?.profile_image || "");
                          }}
                        >
                          Remove selected
                        </button>
                      )}

                      <small className="ZENVE-profile-image-help">
                        Image only · Max 5 MB
                      </small>
                    </aside>
                  </form>
                )}
              </section>

              {/* =================================================
                  ACCOUNT DETAILS
              ================================================= */}

              {canManageAccount && <section
                id="zenve-account-section"
                className="ZENVE-portal-card"
              >
                <div className="ZENVE-card-header">
                  <div>
                    <h2 className="ZENVE-card-title">
                      Account Details
                    </h2>

                    <p className="ZENVE-card-description">
                      Bank settlement account, IFSC
                      routing, and PAN card records
                      for payouts and disbursements.
                    </p>
                  </div>

                  {!isEditingAccount ? (
                    hasAccountDetails ? (
                      <button
                        type="button"
                        className="ZENVE-btn-edit-profile"
                        onClick={
                          handleStartEditAccount
                        }
                        disabled={
                          !activeDesigner ||
                          loadingAccount
                        }
                        title="Edit banking and account details"
                      >
                        <EditPencilIcon />

                        <span>
                          Edit account
                        </span>
                      </button>
                    ) : null
                  ) : (
                    <div className="ZENVE-edit-actions-row">
                      <button
                        type="button"
                        className="ZENVE-btn-secondary-sm"
                        onClick={
                          handleCancelEditAccount
                        }
                        disabled={
                          savingAccount
                        }
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="ZENVE-btn-save-sm"
                        onClick={
                          handleSaveAccountDetails
                        }
                        disabled={
                          savingAccount
                        }
                      >
                        {savingAccount
                          ? "Saving..."
                          : "Save changes"}
                      </button>
                    </div>
                  )}
                </div>

                {/* ACCOUNT LOADING */}

                {loadingAccount ? (
                  <div className="ZENVE-item-empty">
                    Loading account details...
                  </div>
                ) : !hasAccountDetails &&
                  !isEditingAccount ? (
                  /* =================================================
                     NO ACCOUNT DETAILS
                  ================================================= */

                  <div className="ZENVE-item-empty">
                    <strong>
                      Account details not available.
                    </strong>

                    <p>
                      This vendor has not provided
                      account and banking details yet.
                    </p>

                    <button
                      type="button"
                      className="ZENVE-btn-primary"
                      onClick={
                        handleStartEditAccount
                      }
                    >
                      Add Account Details
                    </button>
                  </div>
                ) : !isEditingAccount ? (
                  /* =================================================
                     DISPLAY ACCOUNT DETAILS
                  ================================================= */

                  <dl className="ZENVE-profile-dl">
                    {/* ACCOUNT HOLDER */}

                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">
                        Account Holder Name
                      </dt>

                      <dd className="ZENVE-account-holder-dd">
                        <span>
                          {accountForm.accountHolderName ||
                            "—"}
                        </span>

                        <span className="ZENVE-verified-mini-pill">
                          Primary
                        </span>
                      </dd>
                    </div>

                    {/* ACCOUNT NUMBER */}

                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">
                        Account Number
                      </dt>

                      <dd className="ZENVE-account-num-dd">
                        <span>
                          {isAccountMasked &&
                            accountForm.accountNumber
                            ? accountForm
                              .accountNumber
                              .length > 4
                              ? "•••• •••• " +
                              accountForm.accountNumber.slice(
                                -4
                              )
                              : accountForm.accountNumber
                            : accountForm.accountNumber ||
                            "—"}
                        </span>

                        {accountForm.accountNumber && (
                          <button
                            type="button"
                            className="ZENVE-mask-toggle-btn"
                            onClick={() =>
                              setIsAccountMasked(
                                (prev) =>
                                  !prev
                              )
                            }
                            title={
                              isAccountMasked
                                ? "Reveal full account number"
                                : "Mask account number"
                            }
                          >
                            <EyeIcon
                              off={
                                !isAccountMasked
                              }
                            />
                          </button>
                        )}
                      </dd>
                    </div>

                    {/* IFSC */}

                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">
                        IFSC Code
                      </dt>

                      <dd className="ZENVE-ifsc-dd">
                        <code>
                          {accountForm.ifscCode ||
                            "—"}
                        </code>

                        {accountForm.ifscCode && (
                          <span className="ZENVE-bank-tag">
                            {getBankNameFromIfsc(
                              accountForm.ifscCode
                            )}
                          </span>
                        )}
                      </dd>
                    </div>

                    {/* PAN */}

                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">
                        PAN Card Details
                      </dt>

                      <dd className="ZENVE-pan-dd">
                        <code>
                          {accountForm.panNumber ||
                            "—"}
                        </code>

                        {accountForm.panNumber && (
                          <span className="ZENVE-verified-mini-pill">
                            PAN Provided
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  /* =================================================
                     EDIT ACCOUNT FORM
                  ================================================= */

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveAccountDetails();
                    }}
                    className="ZENVE-profile-dl"
                  >
                    {/* ACCOUNT HOLDER */}

                    <div className="ZENVE-profile-item">
                      <label className="ZENVE-label-caps">
                        Account Holder Name
                      </label>

                      <input
                        type="text"
                        className="ZENVE-profile-input"
                        value={
                          accountForm.accountHolderName
                        }
                        onChange={(e) =>
                          setAccountForm(
                            (prev) => ({
                              ...prev,
                              accountHolderName:
                                e.target.value,
                            })
                          )
                        }
                        placeholder="Name as per bank records"
                        required
                      />

                      <span className="ZENVE-field-hint">
                        Name as per bank records
                      </span>
                    </div>

                    {/* ACCOUNT NUMBER */}

                    <div className="ZENVE-profile-item">
                      <label className="ZENVE-label-caps">
                        Account Number
                      </label>

                      <input
                        type="text"
                        inputMode="numeric"
                        className="ZENVE-profile-input"
                        value={
                          accountForm.accountNumber
                        }
                        onChange={(e) =>
                          setAccountForm(
                            (prev) => ({
                              ...prev,
                              accountNumber:
                                e.target.value
                                  .replace(
                                    /[^0-9]/g,
                                    ""
                                  )
                                  .slice(
                                    0,
                                    18
                                  ),
                            })
                          )
                        }
                        placeholder="e.g. 50100234567890"
                        maxLength={18}
                        required
                      />

                      <span className="ZENVE-field-hint">
                        9 to 18 digit beneficiary
                        account number
                      </span>
                    </div>

                    {/* IFSC */}

                    <div className="ZENVE-profile-item">
                      <div className="ZENVE-field-title-row">
                        <label className="ZENVE-label-caps">
                          IFSC Code
                        </label>

                        {accountForm.ifscCode && (
                          <span className="ZENVE-bank-tag">
                            {getBankNameFromIfsc(
                              accountForm.ifscCode
                            )}
                          </span>
                        )}
                      </div>

                      <input
                        type="text"
                        className="ZENVE-profile-input uppercase-code"
                        value={
                          accountForm.ifscCode
                        }
                        onChange={(e) =>
                          handleIfscChange(
                            e.target.value
                          )
                        }
                        placeholder="e.g. HDFC0001206"
                        maxLength={11}
                        required
                      />

                      <span className="ZENVE-field-hint">
                        11-character bank branch
                        code
                      </span>
                    </div>

                    {/* PAN */}

                    <div className="ZENVE-profile-item">
                      <label className="ZENVE-label-caps">
                        PAN Card Details
                      </label>

                      <input
                        type="text"
                        className="ZENVE-profile-input uppercase-code"
                        value={
                          accountForm.panNumber
                        }
                        onChange={(e) =>
                          setAccountForm(
                            (prev) => ({
                              ...prev,
                              panNumber:
                                e.target.value
                                  .toUpperCase()
                                  .replace(
                                    /[^A-Z0-9]/g,
                                    ""
                                  )
                                  .slice(
                                    0,
                                    10
                                  ),
                            })
                          )
                        }
                        placeholder="e.g. AAACC1206D"
                        maxLength={10}
                        required
                      />

                      <span className="ZENVE-field-hint">
                        10-character Income Tax
                        Permanent Account Number
                      </span>
                    </div>
                  </form>
                )}
              </section>}
            </div>
          )}

        </main>
      )}

      {/* =====================================================
          NOTIFICATION SIDEBAR
      ===================================================== */}

      {isVendor && notifSidebarOpen && (
        <div
          className="ZENVE-notif-backdrop"
          onClick={() =>
            setNotifSidebarOpen(false)
          }
          aria-hidden="true"
        >
          <div
            className="ZENVE-notif-sidebar"
            onClick={(e) =>
              e.stopPropagation()
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-sidebar-title"
          >
            <div className="ZENVE-notif-sidebar-header">
              <div className="ZENVE-notif-sidebar-title-wrap">
                <div className="ZENVE-notif-sidebar-title-row">
                  <h2
                    id="notif-sidebar-title"
                    className="ZENVE-notif-sidebar-title"
                  >
                    Notifications
                  </h2>

                  {unreadNotifications >
                    0 ? (
                    <span className="ZENVE-notif-count-pill">
                      {
                        unreadNotifications
                      }{" "}
                      unread
                    </span>
                  ) : (
                    <span className="ZENVE-notif-count-pill subtle">
                      All caught up
                    </span>
                  )}
                </div>

                <p className="ZENVE-notif-sidebar-sub">
                  QA outcomes, orders, low stock,
                  returns, payouts and campaigns.
                </p>
              </div>

              <button
                type="button"
                className="ZENVE-notif-sidebar-close"
                onClick={() =>
                  setNotifSidebarOpen(
                    false
                  )
                }
                aria-label="Close notifications sidebar"
              >
                ×
              </button>
            </div>

            <div className="ZENVE-notif-sidebar-actions">
              <span className="ZENVE-label-caps">
                {notifications.length}{" "}
                {notifications.length ===
                  1
                  ? "Update"
                  : "Updates"}
              </span>

              {unreadNotifications >
                0 && (
                  <button
                    type="button"
                    className="ZENVE-btn-outline-sm"
                    onClick={
                      handleMarkNotificationsRead
                    }
                  >
                    Mark all as read
                  </button>
                )}
            </div>

            <div className="ZENVE-notif-sidebar-body">
              {notifications.length ===
                0 ? (
                <div className="ZENVE-item-empty">
                  No notifications yet.
                </div>
              ) : (
                <div className="ZENVE-notifications-list">
                  {notifications.map(
                    (n) => (
                      <div
                        key={n.id}
                        className={`ZENVE-notification-row ${!n.read
                          ? "unread"
                          : ""
                          }`}
                      >
                        <div className="ZENVE-notif-left">
                          {!n.read && (
                            <span className="ZENVE-unread-dot" />
                          )}

                          <span className="ZENVE-notif-msg">
                            {
                              n.message
                            }
                          </span>
                        </div>

                        <div className="ZENVE-notif-right">
                          <span className="ZENVE-tone-badge info">
                            {String(
                              n.kind || ""
                            ).replaceAll(
                              "_",
                              " "
                            )}
                          </span>

                          <span className="ZENVE-notif-date">
                            {new Date(
                              n.at
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                timeZone:
                                  "Asia/Kolkata",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="ZENVE-notif-sidebar-footer">
              <button
                type="button"
                className="ZENVE-btn-outline-sm"
                onClick={() =>
                  setNotifSidebarOpen(
                    false
                  )
                }
              >
                Close Side Bar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          IMAGE WARNING
      ===================================================== */}

      {imageWarningOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="zenve-image-warning-title"
          onClick={() =>
            setImageWarningOpen(false)
          }
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background:
              "rgba(0, 0, 0, 0.55)",
          }}
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "430px",
              background: "#fff",
              borderRadius: "16px",
              padding: "26px",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.25)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                margin: "0 auto 14px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fff4e5",
                color: "#c76b00",
                fontSize: "28px",
                fontWeight: 700,
              }}
            >
              !
            </div>

            <h3
              id="zenve-image-warning-title"
              style={{
                margin: "0 0 8px",
                fontSize: "20px",
                color: "#171717",
              }}
            >
              Maximum 4 Images Allowed
            </h3>

            <p
              style={{
                margin: "0 0 20px",
                color: "#666",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              {imageWarningText ||
                "You can upload a maximum of 4 product images."}
            </p>

            <button
              type="button"
              onClick={() =>
                setImageWarningOpen(false)
              }
              style={{
                minWidth: "110px",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                background: "#171717",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
