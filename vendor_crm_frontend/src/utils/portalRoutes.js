export const VENDOR_HOME = "/";
export const STAFF_HOME = "/crm";

export function homeForRole(role) {
  return role === "designer" ? VENDOR_HOME : STAFF_HOME;
}

export function portalTitle(pathname, role) {
  const vendorPath = pathname === VENDOR_HOME || pathname === "/vendor-login" || pathname === "/register"
    || pathname === "/vendor-portal" || pathname === "/vendor-dashboard" || pathname.startsWith("/vendor-kyc-");
  const staffEntry = pathname === STAFF_HOME || pathname === "/login";
  if (pathname === VENDOR_HOME || pathname === "/vendor-login") return "Zenve Vendor";
  if (staffEntry) return "Zenve Vendor CRM";
  if (role) return role === "designer" ? "Zenve Vendor" : "Zenve Vendor CRM";
  return vendorPath ? "Zenve Vendor" : "Zenve Vendor CRM";
}
