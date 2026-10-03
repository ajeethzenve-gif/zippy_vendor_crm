import { SESSION_EXPIRED_EVENT } from "../utils/sessionExpiry";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api";

export { API_BASE_URL };

export async function apiFetch(url, options = {}) {
  const token = sessionStorage.getItem("zippy_access_token");
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await globalThis.fetch(url, { ...options, headers });
  if (response.status === 401 && token && sessionStorage.getItem("zippy_access_token") === token) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { token } }));
  }
  return response;
}


/* =========================================================
   COMMON HELPERS
========================================================= */

async function parseResponse(response) {
  return response.json().catch(() => ({}));
}

function formatApiError(data, fallbackMessage) {
  if (!data) {
    return fallbackMessage;
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data === "object") {
    const messages = Object.entries(data)
      .map(([key, value]) => {
        let message;

        if (Array.isArray(value)) {
          message = value.join(", ");
        } else if (
          value &&
          typeof value === "object"
        ) {
          message = JSON.stringify(value);
        } else {
          message = String(value);
        }

        return `${key}: ${message}`;
      })
      .join(" | ");

    return messages || fallbackMessage;
  }

  return fallbackMessage;
}


/* =========================================================
   DESIGNERS API
========================================================= */

export async function getDesigners() {
  const response = await apiFetch(
    `${API_BASE_URL}/vendors/`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch vendors: ${response.status}`
    );
  }

  return response.json();
}


export async function getDesigner(id) {
  const response = await apiFetch(
    `${API_BASE_URL}/vendors/${id}/`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch vendor: ${response.status}`
    );
  }

  return response.json();
}


export async function createDesigner(
  designerData
) {
  if (!designerData) {
    throw new Error(
      "Vendor data is required."
    );
  }

  const isFormData =
    designerData instanceof FormData;

  const options = {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  };

  if (isFormData) {
    options.body = designerData;
  } else {
    options.headers[
      "Content-Type"
    ] = "application/json";

    options.body =
      JSON.stringify(designerData);
  }

  const response = await apiFetch(
    `${API_BASE_URL}/vendors/`,
    options
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to create vendor: ${response.status}`
      )
    );
  }

  return data;
}


export async function updateDesigner(
  id,
  designerData
) {
  if (!id) {
    throw new Error(
      "Vendor ID is required."
    );
  }

  if (!designerData) {
    throw new Error(
      "Vendor data is required."
    );
  }

  const isFormData =
    designerData instanceof FormData;

  const options = {
    method: "PATCH",
    headers: {
      Accept: "application/json",
    },
  };

  if (isFormData) {
    /*
     * Don't manually add Content-Type.
     * Browser adds multipart boundary.
     */
    options.body = designerData;
  } else {
    options.headers[
      "Content-Type"
    ] = "application/json";

    options.body =
      JSON.stringify(designerData);
  }

  const response = await apiFetch(
    `${API_BASE_URL}/vendors/${id}/`,
    options
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to update vendor: ${response.status}`
      )
    );
  }

  return data;
}

/* =========================================================
   PRODUCTS API
========================================================= */

export async function getProducts(params = {}) {
  const query = new URLSearchParams();

  if (params.designer) {
    query.set(
      "designer",
      params.designer
    );
  }

  if (params.category) {
    query.set(
      "category",
      params.category
    );
  }

  if (params.status) {
    query.set(
      "status",
      params.status
    );
  }

  if (
    params.is_live !== undefined &&
    params.is_live !== null
  ) {
    query.set(
      "is_live",
      params.is_live
    );
  }

  const queryString =
    query.toString();

  const url =
    `${API_BASE_URL}/products/` +
    (
      queryString
        ? `?${queryString}`
        : ""
    );

  const response = await apiFetch(
    url,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch products: ${response.status}`
    );
  }

  return response.json();
}


/* =========================================================
   CREATE PRODUCT
========================================================= */

export async function createProduct(
  productData
) {
  const isFormData =
    productData instanceof FormData;

  const options = {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  };

  /*
   * IMPORTANT:
   *
   * If FormData is being used:
   *
   * DO NOT set Content-Type manually.
   *
   * The browser automatically adds:
   *
   * multipart/form-data;
   * boundary=----------------...
   */

  if (isFormData) {
    options.body = productData;
  } else {
    options.headers[
      "Content-Type"
    ] = "application/json";

    options.body =
      JSON.stringify(productData);
  }

  const response = await apiFetch(
    `${API_BASE_URL}/products/`,
    options
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to create product: ${response.status}`
      )
    );
  }

  return data;
}


