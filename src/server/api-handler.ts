import { FazerCardsService } from "./fazercards.service";
import { BinancePayService } from "./binancepay.service";

export async function handleApiRoute(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  // JSON helper
  const json = (data: unknown, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  };

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

  // --- FazerCards Routes (/api/fzr/*) ---
  if (path === "/api/fzr/me" && request.method === "GET") {
    const result = await FazerCardsService.checkAccount();
    return json(result);
  }

  if (path === "/api/fzr/validate-id" && request.method === "POST") {
    try {
      const body = await request.json();
      const result = await FazerCardsService.validatePlayer(
        body.userId || body.player_id,
        body.zoneId || body.zone_id,
      );
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
        idempotencyKey: body.idempotencyKey,
      });
      return json(result);
    } catch {
      return json({ success: false, error: "Invalid JSON body" }, 400);
    }
  }

  // --- Binance Pay Routes (/api/binance/*) ---
  if (path === "/api/binance/order" && request.method === "POST") {
    try {
      const body = await request.json();
      const result = await BinancePayService.createOrder({
        merchantTradeNo: body.merchantTradeNo,
        orderAmount: Number(body.orderAmount || body.amount || 0),
        currency: body.currency || "USDT",
        goodsTitle: body.goodsTitle || "MLBB Diamonds Top-Up",
        goodsDetail: body.goodsDetail,
      });
      return json(result);
    } catch {
      return json({ success: false, error: "Invalid JSON body" }, 400);
    }
  }

  if (path === "/api/binance/query" && request.method === "POST") {
    try {
      const body = await request.json();
      const result = await BinancePayService.queryOrder(body.merchantTradeNo);
      return json(result);
    } catch {
      return json({ success: false, error: "Invalid JSON body" }, 400);
    }
  }

  if (path === "/api/status" && request.method === "GET") {
    const fazer = await FazerCardsService.checkAccount();
    const binanceConfigured = BinancePayService.isConfigured();
    return json({
      fazer,
      binance: { configured: binanceConfigured },
    });
  }

  return null;
}
