import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { FazerCardsService } from "./fazercards.service";
import {
  DEFAULT_EGP_RATE,
  DEFAULT_MERCHANT_MARKUP,
  DEFAULT_RETAIL_MARKUP,
  calcMerchantBasePriceEgp,
  calcMerchantUnitPriceEgp,
  calcRetailPriceEgp,
} from "../lib/pricing";

function readEnv(name: string): string {
  return (process.env[name] || "").trim();
}

function getEnv(...names: string[]): string {
  for (const name of names) {
    const v = readEnv(name) || readEnv(`VITE_${name}`);
    if (v) return v;
  }
  return "";
}

function decodeJwtRef(token: string): string | null {
  if (!token || !token.startsWith("eyJ")) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = Buffer.from(base64, "base64").toString("utf8");
    const payload = JSON.parse(jsonStr) as { ref?: unknown };
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

function extractUrlRef(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const sub = host.split(".")[0];
    return sub || null;
  } catch {
    return null;
  }
}

export function resolveSupabaseConfig(): {
  url: string;
  anonKey: string;
  serviceKey: string;
} {
  // Prioritize M_TOO_ (Vercel Supabase integration prefix) and NEXT_PUBLIC_ over default .env Lovable values
  const urlCandidates = [
    readEnv("M_TOO_SUPABASE_URL"),
    readEnv("NEXT_PUBLIC_M_TOO_SUPABASE_URL"),
    readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    readEnv("SUPABASE_URL"),
    readEnv("VITE_SUPABASE_URL"),
  ].filter(Boolean);

  const serviceCandidates = [
    readEnv("M_TOO_SUPABASE_SERVICE_ROLE_KEY"),
    readEnv("M_TOO_SUPABASE_SECRET_KEY"),
    readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    readEnv("SUPABASE_SECRET_KEY"),
  ].filter(Boolean);

  const anonCandidates = [
    readEnv("M_TOO_SUPABASE_ANON_KEY"),
    readEnv("M_TOO_SUPABASE_PUBLISHABLE_KEY"),
    readEnv("NEXT_PUBLIC_M_TOO_SUPABASE_ANON_KEY"),
    readEnv("NEXT_PUBLIC_M_TOO_SUPABASE_PUBLISHABLE_KEY"),
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    readEnv("SUPABASE_ANON_KEY"),
    readEnv("SUPABASE_PUBLISHABLE_KEY"),
    readEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
  ].filter(Boolean);

  // If a JWT key exposes its project `ref`, match it to the right Supabase URL so .env Lovable URL never mixes with Vercel's key
  let url = urlCandidates[0] || "";
  const serviceKey = serviceCandidates[0] || "";
  const primaryRef = decodeJwtRef(serviceKey) || decodeJwtRef(anonCandidates[0] || "");
  if (primaryRef) {
    const matchingUrl = urlCandidates.find((u) => extractUrlRef(u) === primaryRef);
    if (matchingUrl) url = matchingUrl;
  }

  let anonKey = anonCandidates[0] || "";
  if (url) {
    const urlRef = extractUrlRef(url);
    if (urlRef) {
      const matchedAnon = anonCandidates.find((k) => {
        const ref = decodeJwtRef(k);
        return !ref || ref === urlRef;
      });
      if (matchedAnon) anonKey = matchedAnon;
    }
  }

  return { url, anonKey, serviceKey };
}

let cachedAdminClient: { key: string; client: SupabaseClient<Database> } | null = null;

