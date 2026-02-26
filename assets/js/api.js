// /assets/js/api.js
const BASE = "/api"; // <- fica no mesmo domínio: https://sigabr.online/api

async function request(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Accept": "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(headers || {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  // exemplos (ajusta os paths pro teu back)
  getVehicleStatus: (plate) => request(`/vehicle/status?plate=${encodeURIComponent(plate)}`),
  getDebits: (plate) => request(`/debits?plate=${encodeURIComponent(plate)}`),
  getOrders: () => request(`/orders`)
};
