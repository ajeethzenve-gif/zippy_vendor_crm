/* =========================================================
   ZENVE COMPANY GST REGISTRY & MASKING UTILITIES
   Single Master Enterprise GSTIN & Designer Privacy Masking
========================================================= */

export const DEFAULT_COMPANY_GSTS = [
  {
    id: "zenve-gst-master",
    name: "ZENVE FASHION PRIVATE LIMITED",
    gstNumber: "29AABCZ1234F1Z8",
    state: "Karnataka (All-India E-Commerce Coverage)",
    hub: "ZENVE Corporate Master Entity",
    type: "E-Commerce Marketplace Operator & Master Platform GSTIN",
    section: "Section 9(5) & Section 52 CGST Act",
    isPrimary: true,
  },
];

const STORAGE_KEY = "zenve_company_gst_single_v1";

/**
 * Retrieve the active company-developed GST (persisted in localStorage)
 */
export function getCompanyGstList() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading company GST:", e);
  }
  return DEFAULT_COMPANY_GSTS;
}

/**
 * Add or update the company-developed GST number
 */
export function saveCompanyGst(newGst) {
  const cleanNumber = newGst.gstNumber.trim().toUpperCase();
  const updated = [
    {
      id: `zenve-gst-${Date.now()}`,
      name: newGst.name || "ZENVE FASHION PRIVATE LIMITED",
      gstNumber: cleanNumber,
      state: newGst.state || "Karnataka (All-India E-Commerce Coverage)",
      hub: newGst.hub || "ZENVE Corporate Master Entity",
      type: newGst.type || "E-Commerce Marketplace Operator & Master Platform GSTIN",
      section: "Section 9(5) & Section 52 CGST Act",
      isPrimary: true,
      createdAt: new Date().toISOString(),
    },
  ];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Error saving company GST:", e);
  }
  return updated;
}

/**
 * Check whether a given GSTIN matches the company-developed GST
 */
export function isCompanyGst(gstNumber) {
  if (!gstNumber) return false;
  const clean = gstNumber.trim().toUpperCase();
  const list = getCompanyGstList();
  return (
    clean === "29AABCZ1234F1Z8" ||
    clean === "COMPANY_GST_REQUESTED" ||
    list.some((g) => g.gstNumber.toUpperCase() === clean)
  );
}

/**
 * Get details of the active company GST number
 */
export function getCompanyGstDetails(gstNumber) {
  if (!gstNumber) return null;
  const clean = gstNumber.trim().toUpperCase();
  const list = getCompanyGstList();
  return list.find((g) => g.gstNumber.toUpperCase() === clean) || null;
}

/**
 * Mask GST number for designers and privacy:
 * Hides the characters with 'X', showing only the LAST 4 digits.
 * e.g. "29AABCZ1234F1Z8" -> "XXXXXXXXXXXF1Z8"
 */
export function maskGstNumber(gstNumber) {
  if (!gstNumber || gstNumber === "—" || gstNumber === "-" || gstNumber.trim() === "") {
    return "—";
  }
  if (gstNumber === "COMPANY_GST_REQUESTED") {
    return "Creation Requested (Company)";
  }
  const clean = gstNumber.trim().toUpperCase();
  if (clean.length <= 4) return clean;
  const maskedCount = clean.length - 4;
  return "X".repeat(maskedCount) + clean.slice(-4);
}