/* =========================================================
   UPDATE PRODUCT
========================================================= */

export async function updateProduct(
  id,
  productData
) {
  const isFormData =
    productData instanceof FormData;

  const options = {
    method: "PATCH",
    headers: {
      Accept: "application/json",
    },
  };

  /*
   * Supports both:
   *
   * 1. JSON
   * 2. FormData
   *
   * This is useful if you later allow product
   * image replacement.
   */

  if (isFormData) {
    options.body = productData;
  } else {
    options.headers[
      "Content-Type"
    ] = "application/json";

    options.body =
      JSON.stringify(productData);
  }

  const response = await apiFetch(
    `${API_BASE_URL}/products/${id}/`,
    options
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to update product: ${response.status}`
      )
    );
  }

  return data;
}


/* =========================================================
   DELETE PRODUCT
========================================================= */

export async function deleteProduct(id) {
  const response = await apiFetch(
    `${API_BASE_URL}/products/${id}/`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to delete product: ${response.status}`
      )
    );
  }

  return true;
}


/* =========================================================
   PRODUCT STOCK ADJUSTMENT
========================================================= */

export async function adjustProductStock(
  id,
  action,
  quantity
) {
  const response = await apiFetch(
    `${API_BASE_URL}/products/${id}/adjust_stock/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        action,
        quantity: Number(quantity),
      }),
    }
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to adjust stock: ${response.status}`
      )
    );
  }

  return data;
}


/* =========================================================
   ORDERS API
========================================================= */

export async function getOrders(
  params = {}
) {
  const query =
    new URLSearchParams();

  if (params.status) {
    query.set(
      "status",
      params.status
    );
  }

  if (params.search) {
    query.set(
      "search",
      params.search
    );
  }

  const queryString =
    query.toString();

  const url =
    `${API_BASE_URL}/orders/` +
    (
      queryString
        ? `?${queryString}`
        : ""
    );

  const response = await apiFetch(
    url,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch orders: ${response.status}`
    );
  }

  return response.json();
}


export async function getOrderStats() {
  const response = await apiFetch(
    `${API_BASE_URL}/orders/stats/`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch order stats: ${response.status}`
    );
  }

  return response.json();
}


export async function createOrder(
  orderData
) {
  const response = await apiFetch(
    `${API_BASE_URL}/orders/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(orderData),
    }
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to create order: ${response.status}`
      )
    );
  }

  return data;
}


export async function transitionOrder(
  id,
  status = null
) {
  const body = status
    ? JSON.stringify({ status })
    : "{}";

  const response = await apiFetch(
    `${API_BASE_URL}/orders/${id}/transition/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
    }
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to transition order: ${response.status}`
      )
    );
  }

  return data;
}


export async function cancelOrder(id) {
  return transitionOrder(
    id,
    "CANCELLED"
  );
}


/* =========================================================
   RETURNS API (LAYER 09)
========================================================= */

export async function getReturns(
  params = {}
) {
  const query =
    new URLSearchParams();

  if (params.status) {
    query.set(
      "status",
      params.status
    );
  }

  if (params.search) {
    query.set(
      "search",
      params.search
    );
  }

  if (params.order_id) {
    query.set(
      "order_id",
      params.order_id
    );
  }

  const queryString =
    query.toString();

  const url =
    `${API_BASE_URL}/returns/` +
    (
      queryString
        ? `?${queryString}`
        : ""
    );

  const response = await apiFetch(
    url,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch returns: ${response.status}`
    );
  }

  return response.json();
}


export async function getReturnStats() {
  const response = await apiFetch(
    `${API_BASE_URL}/returns/stats/`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch return stats: ${response.status}`
    );
  }

  return response.json();
}


export async function createReturn(
  returnData
) {
  const response = await apiFetch(
    `${API_BASE_URL}/returns/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(returnData),
    }
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to create return request: ${response.status}`
      )
    );
  }

  return data;
}


