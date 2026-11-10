import { createServerFn } from "@tanstack/react-start";
import { FazerCardsService } from "./fazercards.service";
import { BinancePayService } from "./binancepay.service";

export const validatePlayerFn = createServerFn({ method: "POST" })
  .validator((data: { userId: string; zoneId: string }) => data)
  .handler(async ({ data }) => {
    return await FazerCardsService.validatePlayer(data.userId, data.zoneId);
  });

export const createPaymentOrderFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      merchantTradeNo?: string;
      orderAmount: number;
      currency?: string;
      goodsTitle: string;
      goodsDetail?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return await BinancePayService.createOrder(data);
  });

export const checkPaymentStatusFn = createServerFn({ method: "POST" })
  .validator((data: { merchantTradeNo: string }) => data)
  .handler(async ({ data }) => {
    return await BinancePayService.queryOrder(data.merchantTradeNo);
  });

export const executeTopUpFn = createServerFn({ method: "POST" })
  .validator(
    (data: { offerId: string; playerId: string; zoneId: string; idempotencyKey?: string }) => data,
  )
  .handler(async ({ data }) => {
    return await FazerCardsService.executeTopUp(data);
  });

export const checkSystemStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const fazer = await FazerCardsService.checkAccount();
  const binanceConfigured = BinancePayService.isConfigured();
  return {
    fazer,
    binance: {
      configured: binanceConfigured,
    },
  };
});
