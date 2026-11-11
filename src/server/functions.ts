import { createServerFn } from "@tanstack/react-start";
import { FazerCardsService } from "./fazercards.service";
import { getStoreData, submitCustomerOrder, syncFazerPackagesAndBalance } from "./store.service";

export const validatePlayerFn = createServerFn({ method: "POST" })
  .validator((data: { userId: string; zoneId?: string; gameId?: string; region?: string }) => data)
  .handler(async ({ data }) => {
    return await FazerCardsService.validatePlayer(data.userId, data.zoneId, data.gameId, data.region);
  });

export const executeTopUpFn = createServerFn({ method: "POST" })
  .validator((data: { offerId: string; playerId: string; zoneId?: string; gameId?: string; region?: string; idempotencyKey?: string }) => data)
  .handler(async ({ data }) => {
    return await FazerCardsService.executeTopUp(data);
  });

export const checkSystemStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const fazer = await FazerCardsService.checkAccount();
  const store = await getStoreData().catch(() => null);
  return {
    fazer,
    egp_rate: store?.settings?.egp_rate,
    packages_synced_at: store?.settings?.packages_synced_at,
  };
});

export const getStoreFn = createServerFn({ method: "GET" })
  .validator((data: { gameId?: string } | undefined) => data)
  .handler(async ({ data }) => {
    return await getStoreData(data?.gameId);
  });

export const submitOrderFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    return await submitCustomerOrder(data, data?.token);
  });

export const syncFazerFn = createServerFn({ method: "POST" })
  .validator((data: { token?: string; secret?: string } | undefined) => data)
  .handler(async ({ data }) => {
    return await syncFazerPackagesAndBalance({ token: data?.token, secret: data?.secret });
  });