export async function transitionReturn(
  id,
  status = null,
  notes = null
) {
  const payload = {};

  if (status) {
    payload.status = status;
  }

  if (notes) {
    payload.inspection_notes =
      notes;
  }

  const response = await apiFetch(
    `${API_BASE_URL}/returns/${id}/transition/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(
        payload
      ),
    }
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to transition return: ${response.status}`
      )
    );
  }

  return data;
}


export async function updateReturn(
  id,
  returnData
) {
  const response = await apiFetch(
    `${API_BASE_URL}/returns/${id}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(returnData),
    }
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to update return: ${response.status}`
      )
    );
  }

  return data;
}


/* =========================================================
   SETTLEMENT API (LAYER 10)
========================================================= */

export async function getSettlements(
  params = {}
) {
  const query =
    new URLSearchParams();

  if (params.status) {
    query.set(
      "status",
      params.status
    );
  }

  if (params.designer_id) {
    query.set(
      "designer_id",
      params.designer_id
    );
  }

  if (
    params.is_reversal !==
      undefined &&
    params.is_reversal !== null
  ) {
    query.set(
      "is_reversal",
      params.is_reversal
    );
  }

  if (params.search) {
    query.set(
      "search",
      params.search
    );
  }

  const queryString =
    query.toString();

  const url =
    `${API_BASE_URL}/settlements/` +
    (
      queryString
        ? `?${queryString}`
        : ""
    );

  const response = await apiFetch(
    url,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch settlements: ${response.status}`
    );
  }

  return response.json();
}


export async function getSettlementStats() {
  const response = await apiFetch(
    `${API_BASE_URL}/settlements/stats/`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch settlement stats: ${response.status}`
    );
  }

  return response.json();
}


export async function generateSettlements() {
  const response = await apiFetch(
    `${API_BASE_URL}/settlements/generate/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to generate settlements: ${response.status}`
      )
    );
  }

  return data;
}


export async function transitionSettlement(
  id,
  status = null,
  payload = {}
) {
  const body = {
    ...payload,
  };

  if (status) {
    body.status = status;
  }

  const response = await apiFetch(
    `${API_BASE_URL}/settlements/${id}/transition/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to transition settlement: ${response.status}`
      )
    );
  }

  return data;
}


export async function updateSettlement(
  id,
  data
) {
  const response = await apiFetch(
    `${API_BASE_URL}/settlements/${id}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  const responseData =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        responseData,
        `Failed to update settlement: ${response.status}`
      )
    );
  }

  return responseData;
}


/* =========================================================
   ANALYTICS & BI API (LAYER 11)
========================================================= */

export async function getAnalyticsOverview() {
  const response = await apiFetch(
    `${API_BASE_URL}/analytics/overview/`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch analytics overview: ${response.status}`
    );
  }

  return response.json();
}


export function exportAnalyticsReport(
  reportType = "full"
) {
  const downloadUrl =
    `${API_BASE_URL}/analytics/export/` +
    `?report=${encodeURIComponent(
      reportType
    )}`;

  const link =
    document.createElement("a");

  link.href = downloadUrl;

  link.setAttribute(
    "download",
    `zenve_${reportType}_report.csv`
  );

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);
}


/* =========================================================
   COMMAND CENTRE API (LAYER 12)
========================================================= */

export async function getCommandCentreOverview() {
  const response = await apiFetch(
    `${API_BASE_URL}/command-centre/overview/`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch command centre overview: ${response.status}`
    );
  }

  return response.json();
}


/* =========================================================
   DESIGNER PORTAL API (LAYER 02)
========================================================= */

export async function getDesignerPortalDashboard(
  designerId
) {
  const response = await apiFetch(
    `${API_BASE_URL}/vendors/${designerId}/portal-dashboard/`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch vendor portal dashboard: ${response.status}`
    );
  }

  return response.json();
}


export async function markDesignerNotificationsRead(
  designerId
) {
  const response = await apiFetch(
    `${API_BASE_URL}/vendors/${designerId}/portal-dashboard/mark-read/`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to mark notifications read: ${response.status}`
    );
  }

  return response.json();
}

/* =========================================================
   DESIGNER CREDITS API
========================================================= */

export async function getDesignerCredits(designerId) {
  const response = await apiFetch(`${API_BASE_URL}/credits/vendor/${designerId}/`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch vendor credits: ${response.status}`);
  }

  return response.json();
}

