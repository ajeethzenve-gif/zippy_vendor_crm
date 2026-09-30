export function getVendorLoginUrl() {
  const baseUrl = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
  return new URL("/vendor-login", baseUrl).href;
}
