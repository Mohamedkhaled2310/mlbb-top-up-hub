import { FazerCardsService } from "./fazercards.service";
import {
  getStoreData,
  syncFazerPackagesAndBalance,
  submitCustomerOrder,
  getMerchantDashboard,
  adminListMerchants,
  adminCreditMerchant,
  adminSetMerchantMargin,
  adminUpdateEgpRate,
  getMyProfile,
} from "./store.service";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Public store data (packages from Fazer cache + egp rate)
  if (path === "/api/store" && request.method === "GET") {
    try {
      const gameId = url.searchParams.get("gameId") || undefined;
      const data = await getStoreData(gameId);
      return json(data);
    } catch (e: any) {
      return json({ success: false, error: e?.message || "Failed to load store" }, 500);
    }
  }

  // Sync Fazer catalog + balance (server-side, can be called by cron/Vercel)
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
    return json(await FazerCardsService.checkAccount());
  }

  if (path === "/api/fzr/validate-id" && request.method === "POST") {
    try {
      const body = await request.json();
      const result = await FazerCardsService.validatePlayer(
        body.userId || body.player_id,
        body.zoneId || body.zone_id,
        body.gameId || body.game_id || "mlbb",
        body.region,
      );
      // enforce region match if both provided
      const reqRegion = (body.region || "").trim().toLowerCase();
      const accRegion = ((result as any).accountRegion || "").trim().toLowerCase();
      if (reqRegion && accRegion && reqRegion !== accRegion) {
        return json({ ...result, valid: false, error: `منطقة الحساب (${result.accountRegion}) لا تطابق المنطقة المختارة (${body.region}).` });
      }
      return json(result);
    } catch {
      return json({ valid: false, error: "Invalid JSON body" }, 400);
    }
  }

  if (path === "/api/fzr/order" && request.method === "POST") {
    try {
      const body = await request.json();
      const result = await FazerCardsService.executeTopUp({
        offerId: body.offerId || body.offer_id,
        playerId: body.playerId || body.player_id,
        zoneId: body.zoneId || body.zone_id,
        gameId: body.gameId || body.game_id || "mlbb",
        region: body.region,
        idempotencyKey: body.idempotencyKey,
      });
      return json(result);
    } catch {
      return json({ success: false, error: "Invalid JSON body" }, 400);
    }
  }

  // Customer/merchant order submission (cart, multi-package). Merchant flow debits wallet atomically server-side.
  if (path === "/api/orders/submit" && request.method === "POST") {
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
      return json({ error: msg }, msg.includes("forbidden") ? 403 : 500);
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

  if (path === "/api/admin/settings/egp-rate" && request.method === "POST") {
    try {
      const token = getAuthToken(request);
      if (!token) return json({ error: "unauthorized" }, 401);
      const body = await request.json();
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
    const fazer = await FazerCardsService.checkAccount();
    const store = await getStoreData().catch(() => null);
    return json({
      fazer,
      egp_rate: store?.settings?.egp_rate,
      packages_synced_at: store?.settings?.packages_synced_at,
      fazer_balance_updated_at: store?.settings?.fazer_balance_updated_at,
    });
  }

  return null;
}