export async function buyOfflineCreditPack(designerId, planId, planName) {
  const response = await apiFetch(`${API_BASE_URL}/credits/buy-offline-pack/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      designer_id: designerId,
      plan_id: planId,
      plan_name: planName,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to purchase offline pack: ${response.status}`);
  }

  return response.json();
}

export async function getOfflineCreditPlans() {
  const response = await apiFetch(`${API_BASE_URL}/credits/`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch offline credit plans: ${response.status}`);
  }

  return response.json();
}


/* =========================================================
   DESIGNER ACCOUNT DETAILS API
   ========================================================= */

// function getAuthHeaders() {
//   const token =
//     localStorage.getItem("access_token") ||
//     localStorage.getItem("accessToken") ||
//     localStorage.getItem("token");
//
//   return {
//     Accept: "application/json",
//     ...(token
//       ? {
//           Authorization: `Bearer ${token}`,
//         }
//       : {}),
//   };
// }

export async function getDesignerAccountDetails(designerId) {
  if (!designerId) {
    throw new Error("Vendor ID is required.");
  }

  const response = await apiFetch(
    `${API_BASE_URL}/vendors/${designerId}/account-details/`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to fetch vendor account details: ${response.status}`
      )
    );
  }

  return data;
}


export async function saveDesignerAccountDetails(
  designerId,
  accountData
) {
  if (!designerId) {
    throw new Error("Vendor ID is required.");
  }

  const response = await apiFetch(
    `${API_BASE_URL}/vendors/${designerId}/account-details/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(accountData),
    }
  );

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to save vendor account details: ${response.status}`
      )
    );
  }

  return data;
}
export async function getVendors() {
  const response = await apiFetch(
    `${API_BASE_URL}/vendors/`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch vendors: ${response.status}`
    );
  }

  return response.json();
}


export async function getVendor(id) {
  const response = await apiFetch(
    `${API_BASE_URL}/vendors/${id}/`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch vendor: ${response.status}`
    );
  }

  return response.json();
}


export async function createVendor(
  designerData
) {
  if (!designerData) {
    throw new Error(
      "Vendor data is required."
    );
  }

  const isFormData =
    designerData instanceof FormData;

  const options = {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
  };

  if (isFormData) {
    options.body = designerData;
  } else {
    options.headers[
      "Content-Type"
    ] = "application/json";

    options.body =
      JSON.stringify(designerData);
  }

  const response = await apiFetch(
    `${API_BASE_URL}/vendors/`,
    options
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to create vendor: ${response.status}`
      )
    );
  }

  return data;
}


export async function updateVendor(
  id,
  designerData
) {
  if (!id) {
    throw new Error(
      "Vendor ID is required."
    );
  }

  if (!designerData) {
    throw new Error(
      "Vendor data is required."
    );
  }

  const isFormData =
    designerData instanceof FormData;

  const options = {
    method: "PATCH",
    headers: {
      Accept: "application/json",
    },
  };

  if (isFormData) {
    /*
     * Don't manually add Content-Type.
     * Browser adds multipart boundary.
     */
    options.body = designerData;
  } else {
    options.headers[
      "Content-Type"
    ] = "application/json";

    options.body =
      JSON.stringify(designerData);
  }

  const response = await apiFetch(
    `${API_BASE_URL}/vendors/${id}/`,
    options
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `Failed to update vendor: ${response.status}`
      )
    );
  }

  return data;
}


export async function getOnlineVendorPlans() {
  const response = await apiFetch(`${API_BASE_URL}/credits/vendor-plans/`);
  if (!response.ok) throw new Error("Failed to load vendor credit plans.");
  return response.json();
}

export async function getEmployees() {
  const response = await apiFetch(`${API_BASE_URL}/employees/`);
  const data = await parseResponse(response);
  if (!response.ok) throw new Error(formatApiError(data, "Could not load employees."));
  return data;
}

export async function getEmployeeRoles() {
  const response = await apiFetch(`${API_BASE_URL}/employee-roles/`);
  const data = await parseResponse(response);
  if (!response.ok) throw new Error(formatApiError(data, "Could not load roles."));
  return data;
}

export async function createEmployee(payload) {
  const response = await apiFetch(`${API_BASE_URL}/employees/`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  const data = await parseResponse(response);
  if (!response.ok) {
    const error = new Error(formatApiError(data, "Could not create employee."));
    error.fields = data;
    throw error;
  }
  return data;
}
