import {
  PlayerValidationResult,
  BinanceOrderCreateResponse,
  BinanceOrderStatusResponse,
  FazerTopUpResponse,
} from "../types/store";

export async function validatePlayerApi(
  userId: string,
  zoneId: string,
): Promise<PlayerValidationResult> {
  const res = await fetch("/api/fzr/validate-id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, zoneId }),
  });
  return await res.json();
}

export async function createPaymentOrderApi(data: {
  merchantTradeNo?: string;
  orderAmount: number;
  currency?: string;
  goodsTitle: string;
  goodsDetail?: string;
}): Promise<BinanceOrderCreateResponse> {
  const res = await fetch("/api/binance/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return await res.json();
}

export async function checkPaymentStatusApi(
  merchantTradeNo: string,
): Promise<BinanceOrderStatusResponse> {
  const res = await fetch("/api/binance/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchantTradeNo }),
  });
  return await res.json();
}

export async function executeTopUpApi(data: {
  offerId: string;
  playerId: string;
  zoneId: string;
  idempotencyKey?: string;
}): Promise<FazerTopUpResponse> {
  const res = await fetch("/api/fzr/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return await res.json();
}

export async function checkSystemStatusApi(): Promise<{
  fazer?: { connected: boolean; balance?: number; currency?: string; message?: string };
  binance?: { configured: boolean };
}> {
  const res = await fetch("/api/status", {
    method: "GET",
  });
  return await res.json();
}
