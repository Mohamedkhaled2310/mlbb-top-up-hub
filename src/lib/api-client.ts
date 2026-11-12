import type { FazerTopUpResponse, PlayerValidationResult } from "../types/store";

export async function loginWithPasswordApi(email: string, password: string): Promise<any> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return await res.json();
}

export async function refreshSessionApi(refreshToken: string): Promise<any> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  return await res.json();
}

export async function getStoreApi(gameId?: string): Promise<any> {
  const q = gameId ? `?gameId=${encodeURIComponent(gameId)}` : "";
  const res = await fetch(`/api/store${q}`, { method: "GET", cache: "no-store" });
  return await res.json();
}

export async function validatePlayerApi(
  userId: string,
  zoneId?: string,
  gameId?: string,
  region?: string,
  fazerCategoryId?: string,
): Promise<PlayerValidationResult & { accountRegion?: string | null }> {
  const res = await fetch("/api/fzr/validate-id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      zoneId: zoneId || "",
      gameId: gameId || "mlbb",
      region,
      fazerCategoryId,
    }),
  });
  return await res.json();
}

export async function executeTopUpApi(data: {
  offerId: string;
  playerId: string;
  zoneId?: string;
  gameId?: string;
  fazerCategoryId?: string;
  region?: string;
  idempotencyKey?: string;
}): Promise<FazerTopUpResponse> {
  const res = await fetch("/api/fzr/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return await res.json();
}

export async function submitOrderApi(data: any, token?: string | null): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch("/api/orders/submit", { method: "POST", headers, body: JSON.stringify(data) });
  return await res.json();
}

export async function getMerchantDashboardApi(token: string): Promise<any> {
  const res = await fetch("/api/merchant/dashboard", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return await res.json();
}

export async function adminListMerchantsApi(
  token: string,
  params: { page?: number; limit?: number; q?: string } = {},
): Promise<any> {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.q) sp.set("q", params.q);
  const res = await fetch(`/api/admin/merchants?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return await res.json();
}

export async function adminCreateMerchantApi(
  token: string,
  body: {
    email: string;
    password: string;
    fullName?: string;
    phone?: string;
    marginPercent?: number;
    initialBalanceEgp?: number;
  },
): Promise<any> {
  const res = await fetch("/api/admin/merchants/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return await res.json();
}

export async function adminToggleMerchantApi(
  token: string,
  body: { merchant_id: string; is_active: boolean },
): Promise<any> {
  const res = await fetch("/api/admin/merchants/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return await res.json();
}

export async function adminListOrdersApi(token: string, limit = 30): Promise<any> {
  const res = await fetch(`/api/admin/orders?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return await res.json();
}

export async function adminCreditMerchantApi(
  token: string,
  body: { merchant_id: string; amount: number; note?: string },
): Promise<any> {
  const res = await fetch("/api/admin/merchants/credit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return await res.json();
}

export async function adminSetMarginApi(
  token: string,
  body: { merchant_id: string; margin_percent: number },
): Promise<any> {
  const res = await fetch("/api/admin/merchants/margin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return await res.json();
}

export async function adminUpdateEgpRateApi(token: string, egp_rate: number): Promise<any> {
  const res = await fetch("/api/admin/settings/egp-rate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ egp_rate }),
  });
  return await res.json();
}

export async function adminSyncFazerApi(token?: string, secret?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (secret) headers["x-cron-secret"] = secret;
  const res = await fetch("/api/admin/sync-fazer", { method: "POST", headers });
  return await res.json();
}

export async function getMyProfileApi(token: string): Promise<any> {
  const res = await fetch("/api/me", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return await res.json();
}

export async function checkSystemStatusApi(): Promise<any> {
  const res = await fetch("/api/status", { method: "GET", cache: "no-store" });
  return await res.json();
}
