export const SESSION_EXPIRED_EVENT = "zippy:session-expired";

export function tokenExpiresAt(token) {
  try {
    const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
    return typeof payload.exp === "number" && Number.isFinite(payload.exp) && payload.exp > 0 ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function loginPathForRole(role) {
  return role === "designer" ? "/vendor-login" : "/login";
}
