import { FazerCardsService } from "./fazercards.service";
import { checkRateLimit, getClientIp, rateLimitResponse } from "./rate-limit";
import {
  adminCreateMerchant,
  adminCreditMerchant,
  adminListMerchants,
  adminListRecentOrders,
  adminSetMerchantMargin,
  adminSetMerchantRegion,
  adminToggleMerchantStatus,
  adminUpdateEgpRate,
  getMerchantDashboard,
  getMyProfile,
  getPublicAuthConfig,
  getStoreData,
  loginWithPasswordServer,
  persistFazerAccountBalance,
  refreshSessionServer,
  submitCustomerOrder,
  syncFazerPackagesAndBalance,
  updateMyNationality,
} from "./store.service";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Cron-Secret",
    },
  });
}

function getAuthToken(request: Request): string | null {
  const h = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!h) return null;
  if (h.startsWith("Bearer ")) return h.slice(7).trim();
  return null;
}

export async function handleApiRoute(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Cron-Secret",
      },
    });
  }

  // Runtime Supabase public config & server-assisted authentication
  if (path === "/api/auth/config" && request.method === "GET") {
    return json(getPublicAuthConfig());
  }

  if (path === "/api/auth/login" && request.method === "POST") {
    if (!process.env["VITEST"]) {
      const ip = getClientIp(request);
      const rl = checkRateLimit(`auth:${ip}`, 8, 60_000);
      if (!rl.allowed) {
        return rateLimitResponse(rl.retryAfterSeconds, "محاولات تسجيل دخول كثيرة، يرجى الانتظار دقيقة والمحاولة ثانية.");
      }
    }
    try {
      const body = (await request.json()) as { email?: string; password?: string };
      const session = await loginWithPasswordServer(body.email || "", body.password || "");
      return json({ success: true, ...session });
    } catch (e: any) {
      return json({ success: false, error: e?.message || "بيانات الدخول غير صحيحة" }, 401);
    }
  }

  if (path === "/api/auth/refresh" && request.method === "POST") {
    try {
      const body = (await request.json()) as { refreshToken?: string };
      const session = await refreshSessionServer(body.refreshToken || "");
      return json({ success: true, ...session });
    } catch (e: any) {
      return json({ success: false, error: e?.message || "انتهت صلاحية الجلسة" }, 401);
    }
  }

  // Public store data (packages from Fazer cache + egp rate) with Edge SWR caching
  if (path === "/api/store" && request.method === "GET") {
    try {
      const gameId = url.searchParams.get("gameId") || undefined;
      const data = await getStoreData(gameId);
      const response = json(data);
      response.headers.set("Cache-Control", "public, max-age=10, stale-while-revalidate=30");
      return response;
    } catch (e: any) {
      return json({ success: false, error: e?.message || "Failed to load store" }, 500);
    }
  }

  // Sync Fazer catalog + balance (server-side, can be called by admin or cron/Vercel)
  if (path === "/api/admin/sync-fazer" && request.method === "POST") {
    try {
      const token = getAuthToken(request);
      const secret = url.searchParams.get("secret") || request.headers.get("x-cron-secret");
      const result = await syncFazerPackagesAndBalance({ token, secret });
      return json(result, result.ok ? 200 : 400);
    } catch (e: any) {
      return json({ ok: false, error: e?.message || "sync failed" }, 500);
    }
  }

  // Fazer routes
  if (path === "/api/fzr/me" && request.method === "GET") {
    const fazer = await FazerCardsService.checkAccount();
    await persistFazerAccountBalance(fazer);
    return json(fazer);
  }

  if (path === "/api/fzr/validate-id" && request.method === "POST") {
    if (!process.env["VITEST"]) {
      const ip = getClientIp(request);
      const rl = checkRateLimit(`val:${ip}`, 30, 60_000);
      if (!rl.allowed) {
        return rateLimitResponse(rl.retryAfterSeconds, "تجاوزت الحد المسموح لمحاولات التحقق، يرجى الانتظار دقيقة.");
      }
    }
    try {
      const body = (await request.json()) as Record<string, any>;
      const result = await FazerCardsService.validatePlayer(
        body["userId"] || body["player_id"] || "",
        body["zoneId"] || body["zone_id"],
        body["gameId"] || body["game_id"] || "mlbb",
        body["region"],
        body["fazerCategoryId"] || body["category_id"],
      );
      const reqRegion = String(body["region"] || "").trim().toLowerCase();
      const accRegion = String(result.accountRegion || "").trim().toLowerCase();
      if (reqRegion && reqRegion !== "global" && accRegion && reqRegion !== accRegion) {
        return json({
          ...result,
          valid: false,
          error: `منطقة الحساب (${result.accountRegion}) لا تطابق المنطقة المختارة (${body["region"]}).`,
        });
      }
      return json(result);
    } catch {
      return json({ valid: false, error: "Invalid JSON body" }, 400);
    }
  }

  if (path === "/api/fzr/order" && request.method === "POST") {
    try {
      const body = (await request.json()) as Record<string, any>;
      const result = await FazerCardsService.executeTopUp({
        offerId: String(body["offerId"] || body["offer_id"] || ""),
        playerId: String(body["playerId"] || body["player_id"] || ""),
        zoneId: body["zoneId"] || body["zone_id"],
        gameId: body["gameId"] || body["game_id"] || "mlbb",
        fazerCategoryId: body["fazerCategoryId"] || body["category_id"],
        region: body["region"],
        idempotencyKey: body["idempotencyKey"],
      });
      return json(result);
    } catch {
      return json({ success: false, error: "Invalid JSON body" }, 400);
    }
  }

  // Customer/merchant order submission (cart, multi-package). Merchant flow debits wallet atomically server-side + refunds failed units.
  if (path === "/api/orders/submit" && request.method === "POST") {
    if (!process.env["VITEST"]) {
      const ip = getClientIp(request);
      const rl = checkRateLimit(`order:${ip}`, 15, 60_000);
      if (!rl.allowed) {
        return rateLimitResponse(rl.retryAfterSeconds, "تم استقبال عدة طلبات متتالية، يرجى الانتظار لحظات لتجنب التكرار.");
      }
    }
    try {
      const token = getAuthToken(request);
      const body = await request.json();
      const result = await submitCustomerOrder(body, token);
      return json(result, result.success ? 200 : 400);
    } catch (e: any) {
      return json({ success: false, error: e?.message || "Order failed" }, 500);
    }
  }

  // Merchant dashboard (profile, wallet, orders, stats) - requires auth
  if (path === "/api/merchant/dashboard" && request.method === "GET") {
    try {
      const token = getAuthToken(request);
      if (!token) return json({ error: "unauthorized" }, 401);
      const data = await getMerchantDashboard(token);
      return json(data);
    } catch (e: any) {
      const msg = e?.message || "failed";
      return json({ error: msg }, msg.includes("forbidden") ? 403 : msg.includes("unauthorized") ? 401 : 500);
    }
  }

  // Admin: merchants list (pagination) + stats
  if (path === "/api/admin/merchants" && request.method === "GET") {
    try {
      const token = getAuthToken(request);
      if (!token) return json({ error: "unauthorized" }, 401);
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = parseInt(url.searchParams.get("limit") || "10", 10);
      const q = url.searchParams.get("q") || "";
      const data = await adminListMerchants(token, { page, limit, q });
      return json(data);
    } catch (e: any) {
      const msg = e?.message || "failed";
      return json({ error: msg }, msg.includes("forbidden") ? 403 : msg.includes("unauthorized") ? 401 : 500);
    }
  }

  if (path === "/api/admin/merchants/create" && request.method === "POST") {
    try {
      const token = getAuthToken(request);
      if (!token) return json({ error: "unauthorized" }, 401);
      const body = (await request.json()) as Record<string, any>;
      const data = await adminCreateMerchant(token, {
        email: String(body["email"] || ""),
        password: String(body["password"] || ""),
        fullName: body["fullName"] || body["full_name"],
        phone: body["phone"],
        region: body["region"] || body["country"],
        marginPercent: body["marginPercent"] ?? body["margin_percent"],
        initialBalanceEgp: body["initialBalanceEgp"] ?? body["initial_balance_egp"],
      });
      return json(data);
    } catch (e: any) {
      return json({ error: e?.message || "فشل إنشاء حساب التاجر" }, 400);
    }
  }

  if (path === "/api/admin/merchants/region" && request.method === "POST") {
    try {
      const token = getAuthToken(request);
      if (!token) return json({ error: "unauthorized" }, 401);
      const body = (await request.json()) as Record<string, any>;
      const data = await adminSetMerchantRegion(token, {
        merchantId: body["merchant_id"] || body["merchantId"],
        userId: body["user_id"] || body["userId"],
        region: String(body["region"] || body["country"] || "EG"),
      });
      return json(data);
    } catch (e: any) {
      return json({ error: e?.message || "فشل تحديث جنسية التاجر" }, 400);
    }
  }

  if (path === "/api/merchant/nationality" && request.method === "POST") {
    try {
      const token = getAuthToken(request);
      if (!token) return json({ error: "unauthorized" }, 401);
      const body = (await request.json()) as Record<string, any>;
      const data = await updateMyNationality(token, String(body["region"] || body["country"] || "EG"));
      return json(data);
    } catch (e: any) {
      return json({ error: e?.message || "فشل تحديث الجنسية" }, 400);
    }
  }

  if (path === "/api/admin/merchants/toggle" && request.method === "POST") {
    try {
      const token = getAuthToken(request);
      if (!token) return json({ error: "unauthorized" }, 401);
      const body = (await request.json()) as Record<string, any>;
      const data = await adminToggleMerchantStatus(
        token,
        String(body["merchant_id"] || body["merchantId"] || ""),
        Boolean(body["is_active"] ?? body["isActive"]),
      );
      return json(data);
    } catch (e: any) {
      return json({ error: e?.message || "فشل تحديث حالة التاجر" }, 400);
    }
  }

  if (path === "/api/admin/merchants/credit" && request.method === "POST") {
    try {
      const token = getAuthToken(request);
      if (!token) return json({ error: "unauthorized" }, 401);
      const body = await request.json();
      const data = await adminCreditMerchant(token, body);
      return json(data);
    } catch (e: any) {
      return json({ error: e?.message || "failed" }, 400);
    }
  }

  if (path === "/api/admin/merchants/margin" && request.method === "POST") {
    try {
      const token = getAuthToken(request);
      if (!token) return json({ error: "unauthorized" }, 401);
      const body = await request.json();
      const data = await adminSetMerchantMargin(token, body);
      return json(data);
    } catch (e: any) {
      return json({ error: e?.message || "failed" }, 400);
    }
  }

  if (path === "/api/admin/orders" && request.method === "GET") {
    try {
      const token = getAuthToken(request);
      if (!token) return json({ error: "unauthorized" }, 401);
      const limit = parseInt(url.searchParams.get("limit") || "30", 10);
      const data = await adminListRecentOrders(token, limit);
      return json(data);
    } catch (e: any) {
      const msg = e?.message || "failed";
      return json({ error: msg }, msg.includes("forbidden") ? 403 : 400);
    }
  }

  if (path === "/api/admin/settings/egp-rate" && request.method === "POST") {
    try {
      const token = getAuthToken(request);
      if (!token) return json({ error: "unauthorized" }, 401);
      const body = (await request.json()) as { egp_rate?: number };
      const data = await adminUpdateEgpRate(token, Number(body.egp_rate));
      return json(data);
    } catch (e: any) {
      return json({ error: e?.message || "failed" }, 400);
    }
  }

  if (path === "/api/me" && request.method === "GET") {
    try {
      const token = getAuthToken(request);
      if (!token) return json({ error: "unauthorized" }, 401);
      const data = await getMyProfile(token);
      return json(data);
    } catch (e: any) {
      return json({ error: e?.message || "failed" }, 401);
    }
  }

  if (path === "/api/status" && request.method === "GET") {
    const [fazer, store] = await Promise.all([
      FazerCardsService.checkAccount(),
      getStoreData().catch(() => null),
    ]);
    await persistFazerAccountBalance(fazer);
    return json({
      fazer,
      fazer_balance: fazer.connected ? (fazer.balance ?? store?.settings?.fazer_balance ?? null) : (store?.settings?.fazer_balance ?? null),
      fazer_balance_currency: fazer.currency ?? store?.settings?.fazer_balance_currency ?? "USD",
      egp_rate: store?.settings?.egp_rate,
      fx_rates: store?.settings?.fx_rates,
      fx_updated_at: store?.settings?.fx_updated_at ?? null,
      packages_synced_at: store?.settings?.packages_synced_at,
      fazer_balance_updated_at: fazer.connected
        ? new Date().toISOString()
        : (store?.settings?.fazer_balance_updated_at ?? null),
    });
  }

  return null;
}