export function getAdminClient(): SupabaseClient<Database> {
  const { url, serviceKey, anonKey } = resolveSupabaseConfig();
  const keyToUse = serviceKey || anonKey;
  if (!url || !keyToUse) {
    throw new Error("إعدادات قاعدة البيانات (Supabase) غير مكتملة على السيرفر");
  }
  const cacheKey = `${url}::${keyToUse.slice(0, 12)}`;
  if (cachedAdminClient && cachedAdminClient.key === cacheKey) {
    return cachedAdminClient.client;
  }
  const client = createClient<Database>(url, keyToUse, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cachedAdminClient = { key: cacheKey, client };
  return client;
}

function getAnonClient(): SupabaseClient<Database> {
  const { url, anonKey, serviceKey } = resolveSupabaseConfig();
  const keyToUse = anonKey || serviceKey;
  if (!url || !keyToUse) {
    throw new Error("إعدادات Supabase غير متوفرة");
  }
  return createClient<Database>(url, keyToUse, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getAuthedClient(token: string): SupabaseClient<Database> {
  const { url, anonKey, serviceKey } = resolveSupabaseConfig();
  const keyToUse = anonKey || serviceKey;
  if (!url || !keyToUse) {
    throw new Error("إعدادات Supabase غير متوفرة");
  }
  return createClient<Database>(url, keyToUse, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireUser(token: string) {
  const client = getAuthedClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) throw new Error("unauthorized");
  return { user: data.user, client };
}

async function requireAdmin(token: string) {
  const { user, client } = await requireUser(token);
  const adminSb = getAdminClient() as any;
  const { data: profile } = await adminSb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("forbidden");
  return { user, client };
}

export function getPublicAuthConfig() {
  const { url, anonKey } = resolveSupabaseConfig();
  return {
    supabaseUrl: url,
    supabaseAnonKey: anonKey,
    hasSupabase: Boolean(url && anonKey),
  };
}

export async function loginWithPasswordServer(email: string, password: string) {
  const cleanEmail = email.trim();
  if (!cleanEmail || !password) {
    throw new Error("يرجى إدخال البريد الإلكتروني وكلمة المرور");
  }
  const anon = getAnonClient();
  const { data, error } = await anon.auth.signInWithPassword({ email: cleanEmail, password });
  if (error || !data.session || !data.user) {
    throw new Error(error?.message || "بيانات الدخول غير صحيحة");
  }

  const sba = getAdminClient() as any;
  const { data: profile } = await sba.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  const { data: merchant } = await sba.from("merchant_accounts").select("*").eq("user_id", data.user.id).maybeSingle();

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    user: { id: data.user.id, email: data.user.email ?? cleanEmail },
    profile: profile || null,
    merchant: merchant
      ? {
          id: merchant.id,
          balance_egp: Number(merchant.balance_egp || 0),
          margin_percent: Number(merchant.margin_percent || 0),
          is_active: !!merchant.is_active,
        }
      : null,
  };
}

export async function refreshSessionServer(refreshToken: string) {
  if (!refreshToken) throw new Error("unauthorized");
  const anon = getAnonClient();
  const { data, error } = await anon.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user) {
    throw new Error("unauthorized");
  }
  const sba = getAdminClient() as any;
  const { data: profile } = await sba.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  const { data: merchant } = await sba.from("merchant_accounts").select("*").eq("user_id", data.user.id).maybeSingle();

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    user: { id: data.user.id, email: data.user.email ?? null },
    profile: profile || null,
    merchant: merchant
      ? {
          id: merchant.id,
          balance_egp: Number(merchant.balance_egp || 0),
          margin_percent: Number(merchant.margin_percent || 0),
          is_active: !!merchant.is_active,
        }
      : null,
  };
}

let inFlightSync: Promise<any> | null = null;

async function syncFazerInternal() {
  if (inFlightSync) return inFlightSync;
  inFlightSync = (async () => {
    const sb = getAdminClient() as any;
    const account = await FazerCardsService.checkAccount();
    const catalog = await FazerCardsService.fetchCatalog();
    const nowIso = new Date().toISOString();
    const updates: Record<string, any> = { updated_at: nowIso };
    if (account.connected) {
      updates["fazer_balance"] = account.balance ?? null;
      updates["fazer_balance_currency"] = account.currency ?? "USD";
      updates["fazer_balance_updated_at"] = nowIso;
    }

    let upserted = 0;
    let upsertError: string | null = null;
    if (catalog.ok && catalog.products.length) {
      const rows = catalog.products.map((p) => ({
        offer_id: p.offer_id,
        game_id: p.game_id || "mlbb",
        category: p.category || "diamonds",
        name: p.name,
        diamonds: p.diamonds || 0,
        bonus_diamonds: p.bonus_diamonds || 0,
        currency_name: p.currency_name || null,
        cost_usd: p.cost_usd ?? null,
        regions: p.regions ?? null,
        active: p.active !== false,
        raw: p.raw ?? null,
        updated_at: nowIso,
      }));
      const { error } = await sb.from("fazer_packages").upsert(rows, { onConflict: "offer_id" });
      if (!error) {
        upserted = rows.length;
        updates["packages_synced_at"] = nowIso;
        // Deactivate legacy or removed offer_ids so stale un-prefixed entries don't duplicate
        if (rows.length >= 20) {
          const syncedSet = new Set(rows.map((r) => r.offer_id));
          const { data: existingRows } = await sb.from("fazer_packages").select("offer_id").eq("active", true);
          const staleIds = (existingRows || [])
            .map((r: any) => String(r.offer_id || ""))
            .filter((id: string) => id && !syncedSet.has(id));
          if (staleIds.length) {
            await sb.from("fazer_packages").update({ active: false, updated_at: nowIso }).in("offer_id", staleIds);
          }
        }
      } else {
        upsertError = error.message;
      }
    }

    await sb.from("store_settings").update(updates).eq("id", 1);

    const gamesBreakdown = catalog.products.reduce((acc: Record<string, number>, p) => {
      const g = p.game_id || "mlbb";
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {});

    return {
      ok: true,
      account,
      catalog: {
        ok: catalog.ok,
        count: upserted,
        gamesBreakdown,
        message: upsertError || catalog.message,
      },
      settings: updates,
    };
  })();

  try {
    return await inFlightSync;
  } finally {
    inFlightSync = null;
  }
}

export async function persistFazerAccountBalance(account: {
  connected: boolean;
  balance?: number | undefined;
  currency?: string | undefined;
}) {
  if (!account.connected || account.balance === undefined) return;
  try {
    const sb = getAdminClient() as any;
    const nowIso = new Date().toISOString();
    await sb
      .from("store_settings")
      .update({
        fazer_balance: account.balance,
        fazer_balance_currency: account.currency || "USD",
        fazer_balance_updated_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", 1);
  } catch {
    // Non-fatal if DB is unreachable or not configured locally
  }
}

export async function getStoreData(gameId?: string) {
  const sb = getAdminClient() as any;
  let { data: settingsRow } = await sb.from("store_settings").select("*").eq("id", 1).maybeSingle();
  let egpRate = Number(settingsRow?.egp_rate || DEFAULT_EGP_RATE);

  let q = sb
    .from("fazer_packages")
    .select("*")
    .eq("active", true)
    .order("diamonds", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (gameId) q = q.eq("game_id", gameId);
  let { data: pkgs } = await q;

  // Check if packages are empty OR missing games while stale
  const distinctGames = new Set((pkgs || []).map((p: any) => p.game_id));
  const lastSyncMs = settingsRow?.packages_synced_at ? Date.parse(settingsRow.packages_synced_at) : 0;
  const syncStale = !lastSyncMs || Date.now() - lastSyncMs > 5 * 60 * 1000;
  if ((!pkgs || pkgs.length === 0 || (!gameId && distinctGames.size < 4 && syncStale)) && readEnv("FAZER_API_KEY")) {
    try {
      await syncFazerInternal();
      const s2 = await sb.from("store_settings").select("*").eq("id", 1).maybeSingle();
      settingsRow = s2.data || settingsRow;
      egpRate = Number(settingsRow?.egp_rate || DEFAULT_EGP_RATE);
      let q2 = sb
        .from("fazer_packages")
        .select("*")
        .eq("active", true)
        .order("diamonds", { ascending: true })
        .order("updated_at", { ascending: false })
        .limit(1000);
      if (gameId) q2 = q2.eq("game_id", gameId);
      pkgs = (await q2).data || pkgs;
    } catch {
      // Ignore sync error, return current cached packages
    }
  }

  const packages = (pkgs || []).map((p: any) => {
    const costUsd = Number(p.cost_usd || 0);
    const retail = costUsd > 0 ? calcRetailPriceEgp(costUsd, egpRate, DEFAULT_RETAIL_MARKUP) : 0;
    const merchantBase = costUsd > 0 ? calcMerchantBasePriceEgp(costUsd, egpRate, DEFAULT_MERCHANT_MARKUP) : 0;
    const rawCategoryId =
      p.raw && typeof p.raw === "object" && typeof p.raw.fazer_category_id === "string"
        ? p.raw.fazer_category_id
        : undefined;
    return {
      id: p.offer_id,
      offerId: p.offer_id,
      gameId: p.game_id,
      fazerCategoryId: rawCategoryId,
      name: p.name,
      category: p.category || "diamonds",
      diamonds: Number(p.diamonds || 0),
      bonusDiamonds: Number(p.bonus_diamonds || 0),
      currencyName: p.currency_name || undefined,
      costUsd,
      retailPriceEgp: retail,
      merchantBasePriceEgp: merchantBase,
      regions: Array.isArray(p.regions) ? p.regions : null,
      active: !!p.active,
      raw: p.raw || null,
    };
  });

  return {
    success: true,
    packages,
    settings: {
      egp_rate: egpRate,
      fazer_balance: settingsRow?.fazer_balance ?? null,
      fazer_balance_currency: settingsRow?.fazer_balance_currency ?? null,
      fazer_balance_updated_at: settingsRow?.fazer_balance_updated_at ?? null,
      packages_synced_at: settingsRow?.packages_synced_at ?? null,
      global_retail_markup_percent: DEFAULT_RETAIL_MARKUP * 100,
    },
  };
}

export async function syncFazerPackagesAndBalance(opts: { token?: string | null | undefined; secret?: string | null | undefined }) {
  const cronSecret = getEnv("CRON_SECRET", "SYNC_SECRET");
  const isCron = Boolean(opts.secret && cronSecret && opts.secret === cronSecret);
  if (!isCron) {
    if (!opts.token) return { ok: false, error: "unauthorized" };
    try {
      await requireAdmin(opts.token);
    } catch (e: any) {
      return { ok: false, error: e?.message || "forbidden" };
    }
  }
  return await syncFazerInternal();
}

function normalizeRegion(r?: string | null) {
  return (r || "").trim().toLowerCase();
}

async function issueMerchantRefund(
  sb: any,
  merchantId: string,
  amount: number,
  orderRef: string,
  note: string,
) {
  if (!(amount > 0)) return;
  try {
    const { error } = await sb.rpc("refund_merchant_for_order", {
      p_merchant_id: merchantId,
      p_amount: amount,
      p_order_ref: orderRef,
      p_note: note,
    });
    if (!error) return;
  } catch {
    // fallback if RPC is not installed yet on an older Supabase schema
  }

  try {
    const { data: existingRefund } = await sb
      .from("wallet_ledger")
      .select("id")
      .eq("merchant_id", merchantId)
      .eq("entry_type", "refund")
      .eq("reference_id", orderRef)
      .maybeSingle();
    if (existingRefund) return;

    const { data: mRow } = await sb
      .from("merchant_accounts")
      .select("balance_egp")
      .eq("id", merchantId)
      .maybeSingle();
    if (!mRow) return;

    const nextBal = Math.round((Number(mRow.balance_egp || 0) + amount) * 100) / 100;
    await sb
      .from("merchant_accounts")
      .update({ balance_egp: nextBal, updated_at: new Date().toISOString() })
      .eq("id", merchantId);
    await sb.from("wallet_ledger").insert({
      merchant_id: merchantId,
      amount,
      entry_type: "refund",
      reference_type: "order",
      reference_id: orderRef,
      balance_after: nextBal,
      note,
    });
  } catch (err) {
    console.error("Failed to refund merchant wallet:", err);
  }
}

export async function submitCustomerOrder(body: any, token?: string | null) {
  const sb = getAdminClient() as any;
  const rawItems: Array<{ offerId?: string; packageId?: string; qty: number }> = Array.isArray(body?.items)
    ? body.items
    : [];
  const items = rawItems
    .map((i) => ({
      offerId: String(i.offerId || i.packageId || "").trim(),
      qty: Math.max(1, Math.min(20, Number(i.qty || 1))),
    }))
    .filter((i) => i.offerId);

  const playerId = String(body?.playerId || "").trim();
  const zoneId = String(body?.zoneId || "").trim();
  const gameId = String(body?.gameId || "mlbb");
  const region = String(body?.region || "").trim() || "global";
  const asMerchant = Boolean(body?.asMerchant);

  if (!playerId) return { success: false, error: "يرجى إدخال معرف اللاعب" };
  if (!items.length) return { success: false, error: "يرجى اختيار باقة واحدة على الأقل" };

  let userId: string | null = null;
  let merchant: any = null;
  if (token) {
    try {
      const { user } = await requireUser(token);
      userId = user.id;
      const { data: m } = await sb
        .from("merchant_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      merchant = m;
    } catch {
      // Guest customer order is allowed
    }
  }
  if (asMerchant && !merchant) {
    return { success: false, error: "حساب التاجر غير موجود أو موقوف. سجّل الدخول بحساب تاجر مفعل." };
  }

  const offerIds = Array.from(new Set(items.map((i) => i.offerId)));
  const { data: pkgs } = await sb.from("fazer_packages").select("*").in("offer_id", offerIds).eq("active", true);
  const byId = new Map<string, any>((pkgs || []).map((p: any) => [p.offer_id, p]));
  if (byId.size !== offerIds.length) {
    return { success: false, error: "بعض الباقات غير متاحة حالياً، حدّث الصفحة وحاول مرة أخرى." };
  }

  const itemGames = Array.from(new Set(offerIds.map((id) => byId.get(id)?.game_id || gameId)));
  if (itemGames.length > 1) {
    return { success: false, error: "لا يمكن الدمج بين باقات ألعاب مختلفة في طلب واحد. أتمم شحن كل لعبة على حدة." };
  }
  const effectiveGameId = itemGames[0] || gameId;

  const { data: settingsRow } = await sb.from("store_settings").select("*").eq("id", 1).maybeSingle();
  const egpRate = Number(settingsRow?.egp_rate || DEFAULT_EGP_RATE);

  for (const it of items) {
    const p = byId.get(it.offerId);
    const pregions = Array.isArray(p?.regions) ? p.regions.map(normalizeRegion) : [];
    const normReqRegion = normalizeRegion(region);
    if (
      pregions.length &&
      normReqRegion &&
      normReqRegion !== "global" &&
      normReqRegion !== "all" &&
      !pregions.includes(normReqRegion)
    ) {
      return { success: false, error: `الباقة "${p.name}" غير متاحة لمنطقة ${region}.` };
    }
  }

  const firstPkg = byId.get(offerIds[0]!);
  const validationCategoryId =
    firstPkg?.raw && typeof firstPkg.raw === "object" && typeof firstPkg.raw.fazer_category_id === "string"
      ? firstPkg.raw.fazer_category_id
      : undefined;

  const validation = await FazerCardsService.validatePlayer(
    playerId,
    zoneId,
    effectiveGameId,
    region === "global" || region === "all" ? undefined : region,
    validationCategoryId,
  );
  if (!validation.valid) {
    return { success: false, error: validation.error || "تعذر التحقق من معرف اللاعب" };
  }
  const accRegion = validation.accountRegion || null;
  if (
    accRegion &&
    region !== "global" &&
    region !== "all" &&
    normalizeRegion(accRegion) &&
    normalizeRegion(accRegion) !== normalizeRegion(region)
  ) {
    return {
      success: false,
      error: `منطقة الحساب (${accRegion}) لا تطابق المنطقة المختارة (${region}).`,
    };
  }

  const merchantMargin = merchant ? Number(merchant.margin_percent || 0) : 0;
  const orderItems = items.map((it) => {
    const p = byId.get(it.offerId);
    const costUsd = Number(p.cost_usd || 0);
    const merchantBase = calcMerchantBasePriceEgp(costUsd, egpRate, DEFAULT_MERCHANT_MARKUP);
    const unitPrice = asMerchant
      ? calcMerchantUnitPriceEgp(merchantBase, merchantMargin, costUsd, egpRate, DEFAULT_MERCHANT_MARKUP)
      : calcRetailPriceEgp(costUsd, egpRate, DEFAULT_RETAIL_MARKUP);
    const catId =
      p.raw && typeof p.raw === "object" && typeof p.raw.fazer_category_id === "string"
        ? p.raw.fazer_category_id
        : undefined;
    const rawFazerOfferId =
      p.raw && typeof p.raw === "object" && typeof p.raw.fazer_offer_id === "string"
        ? p.raw.fazer_offer_id
        : FazerCardsService.splitCompositeOfferId(String(p.offer_id)).rawOfferId;
    return {
      package_id: p.offer_id,
      fazer_offer_id: rawFazerOfferId,
      fazer_category_id: catId,
      name: p.name,
      qty: it.qty,
      unit_price_egp: unitPrice,
      unit_cost_usd: costUsd,
      diamonds: Number(p.diamonds || 0),
      bonus_diamonds: Number(p.bonus_diamonds || 0),
      game_id: p.game_id || effectiveGameId,
      region,
    };
  });

  const total = orderItems.reduce((s, i) => s + i.unit_price_egp * i.qty, 0);
  const orderRef = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const { data: order, error: oerr } = await sb
    .from("orders")
    .insert({
      order_ref: orderRef,
      user_id: userId,
      merchant_id: asMerchant ? merchant?.id : null,
      player_id: playerId,
      zone_id: zoneId || null,
      game_id: effectiveGameId,
      region,
      account_region: accRegion,
      status: "processing",
      total_egp: total,
      items: orderItems,
    })
    .select()
    .single();
  if (oerr) return { success: false, error: oerr.message };

  let updatedBalance: number | undefined;
  if (asMerchant) {
    const { data: dData, error: derr } = await sb.rpc("debit_merchant_for_order", {
      p_merchant_id: merchant.id,
      p_amount: total,
      p_order_ref: orderRef,
      p_note: `خصم طلب شحن ${orderRef}`,
    });
    if (derr) {
      await sb.from("orders").update({ status: "failed", error_message: derr.message }).eq("id", order.id);
      return {
        success: false,
        error: derr.message === "insufficient_balance" ? "رصيد المحفظة غير كافٍ لإتمام الطلب." : derr.message,
        order_ref: orderRef,
      };
    }
    if (Array.isArray(dData) && dData[0]?.new_balance != null) {
      updatedBalance = Number(dData[0].new_balance);
    }
  }

  let succeededCount = 0;
  let failedCount = 0;
  let failedAmount = 0;
  const txIds: string[] = [];
  let lastErr: string | null = null;
  let lastRemainingFazer: number | undefined;
  const responses: any[] = [];

  for (const it of orderItems) {
    for (let q = 0; q < it.qty; q++) {
      const res = await FazerCardsService.executeTopUp({
        offerId: it.fazer_offer_id,
        playerId,
        zoneId,
        gameId: it.game_id,
        fazerCategoryId: it.fazer_category_id,
        region,
        idempotencyKey: `${orderRef}-${it.fazer_offer_id}-${q}`,
      });
      responses.push({ item: it.fazer_offer_id, q, res });
      if (res.success) {
        succeededCount++;
        if (res.transactionId) txIds.push(res.transactionId);
        if (typeof res.balanceRemaining === "number") lastRemainingFazer = res.balanceRemaining;
      } else {
        failedCount++;
        failedAmount += it.unit_price_egp;
        lastErr = res.error || "فشل تنفيذ الشحن لدى المزود";
      }
    }
  }

  if (lastRemainingFazer !== undefined) {
    await persistFazerAccountBalance({ connected: true, balance: lastRemainingFazer, currency: "USD" });
  }

  const allOk = failedCount === 0 && succeededCount > 0;
  let finalStatus: "success" | "failed" | "incomplete";
  if (allOk) {
    finalStatus = "success";
  } else if (asMerchant) {
    finalStatus = succeededCount > 0 ? "incomplete" : "failed";
    if (failedAmount > 0) {
      await issueMerchantRefund(
        sb,
        merchant.id,
        failedAmount,
        orderRef,
        succeededCount > 0
          ? `استرداد جزئي للوحدات غير المنفذة من طلب ${orderRef}`
          : `استرداد كامل بسبب فشل التنفيذ للطلب ${orderRef}`,
      );
      if (updatedBalance !== undefined) {
        updatedBalance = Math.round((updatedBalance + failedAmount) * 100) / 100;
      }
    }
  } else {
    finalStatus = succeededCount > 0 ? "incomplete" : "failed";
  }

  await sb
    .from("orders")
    .update({
      status: finalStatus,
      fazer_transaction_id: txIds.join(",") || null,
      fazer_response: responses,
      error_message: lastErr,
      delivered_at: allOk ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  return {
    success: allOk || finalStatus === "incomplete",
    order_ref: orderRef,
    status: finalStatus,
    total_egp: total,
    refunded_egp: asMerchant && failedAmount > 0 ? failedAmount : 0,
    balance_egp: updatedBalance,
    transaction_ids: txIds,
    player_name: validation.username,
    account_region: accRegion,
    error: lastErr,
    message: asMerchant
      ? allOk
        ? "تم خصم الرصيد وتنفيذ الشحن بنجاح."
        : succeededCount > 0
          ? `تم تنفيذ جزء من الطلب واسترداد ${failedAmount} ج.م للباقي تلقائياً.`
          : "فشل تنفيذ الشحن وتم استرداد المبلغ بالكامل إلى محفظة التاجر تلقائياً."
      : allOk
        ? "تم تنفيذ الشحن بنجاح."
        : "تعذر إكمال التنفيذ الفوري، تم حفظ الطلب للمراجعة.",
  };
}

export async function getMerchantDashboard(token: string) {
  const { user, client } = await requireUser(token);
  const sbUser = client as any;
  const sb = getAdminClient() as any;
  const { data: profile } = await sbUser.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const { data: merchant } = await sb.from("merchant_accounts").select("*").eq("user_id", user.id).maybeSingle();
  if (!merchant) return { profile, merchant: null, stats: null, orders: [], transactions: [] };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();
  const { data: orders } = await sb
    .from("orders")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const { data: ledger } = await sb
    .from("wallet_ledger")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const list = orders || [];
  const stats = {
    balance_egp: Number(merchant.balance_egp || 0),
    margin_percent: Number(merchant.margin_percent || 0),
    orders_today: list.filter((o: any) => o.created_at >= todayIso).length,
    delivered_today: list.filter(
      (o: any) => o.status === "success" && (o.delivered_at || o.updated_at || o.created_at) >= todayIso,
    ).length,
    incomplete_orders: list.filter((o: any) => ["pending", "processing", "incomplete", "failed"].includes(o.status)).length,
  };
  return { profile, merchant, stats, orders: list, transactions: ledger || [] };
}

export async function adminListMerchants(token: string, opts: { page: number; limit: number; q?: string }) {
  await requireAdmin(token);
  const sb = getAdminClient() as any;
  const page = Math.max(1, opts.page || 1);
  const limit = Math.min(50, Math.max(1, opts.limit || 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: merchants, count } = await sb
    .from("merchant_accounts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const userIds = (merchants || []).map((m: any) => m.user_id);
  const { data: profiles } = userIds.length
    ? await sb.from("profiles").select("id,full_name,phone,region,role").in("id", userIds)
    : { data: [] };
  const pmap = new Map((profiles || []).map((p: any) => [p.id, p]));

  // Attach emails via auth admin API if available
  const emailMap = new Map<string, string>();
  try {
    const authAdmin = (sb as SupabaseClient<Database>).auth?.admin;
    if (authAdmin && typeof authAdmin.listUsers === "function") {
      const { data: usersRes } = await authAdmin.listUsers({ page: 1, perPage: 200 });
      for (const u of usersRes?.users || []) {
        if (u.email) emailMap.set(u.id, u.email);
      }
    }
  } catch {
    // Non-fatal if listUsers isn't permitted
  }

  const q = (opts.q || "").trim().toLowerCase();
  let rows = (merchants || []).map((m: any) => ({
    ...m,
    balance_egp: Number(m.balance_egp || 0),
    margin_percent: Number(m.margin_percent || 0),
    profile: pmap.get(m.user_id) || null,
    email: emailMap.get(m.user_id) || null,
  }));
  if (q) {
    rows = rows.filter(
      (r: any) =>
        (r.profile?.full_name || "").toLowerCase().includes(q) ||
        (r.profile?.phone || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        r.user_id.includes(q) ||
        r.id.includes(q),
    );
  }

  return {
    merchants: rows,
    page,
    limit,
    total: count || 0,
    totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
  };
}

export async function adminCreditMerchant(token: string, body: any) {
  const { client } = await requireAdmin(token);
  const sbUser = client as any;
  const sbAdmin = getAdminClient() as any;
  const merchantId = body.merchant_id || body.merchantId;
  const amount = Number(body.amount);
  const note = body.note || "إضافة رصيد من الأدمن";
  if (!merchantId || !(amount > 0)) throw new Error("بيانات الشحن غير صحيحة");

  let res = await sbUser.rpc("admin_credit_merchant", {
    p_merchant_id: merchantId,
    p_amount: amount,
    p_note: note,
    p_reference_type: "admin",
    p_reference_id: null,
  });
  if (res.error) {
    res = await sbAdmin.rpc("admin_credit_merchant", {
      p_merchant_id: merchantId,
      p_amount: amount,
      p_note: note,
      p_reference_type: "admin",
      p_reference_id: null,
    });
  }
  if (res.error) throw new Error(res.error.message);
  return { success: true, result: res.data };
}

export async function adminSetMerchantMargin(token: string, body: any) {
  const { client } = await requireAdmin(token);
  const sbUser = client as any;
  const sbAdmin = getAdminClient() as any;
  const merchantId = body.merchant_id || body.merchantId;
  const margin = Number(body.margin_percent ?? body.marginPercent);
  if (!merchantId || !Number.isFinite(margin) || margin < 0 || margin > 50) {
    throw new Error("نسبة الخصم غير صالحة (0 - 50%)");
  }

  let res = await sbUser.rpc("admin_set_merchant_margin", {
    p_merchant_id: merchantId,
    p_margin_percent: margin,
  });
  if (res.error) {
    res = await sbAdmin.rpc("admin_set_merchant_margin", {
      p_merchant_id: merchantId,
      p_margin_percent: margin,
    });
  }
  if (res.error) throw new Error(res.error.message);
  return { success: true };
}

export async function adminCreateMerchant(
  token: string,
  body: {
    email: string;
    password: string;
    fullName?: string | undefined;
    phone?: string | undefined;
    marginPercent?: number | undefined;
    initialBalanceEgp?: number | undefined;
  },
) {
  await requireAdmin(token);
  const sb = getAdminClient();
  const sba = sb as any;

  const email = (body.email || "").trim().toLowerCase();
  const password = (body.password || "").trim();
  const fullName = (body.fullName || "تاجر معتمد").trim();
  const phone = (body.phone || "").trim() || null;
  const marginPercent = Math.min(50, Math.max(0, Number(body.marginPercent ?? 5) || 0));
  const initialBalanceEgp = Math.max(0, Number(body.initialBalanceEgp ?? 0) || 0);

  if (!email || !email.includes("@")) throw new Error("يرجى إدخال بريد إلكتروني صحيح");
  if (password.length < 6) throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");

  let targetUserId: string | null = null;
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (created?.user) {
    targetUserId = created.user.id;
  } else if (createErr) {
    // Check if user already exists, then update password + confirm email
    const { data: usersPage } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = usersPage?.users?.find((u) => (u.email || "").toLowerCase() === email);
    if (!existing) throw new Error(createErr.message);
    targetUserId = existing.id;
    await sb.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
  }

  if (!targetUserId) throw new Error("تعذر إنشاء حساب المستخدم للتاجر");

  await sba.from("profiles").upsert(
    {
      id: targetUserId,
      role: "merchant",
      full_name: fullName,
      phone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  const { data: existingMerchant } = await sba
    .from("merchant_accounts")
    .select("*")
    .eq("user_id", targetUserId)
    .maybeSingle();

  let merchantRow = existingMerchant;
  if (!merchantRow) {
    const { data: inserted, error: merr } = await sba
      .from("merchant_accounts")
      .insert({
        user_id: targetUserId,
        balance_egp: 0,
        margin_percent: marginPercent,
        is_active: true,
      })
      .select()
      .single();
    if (merr) throw new Error(merr.message);
    merchantRow = inserted;
  } else {
    const { data: updated } = await sba
      .from("merchant_accounts")
      .update({ margin_percent: marginPercent, is_active: true, updated_at: new Date().toISOString() })
      .eq("id", existingMerchant.id)
      .select()
      .single();
    if (updated) merchantRow = updated;
  }

  if (initialBalanceEgp > 0 && merchantRow?.id) {
    await adminCreditMerchant(token, {
      merchant_id: merchantRow.id,
      amount: initialBalanceEgp,
      note: "رصيد افتتاحي لحساب التاجر",
    });
    const { data: refreshed } = await sba
      .from("merchant_accounts")
      .select("*")
      .eq("id", merchantRow.id)
      .maybeSingle();
    if (refreshed) merchantRow = refreshed;
  }

  return {
    success: true,
    merchant: { ...merchantRow, email, profile: { id: targetUserId, role: "merchant", full_name: fullName, phone } },
    credentials: { email, password },
  };
}

export async function adminToggleMerchantStatus(token: string, merchantId: string, isActive: boolean) {
  await requireAdmin(token);
  if (!merchantId) throw new Error("معرف التاجر مطلوب");
  const sba = getAdminClient() as any;
  const { data, error } = await sba
    .from("merchant_accounts")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", merchantId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { success: true, merchant: data };
}

export async function adminListRecentOrders(token: string, limit = 30) {
  await requireAdmin(token);
  const sba = getAdminClient() as any;
  const { data, error } = await sba
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(100, Math.max(1, limit)));
  if (error) throw new Error(error.message);
  return { orders: data || [] };
}

export async function adminUpdateEgpRate(token: string, egpRate: number) {
  await requireAdmin(token);
  if (!(egpRate > 0)) throw new Error("سعر صرف غير صالح");
  const sb = getAdminClient() as any;
  const { error } = await sb
    .from("store_settings")
    .update({ egp_rate: egpRate, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  return { success: true, egp_rate: egpRate };
}

export async function getMyProfile(token: string) {
  const { user, client } = await requireUser(token);
  const sb = client as any;
  const sba = getAdminClient() as any;
  const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const { data: merchant } = await sba.from("merchant_accounts").select("*").eq("user_id", user.id).maybeSingle();
  return { user: { id: user.id, email: user.email }, profile, merchant };
}
