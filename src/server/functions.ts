import { createServerFn } from "@tanstack/react-start";
import { FazerCardsService } from "./fazercards.service";
import { getStoreData, persistFazerAccountBalance, submitCustomerOrder, syncFazerPackagesAndBalance } from "./store.service";

export const validatePlayerFn = createServerFn({ method: "POST" })
  .validator(
    (data: { userId: string; zoneId?: string | undefined; gameId?: string | undefined; region?: string | undefined }) =>
      data,
  )
  .handler(async ({ data }) => {
    return await FazerCardsService.validatePlayer(data.userId, data.zoneId, data.gameId, data.region);
  });

export const executeTopUpFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      offerId: string;
      playerId: string;
      zoneId?: string | undefined;
      gameId?: string | undefined;
      fazerCategoryId?: string | undefined;
      region?: string | undefined;
      idempotencyKey?: string | undefined;
    }) => data,
  )
  .handler(async ({ data }) => {
    return await FazerCardsService.executeTopUp(data);
  });

export const checkSystemStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const [fazer, store] = await Promise.all([
    FazerCardsService.checkAccount(),
    getStoreData().catch(() => null),
  ]);
  await persistFazerAccountBalance(fazer);
  return {
    fazer,
    fazer_balance: fazer.connected
      ? (fazer.balance ?? store?.settings?.fazer_balance ?? null)
      : (store?.settings?.fazer_balance ?? null),
    fazer_balance_currency: fazer.currency ?? store?.settings?.fazer_balance_currency ?? "USD",
    egp_rate: store?.settings?.egp_rate,
    packages_synced_at: store?.settings?.packages_synced_at,
    fazer_balance_updated_at: fazer.connected
      ? new Date().toISOString()
      : (store?.settings?.fazer_balance_updated_at ?? null),
  };
});

export const getStoreFn = createServerFn({ method: "GET" })
  .validator((data: { gameId?: string | undefined } | undefined) => data)
  .handler(async ({ data }) => {
    return await getStoreData(data?.gameId);
  });

export const submitOrderFn = createServerFn({ method: "POST" })
  .validator((data: Record<string, any>) => data)
  .handler(async ({ data }) => {
    return await submitCustomerOrder(data, typeof data?.["token"] === "string" ? data["token"] : undefined);
  });

export const syncFazerFn = createServerFn({ method: "POST" })
  .validator((data: { token?: string | null | undefined; secret?: string | null | undefined } | undefined) => data)
  .handler(async ({ data }) => {
    return await syncFazerPackagesAndBalance({
      token: data?.token ?? null,
      secret: data?.secret ?? null,
    });
  });
