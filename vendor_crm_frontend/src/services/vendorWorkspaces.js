import { API_BASE_URL, apiFetch } from "./api";
export async function workspaceRequest(path, method = "GET", payload) {
  const response = await apiFetch(`${API_BASE_URL}/vendors/${path}`, {
    method, headers: { "Content-Type": "application/json" },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Object.entries(data).map(([key, value]) => `${key === "detail" ? "" : key + ": "}${[].concat(value).join(" ")}`).join(" ") || "Request failed. Please try again.");
  return data;
}
