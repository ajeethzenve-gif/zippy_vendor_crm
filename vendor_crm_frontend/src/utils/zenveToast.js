import Swal from "sweetalert2";

/* =========================================================
   ZENVE SWEETALERT TOAST NOTIFICATIONS (BOTTOM-RIGHT)
   Unified success, error & warning toast notifications for all layers.
   Replaces all top-of-page alert banners with SweetAlert only.
========================================================= */

export const showSuccessToast = (text, title = "") => {
  const message = typeof text === "string" ? text : (text?.text || text?.message || "Action completed successfully");
  return Swal.fire({
    toast: true,
    position: "bottom-end",
    icon: "success",
    iconColor: "#16a34a",
    title: title || message,
    html: title && message !== title ? `<span style="font-size: 12px; color: #57534e;">${message}</span>` : undefined,
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    background: "#ffffff",
    customClass: {
      popup: "zenve-swal-toast zenve-swal-toast-success",
      title: "zenve-swal-toast-title",
      timerProgressBar: "zenve-swal-progress-success",
    },
  });
};

export const showErrorToast = (text, title = "") => {
  const message = typeof text === "string" ? text : (text?.text || text?.message || "An unexpected error occurred");
  return Swal.fire({
    toast: true,
    position: "bottom-end",
    icon: "error",
    iconColor: "#dc2626",
    title: title || message,
    html: title && message !== title ? `<span style="font-size: 12px; color: #57534e;">${message}</span>` : undefined,
    showConfirmButton: false,
    timer: 4500,
    timerProgressBar: true,
    background: "#ffffff",
    customClass: {
      popup: "zenve-swal-toast zenve-swal-toast-error",
      title: "zenve-swal-toast-title",
      timerProgressBar: "zenve-swal-progress-error",
    },
  });
};

export const showWarningToast = (text, title = "") => {
  const message = typeof text === "string" ? text : (text?.text || text?.message || "Warning");
  return Swal.fire({
    toast: true,
    position: "bottom-end",
    icon: "warning",
    iconColor: "#f59e0b",
    title: title || message,
    html: title && message !== title ? `<span style="font-size: 12px; color: #57534e;">${message}</span>` : undefined,
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    background: "#ffffff",
    customClass: {
      popup: "zenve-swal-toast zenve-swal-toast-warning",
      title: "zenve-swal-toast-title",
      timerProgressBar: "zenve-swal-progress-warning",
    },
  });
};

export const showInfoToast = (text, title = "") => {
  const message = typeof text === "string" ? text : (text?.text || text?.message || "Information");
  return Swal.fire({
    toast: true,
    position: "bottom-end",
    icon: "info",
    iconColor: "#2563eb",
    title: title || message,
    html: title && message !== title ? `<span style="font-size: 12px; color: #57534e;">${message}</span>` : undefined,
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    background: "#ffffff",
    customClass: {
      popup: "zenve-swal-toast zenve-swal-toast-info",
      title: "zenve-swal-toast-title",
      timerProgressBar: "zenve-swal-progress-info",
    },
  });
};

export const showToast = (typeOrOptions, text = "", title = "") => {
  if (typeof typeOrOptions === "object" && typeOrOptions !== null) {
    const type = typeOrOptions.type || "info";
    const msg = typeOrOptions.text || typeOrOptions.message || "";
    const t = typeOrOptions.title || "";
    if (type === "error" || type === "danger") {
      return showErrorToast(msg, t);
    }
    if (type === "warning" || type === "warn") {
      return showWarningToast(msg, t);
    }
    if (type === "info") {
      return showInfoToast(msg, t);
    }
    return showSuccessToast(msg, t);
  }

  if (typeOrOptions === "error" || typeOrOptions === "danger") {
    return showErrorToast(text, title);
  }
  if (typeOrOptions === "warning" || typeOrOptions === "warn") {
    return showWarningToast(text, title);
  }
  if (typeOrOptions === "info") {
    return showInfoToast(text, title);
  }
  return showSuccessToast(text || typeOrOptions, title);
};

// Global helper access & alert interceptor
if (typeof window !== "undefined") {
  window.zenveToast = showToast;
  window.zenveSuccess = showSuccessToast;
  window.zenveError = showErrorToast;
  window.zenveWarning = showWarningToast;

  // Intercept any native browser window.alert and redirect to SweetAlert
  window.alert = (msg) => {
    showWarningToast(String(msg || ""));
  };

  window.addEventListener("zenve:toast", (e) => {
    const { type, text, title } = e.detail || {};
    showToast(type, text, title);
  });
}

export default showToast;
