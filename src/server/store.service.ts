import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { FazerCardsService } from "./fazercards.service";
import { getLiveUsdRates } from "./fx.service";
import { curateMlbbPackages } from "./mlbb-packages";
import {
  DEFAULT_EGP_RATE,
  DEFAULT_MERCHANT_MARKUP,
  DEFAULT_RETAIL_MARKUP,
  calcCostEgp,
  calcMerchantBasePriceEgp,
  calcMerchantUnitPriceEgp,
  calcRetailPriceEgp,
  round3,
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

const userTokenCache = new Map<string, { user: any; expires: number }>();

async function requireUser(token: string) {
  const cached = userTokenCache.get(token);
  if (cached && cached.expires > Date.now()) {
    const client = getAuthedClient(token);
    return { user: cached.user, client };
  }
  const client = getAuthedClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) throw new Error("unauthorized");
  userTokenCache.set(token, { user: data.user, expires: Date.now() + 60_000 });
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

  // Pre-cache token to speed up immediate subsequent API calls
  userTokenCache.set(data.session.access_token, { user: data.user, expires: Date.now() + 60_000 });

  const sba = getAdminClient() as any;
  const { data: profile } = await sba.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  let { data: merchant } = await sba.from("merchant_accounts").select("*").eq("user_id", data.user.id).maybeSingle();

  // If user is an admin and doesn't have a merchant account, auto-ensure one so they can access both portals
  if (!merchant && profile?.role === "admin") {
    const { data: newMerch } = await sba
      .from("merchant_accounts")
      .insert({
        user_id: data.user.id,
        balance_egp: 50000,
        margin_percent: 0,
        is_active: true,
      })
      .select()
      .maybeSingle();
    if (newMerch) merchant = newMerch;
  }

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

const NOISY_MLBB_TIERS = new Set([
  "10_1_diamonds",
  "12_diamonds",
  "14_diamonds",
  "19_diamonds",
  "20_2_diamonds",
  "28_diamonds",
  "42_diamonds",
  "51_5_diamonds",
  "70_diamonds",
  "102_10_diamonds",
  "140_diamonds",
  "170_diamonds",
  "240_diamonds",
  "284_diamonds",
  "296_diamonds",
  "355_diamonds",
  "429_diamonds",
  "504_66_diamonds",
  "716_diamonds",
  "1007_156_diamonds",
  "1084_diamonds",
  "1446_diamonds",
  "2010_diamonds",
  "2015_383_diamonds",
  "2976_diamonds",
  "7502_diamonds",
]);

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
      // Preserve any custom costs previously set by admin
      const { data: existingRows } = await sb.from("fazer_packages").select("offer_id, cost_usd, raw");
      const customOverrides = new Map<string, { cost_usd: number; raw: any }>();
      for (const ex of existingRows || []) {
        if (ex?.raw?.cost_edited_by_admin && typeof ex.cost_usd === "number" && ex.offer_id !== "mobile_legends_global:78_8_diamonds") {
          customOverrides.set(ex.offer_id, { cost_usd: ex.cost_usd, raw: ex.raw });
        }
      }

      const rows = catalog.products.map((p) => {
        const override = customOverrides.get(p.offer_id);
        const off = String(p.offer_id || "");
        const rawId = (off.includes(":") ? off.split(":")[1] : off) || "";
        const isOddMlbb = p.game_id === "mlbb" && rawId && NOISY_MLBB_TIERS.has(rawId);
        return {
          offer_id: p.offer_id,
          game_id: p.game_id || "mlbb",
          category: p.category || "diamonds",
          name: p.name,
          diamonds: p.diamonds || 0,
          bonus_diamonds: p.bonus_diamonds || 0,
          currency_name: p.currency_name || null,
          cost_usd: override ? override.cost_usd : p.cost_usd ?? null,
          regions: p.regions ?? null,
          active: isOddMlbb ? false : p.active !== false,
          raw: override ? { ...(p.raw ?? {}), ...override.raw } : p.raw ?? null,
          updated_at: nowIso,
        };
      });
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

    try {
      await curateMlbbPackages(sb);
    } catch (curateErr) {
      console.error("Failed to curate MLBB packages during sync:", curateErr);
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

// Global server cache for store packages to serve /api/store instantly (< 10ms)
let STORE_DATA_CACHE: { data: any; expiresAt: number } | null = null;

export async function getStoreData(gameId?: string) {
  // If no game filter, use cached store payload if fresher than 60 seconds
  if (!gameId && STORE_DATA_CACHE && STORE_DATA_CACHE.expiresAt > Date.now()) {
    return STORE_DATA_CACHE.data;
  }

  const sb = getAdminClient() as any;
  const [{ data: initialSettingsRow }, fxResult, { data: fxConfigRow }] = await Promise.all([
    sb.from("store_settings").select("*").eq("id", 1).maybeSingle(),
    getLiveUsdRates().catch(() => null),
    sb.from("fazer_packages").select("raw").eq("offer_id", "config:fx_settings").maybeSingle(),
  ]);
  let settingsRow = initialSettingsRow;
  let egpRate = Number(settingsRow?.egp_rate || DEFAULT_EGP_RATE);

  const fxConfig = (fxConfigRow?.raw as any) || { mode: "manual" };
  const rateMode: "manual" | "binance_auto" = fxConfig.mode === "binance_auto" ? "binance_auto" : "manual";
  const binanceEgp = fxResult?.rates ? (fxResult.rates["BINANCE_EGP"] ?? fxResult.rates["EGP"]) : undefined;

  // Persist latest live binance rate in config if available
  if (binanceEgp && typeof binanceEgp === "number" && binanceEgp > 0) {
    if (Math.abs((fxConfig.binance_rate || 0) - binanceEgp) > 0.05) {
      try {
        await sb.from("fazer_packages")
          .upsert({
            offer_id: "config:fx_settings",
            game_id: "system",
            name: "FX Settings",
            active: false,
            raw: {
              ...fxConfig,
              binance_rate: binanceEgp,
              binance_updated_at: new Date().toISOString(),
            },
          });
      } catch {
        // Ignore background persistence error
      }
    }
  }

  // Retail store EGP prices dynamically track Binance P2P rate to protect retail margins.
  // Merchant wallet balances are 100% pure native USD and are immune to this rate.
  if (
    !process.env["VITEST"] &&
    typeof binanceEgp === "number" &&
    Number.isFinite(binanceEgp) &&
    binanceEgp > 0
  ) {
    const liveEgp = Math.round(binanceEgp * 100) / 100;
    if (Math.abs(egpRate - liveEgp) > 0.05) {
      egpRate = liveEgp;
      STORE_DATA_CACHE = null; // Invalidate cached packages immediately so new live prices propagate to everyone
      try {
        await sb.from("store_settings")
          .update({ egp_rate: egpRate, updated_at: new Date().toISOString() })
          .eq("id", 1);
      } catch {
        // Ignore settings update error
      }
    }
  }

  let q = sb
    .from("fazer_packages")
    .select("*")
    .eq("active", true)
    .order("diamonds", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (gameId) q = q.eq("game_id", gameId);
  let { data: pkgs } = await q;

  // Check if packages are empty OR missing games OR stale (auto-sync packages & balance)
  const distinctGames = new Set((pkgs || []).map((p: any) => p.game_id));
  const lastSyncMs = settingsRow?.packages_synced_at ? Date.parse(settingsRow.packages_synced_at) : 0;
  const syncStale = !lastSyncMs || Date.now() - lastSyncMs > 5 * 60 * 1000;
  const missingCompositeMlbb = (pkgs || []).some((p: any) => p.game_id === "mlbb") && !(pkgs || []).some((p: any) => p.raw?.is_composite);

  if (!process.env["VITEST"] && missingCompositeMlbb) {
    try {
      await curateMlbbPackages(sb);
      let qRefresh = sb
        .from("fazer_packages")
        .select("*")
        .eq("active", true)
        .order("diamonds", { ascending: true })
        .order("updated_at", { ascending: false })
        .limit(1000);
      if (gameId) qRefresh = qRefresh.eq("game_id", gameId);
      pkgs = (await qRefresh).data || pkgs;
    } catch {
      // Ignore curate error
    }
  }

  if ((!pkgs || pkgs.length === 0 || (!gameId && distinctGames.size < 4 && syncStale)) && readEnv("FAZER_API_KEY")) {
    try {
      await syncFazerInternal();
      const s2 = await sb.from("store_settings").select("*").eq("id", 1).maybeSingle();
      settingsRow = s2.data || settingsRow;
      if (process.env["VITEST"] || rateMode === "manual" || !binanceEgp) {
        egpRate = Number(settingsRow?.egp_rate || DEFAULT_EGP_RATE);
      }
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
  } else if (!process.env["VITEST"] && syncStale && readEnv("FAZER_API_KEY")) {
    // Packages exist, trigger background auto-refresh when stale (> 5 min)
    syncFazerInternal().catch(() => {});
  } else if (
    !process.env["VITEST"] &&
    readEnv("FAZER_API_KEY") &&
    (!settingsRow?.fazer_balance_updated_at ||
      Date.now() - Date.parse(settingsRow.fazer_balance_updated_at) > 2 * 60 * 1000)
  ) {
    // Keep Fazer wallet balance auto-refreshed when > 2 min old
    FazerCardsService.checkAccount().then(persistFazerAccountBalance).catch(() => {});
  }

  const NOISY_MLBB_TIERS = new Set([
    "10_1_diamonds",
    "12_diamonds",
    "14_diamonds",
    "19_diamonds",
    "20_2_diamonds",
    "28_diamonds",
    "42_diamonds",
    "51_5_diamonds",
    "70_diamonds",
    "102_10_diamonds",
    "140_diamonds",
    "170_diamonds",
    "240_diamonds",
    "284_diamonds",
    "296_diamonds",
    "355_diamonds",
    "429_diamonds",
    "504_66_diamonds",
    "716_diamonds",
    "1007_156_diamonds",
    "1084_diamonds",
    "1446_diamonds",
    "2010_diamonds",
    "2015_383_diamonds",
    "2976_diamonds",
    "7502_diamonds",
  ]);

  const packages = (pkgs || [])
    .filter((p: any) => {
      if (p.game_id === "mlbb") {
        const id = String(p.offer_id || "");
        const rawId = (id.includes(":") ? id.split(":")[1] : id) || "";
        if (rawId && NOISY_MLBB_TIERS.has(rawId.toLowerCase())) return false;
      }
      return true;
    })
    .map((p: any) => {
    let costUsd = Number(p.cost_usd || 0);
    const hasAdminCustom = p.raw?.cost_edited_by_admin && typeof p.raw.custom_cost_usd === "number" && p.offer_id !== "mobile_legends_global:78_8_diamonds";
    if (hasAdminCustom) {
      costUsd = Number(p.raw.custom_cost_usd);
    } else {
      const rawFazerCost = Number(p.raw?.price_usd ?? p.raw?.cost_usd ?? 0);
      if (rawFazerCost > 0) {
        costUsd = rawFazerCost;
      }
    }
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

  packages.sort((a: any, b: any) => {
    const totalA = (a.diamonds || 0) + (a.bonusDiamonds || 0);
    const totalB = (b.diamonds || 0) + (b.bonusDiamonds || 0);
    if (totalA !== totalB) return totalA - totalB;
    return (a.costUsd || 0) - (b.costUsd || 0);
  });

  const payload = {
    success: true,
    packages,
    settings: {
      egp_rate: egpRate,
      egp_rate_mode: rateMode,
      binance_rate: binanceEgp ?? fxConfig.binance_rate ?? null,
      binance_updated_at: fxConfig.binance_updated_at ?? null,
      fazer_balance: settingsRow?.fazer_balance ?? null,
      fazer_balance_currency: settingsRow?.fazer_balance_currency ?? null,
      fazer_balance_updated_at: settingsRow?.fazer_balance_updated_at ?? null,
      packages_synced_at: settingsRow?.packages_synced_at ?? null,
      global_retail_markup_percent: DEFAULT_RETAIL_MARKUP * 100,
      fx_rates: fxResult?.rates ?? undefined,
      fx_updated_at: fxResult?.updatedAt ?? null,
    },
  };

  if (!gameId) {
    STORE_DATA_CACHE = {
      data: payload,
      expiresAt: Date.now() + 30 * 1000, // 30 seconds fast in-memory cache
    };
  }

  return payload;
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

export function findLeastCostComponentCombination(
  targetDiamonds: number,
  candidatePkgs: any[],
  fallbackComponents?: any[],
  targetRegion?: string,
  targetGame?: string,
): any[] {
  const fallbackList = Array.isArray(fallbackComponents) ? fallbackComponents : [];
  const fallbackCost = fallbackList.reduce(
    (sum, c) => sum + Number(c.cost_usd || c.costUsd || 0) * Number(c.qty || 1),
    0,
  );

  if (!targetDiamonds || targetDiamonds <= 0 || !candidatePkgs || candidatePkgs.length === 0) {
    return fallbackList;
  }

  // Detect target region if not explicitly passed
  let regionFilter = targetRegion;
  if (!regionFilter && fallbackList.length > 0) {
    const firstComp = fallbackList[0]?.offer_id || "";
    if (firstComp.includes("brazil") || firstComp.includes(":br_") || firstComp.includes("br_")) {
      regionFilter = "br";
    } else if (firstComp.includes("global")) {
      regionFilter = "global";
    }
  }

  // Filter valid base packages with positive diamonds and cost
  const validPkgs = candidatePkgs
    .filter((p) => {
      const isComp = Boolean(
        p.offer_id?.startsWith?.("comp:") ||
        p.offer_id?.startsWith?.("mlbb_composite") ||
        p.raw?.is_composite,
      );
      if (isComp || p.active === false) return false;
      if (targetGame && p.game_id && p.game_id !== targetGame) return false;

      const c = Number(p.cost_usd || 0);
      if (c <= 0) return false;

      const pRegs = Array.isArray(p.regions) ? p.regions : [];
      const isBr = p.offer_id.includes("brazil") || pRegs.includes("br");
      const isGlobal = p.offer_id.includes("global") || pRegs.includes("global") || pRegs.length === 0;

      if (regionFilter === "br") {
        if (!isBr) return false;
      } else if (regionFilter === "global") {
        if (isBr || !isGlobal) return false;
      }

      const totalDia =
        Number(p.diamonds || 0) +
        Number(p.bonus_diamonds || p.raw?.bonus_diamonds || p.raw?.bonus || 0);
      const dia = totalDia > 0 ? totalDia : Number(p.diamonds || 0);
      return dia > 0;
    })
    .map((p) => {
      const totalDia =
        Number(p.diamonds || 0) +
        Number(p.bonus_diamonds || p.raw?.bonus_diamonds || p.raw?.bonus || 0);
      const dia = totalDia > 0 ? totalDia : Number(p.diamonds || 0);
      return {
        offer_id: p.offer_id,
        fazer_offer_id: (p.raw && typeof p.raw === "object" && p.raw.fazer_offer_id) || p.offer_id,
        fazer_category_id: (p.raw && typeof p.raw === "object" && p.raw.fazer_category_id) || undefined,
        diamonds: dia,
        cost_usd: Number(p.cost_usd),
        qty: 1,
      };
    });

  if (validPkgs.length === 0) return fallbackList;

  // Unbounded knapsack DP: dpCost[d] = minimum cost for exactly d diamonds
  const maxTarget = targetDiamonds;
  const INF = 1e9;
  const dpCost = new Float64Array(maxTarget + 1).fill(INF);
  const dpCount = new Int32Array(maxTarget + 1).fill(INF);
  const dpPkg: Array<any | null> = new Array(maxTarget + 1).fill(null);

  dpCost[0] = 0;
  dpCount[0] = 0;

  for (let d = 1; d <= maxTarget; d++) {
    for (const p of validPkgs) {
      if (p.diamonds <= d) {
        const prev = d - p.diamonds;
        const prevCost = dpCost[prev];
        const prevCount = dpCount[prev];
        const currCost = dpCost[d];
        const currCount = dpCount[d];
        if (
          prevCost !== undefined &&
          prevCost < INF &&
          prevCount !== undefined &&
          currCost !== undefined &&
          currCount !== undefined
        ) {
          const newCost = prevCost + p.cost_usd;
          const newCount = prevCount + 1;
          const diff = Math.round((newCost - currCost) * 10000);
          if (diff < 0 || (diff === 0 && newCount < currCount)) {
            dpCost[d] = newCost;
            dpCount[d] = newCount;
            dpPkg[d] = p;
          }
        }
      }
    }
  }

  // Consider targetDiamonds as well as targetDiamonds - 1 (e.g. 343 for 344)
  const candidateTargets = [targetDiamonds];
  if (targetDiamonds > 1) candidateTargets.push(targetDiamonds - 1);

  let bestTarget = -1;
  let bestCost = fallbackCost > 0 ? fallbackCost : INF;

  for (const t of candidateTargets) {
    const cost = dpCost[t];
    if (cost !== undefined && cost < INF) {
      if (bestCost >= INF || Math.round((cost - bestCost) * 10000) < 0) {
        bestCost = cost;
        bestTarget = t;
      }
    }
  }

  if (bestTarget === -1 || (fallbackCost > 0 && Math.round((bestCost - fallbackCost) * 10000) >= 0)) {
    return fallbackList;
  }

  // Reconstruct components
  const counts = new Map<string, any>();
  let curr = bestTarget;
  while (curr > 0) {
    const p = dpPkg[curr];
    if (!p) break;
    const key = p.offer_id;
    if (!counts.has(key)) {
      counts.set(key, { ...p, qty: 1 });
    } else {
      counts.get(key).qty += 1;
    }
    curr -= p.diamonds;
  }

  return Array.from(counts.values());
}

export function extractCustomPriceUsd(entry: any): number | null {
  if (entry == null) return null;
  if (typeof entry === "object" && typeof entry.price_usd === "number" && entry.price_usd > 0) {
    return round3(entry.price_usd);
  }
  if (typeof entry === "number" && entry > 0) {
    return round3(entry);
  }
  return null;
}

export function enrichOrderWithUsd(o: any, egpRate: number) {
  if (!o) return o;
  const items = Array.isArray(o.items) ? o.items : [];
  let totalUsd = 0;
  let totalCostUsd = 0;
  for (const it of items) {
    const q = Number(it.qty || 1);
    const uCost = Number(it.unit_cost_usd ?? it.cost_usd ?? 0);
    const uUsd = it.unit_price_usd ?? (it.unit_price_egp ? it.unit_price_egp / egpRate : uCost);
    totalCostUsd += uCost * q;
    totalUsd += Number(uUsd || 0) * q;
  }
  if (!totalUsd && o.total_egp > 0) {
    totalUsd = o.total_egp / egpRate;
  }
  const profitUsd = round3(totalUsd - totalCostUsd);
  const profitEgp = round3(profitUsd * egpRate);
  const extractedPlayerName = o.player_name || items[0]?.player_name || null;
  return {
    ...o,
    player_name: extractedPlayerName,
    total_cost_usd: round3(totalCostUsd),
    total_usd: round3(totalUsd),
    profit_usd: profitUsd,
    profit_egp: profitEgp,
  };
}

let cachedCustomPrices: { data: Record<string, Record<string, any>>; expiresAt: number } | null = null;
export function invalidateCustomPricesCache() {
  cachedCustomPrices = null;
}

export async function getMerchantCustomPrices(merchantId?: string): Promise<Record<string, Record<string, any>>> {
  if (cachedCustomPrices && cachedCustomPrices.expiresAt > Date.now()) {
    return cachedCustomPrices.data;
  }
  const sb = getAdminClient() as any;
  const { data } = await sb
    .from("fazer_packages")
    .select("raw")
    .eq("offer_id", "config:merchant_custom_prices")
    .maybeSingle();

  const allMap: Record<string, Record<string, any>> =
    data?.raw && typeof data.raw === "object" && !Array.isArray(data.raw) ? data.raw : {};

  cachedCustomPrices = { data: allMap, expiresAt: Date.now() + 30_000 };
  return allMap;
}

let cachedStoreSettings: { data: any; expiresAt: number } | null = null;
export function invalidateStoreSettingsCache() {
  cachedStoreSettings = null;
}
export async function getCachedStoreSettings(sb: any) {
  if (cachedStoreSettings && cachedStoreSettings.expiresAt > Date.now()) {
    return cachedStoreSettings.data;
  }
  const { data } = await sb.from("store_settings").select("*").eq("id", 1).maybeSingle();
  if (data) {
    cachedStoreSettings = { data, expiresAt: Date.now() + 15_000 };
  }
  return data;
}

let cachedUserEmails: { map: Map<string, string>; expiresAt: number } | null = null;
async function getUserEmailsMap(sba: any): Promise<Map<string, string>> {
  if (cachedUserEmails && cachedUserEmails.expiresAt > Date.now()) {
    return cachedUserEmails.map;
  }
  const emailMap = new Map<string, string>();
  try {
    const authAdmin = (sba as any).auth?.admin;
    if (authAdmin && typeof authAdmin.listUsers === "function") {
      const { data: usersRes } = await authAdmin.listUsers({ page: 1, perPage: 200 });
      for (const u of usersRes?.users || []) {
        if (u?.id && u?.email) emailMap.set(u.id, u.email);
      }
    }
  } catch (err: any) {
    console.warn("Auth admin listUsers failed:", err?.message);
  }
  cachedUserEmails = { map: emailMap, expiresAt: Date.now() + 60_000 };
  return emailMap;
}

export async function adminSetMerchantPackagePrice(
  token: string,
  body: {
    merchantId?: string;
    merchant_id?: string;
    offerId?: string;
    offer_id?: string;
    priceUsd?: number | null;
    price_usd?: number | null;
    priceEgp?: number | null;
    price_egp?: number | null;
  },
) {
  await requireAdmin(token);
  const merchantId = (body.merchantId || body.merchant_id || "").trim();
  const offerId = (body.offerId || body.offer_id || "").trim();
  const rawPriceUsd = body.priceUsd !== undefined ? body.priceUsd : body.price_usd;

  if (!merchantId) throw new Error("معرف التاجر مطلوب");
  if (!offerId) throw new Error("معرف الباقة مطلوب");

  const sb = getAdminClient() as any;
  const { data: row } = await sb
    .from("fazer_packages")
    .select("*")
    .eq("offer_id", "config:merchant_custom_prices")
    .maybeSingle();

  let raw: Record<string, Record<string, any>> = {};
  if (row?.raw && typeof row.raw === "object" && !Array.isArray(row.raw)) {
    raw = { ...row.raw };
  }

  const merchantMap = { ...(raw[merchantId] || {}) };
  if (typeof rawPriceUsd === "number" && rawPriceUsd > 0) {
    merchantMap[offerId] = { price_usd: round3(rawPriceUsd) };
  } else {
    delete merchantMap[offerId];
  }
  raw[merchantId] = merchantMap;

  const nowIso = new Date().toISOString();
  if (row) {
    const { error } = await sb
      .from("fazer_packages")
      .update({ raw, updated_at: nowIso })
      .eq("offer_id", "config:merchant_custom_prices");
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("fazer_packages").insert({
      offer_id: "config:merchant_custom_prices",
      name: "Merchant Custom Prices Config",
      game_id: "config",
      active: false,
      diamonds: 0,
      bonus_diamonds: 0,
      cost_usd: 0,
      raw,
      created_at: nowIso,
      updated_at: nowIso,
    });
    if (error) throw new Error(error.message);
  }

  invalidateCustomPricesCache();
  return { success: true, merchantId, offerId, priceUsd: rawPriceUsd ? round3(rawPriceUsd) : null };
}

export async function adminResetMerchantCustomPrices(
  token: string,
  merchantId: string,
) {
  await requireAdmin(token);
  const mid = (merchantId || "").trim();
  if (!mid) throw new Error("معرف التاجر مطلوب");

  const sb = getAdminClient() as any;
  const { data: row } = await sb
    .from("fazer_packages")
    .select("*")
    .eq("offer_id", "config:merchant_custom_prices")
    .maybeSingle();

  let raw: Record<string, Record<string, any>> = {};
  if (row?.raw && typeof row.raw === "object" && !Array.isArray(row.raw)) {
    raw = { ...row.raw };
  }

  delete raw[mid];

  const nowIso = new Date().toISOString();
  if (row) {
    const { error } = await sb
      .from("fazer_packages")
      .update({ raw, updated_at: nowIso })
      .eq("offer_id", "config:merchant_custom_prices");
    if (error) throw new Error(error.message);
  }

  invalidateCustomPricesCache();
  return { success: true, merchantId: mid, cleared: true };
}

export async function submitCustomerOrder(body: any, token?: string | null) {
  const sb = getAdminClient() as any;
  const rawItems: Array<{ offerId?: string; packageId?: string; qty: number }> = Array.isArray(body?.items)
    ? body.items
    : [];
  const items = rawItems
    .map((i) => {
      const parsedQty = Math.floor(Number(i.qty));
      const safeQty = Number.isFinite(parsedQty) && parsedQty >= 1 ? Math.min(20, parsedQty) : 1;
      return {
        offerId: String(i.offerId || i.packageId || "").trim(),
        qty: safeQty,
      };
    })
    .filter((i) => i.offerId);

  const playerId = String(body?.playerId || "").trim();
  const zoneId = String(body?.zoneId || "").trim();
  const gameId = String(body?.gameId || "mlbb");
  const region = String(body?.region || "").trim() || "global";
  const asMerchant = Boolean(body?.asMerchant);
  const clientOrderId =
    typeof body?.clientOrderId === "string" && body.clientOrderId.trim().startsWith("ORD-")
      ? body.clientOrderId.trim()
      : typeof body?.orderRef === "string" && body.orderRef.trim().startsWith("ORD-")
        ? body.orderRef.trim()
        : null;

  // Idempotency: If this client order ID was already processed, return existing order to avoid duplicate charges
  if (clientOrderId) {
    const { data: existingOrder } = await sb
      .from("orders")
      .select("*")
      .eq("order_ref", clientOrderId)
      .maybeSingle();

    if (existingOrder) {
      return {
        success:
          existingOrder.status === "success" ||
          existingOrder.status === "processing" ||
          existingOrder.status === "incomplete",
        order_ref: existingOrder.order_ref,
        status: existingOrder.status,
        total_egp: Number(existingOrder.total_egp || 0),
        game_id: existingOrder.game_id,
        region: existingOrder.region,
        transaction_ids: (existingOrder.fazer_transaction_id || "").split(",").filter(Boolean),
        player_name: body?.playerName || `ID #${playerId}`,
        account_region: existingOrder.account_region,
        error: existingOrder.error_message,
        message:
          existingOrder.status === "success"
            ? "تم تنفيذ الشحن بنجاح وتسليم الباقة في اللعبة. 🎉"
            : existingOrder.status === "processing"
              ? "الطلب قيد المعالجة بالسيرفر حالياً ⏳"
              : existingOrder.error_message || "تعذر إكمال الطلب.",
      };
    }
  }

  if (!playerId) return { success: false, error: "يرجى إدخال معرف اللاعب" };
  if (!items.length) return { success: false, error: "يرجى اختيار باقة واحدة على الأقل" };

  let userId: string | null = null;
  let merchant: any = null;
  let authError: string | null = null;
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
    } catch (err: any) {
      authError = err?.message || "Invalid auth token";
    }
  }
  if (asMerchant) {
    if (authError || !token) {
      return { success: false, error: "انتهت صلاحية جلسة تسجيل الدخول للتاجر، يرجى تحديث الصفحة أو تسجيل الدخول مجدداً." };
    }
    if (!merchant) {
      return { success: false, error: "حساب التاجر غير موجود أو موقوف. سجّل الدخول بحساب تاجر مفعل." };
    }
  }

  const customPricesAll = merchant ? await getMerchantCustomPrices() : {};
  const merchantCustomPrices = merchant ? (customPricesAll[merchant.id] || {}) : {};

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

  // Strict regex format validation
  if (effectiveGameId === "mlbb") {
    if (!/^\d{4,15}$/.test(playerId)) {
      return { success: false, error: "معرف اللاعب (Player ID) في MLBB يجب أن يكون أرقاماً فقط (4-15 رقم)" };
    }
    if (zoneId && !/^\d{2,8}$/.test(zoneId)) {
      return { success: false, error: "رقم السيرفر (Zone ID) غير صالح" };
    }
  }

  const { data: settingsRow } = await sb.from("store_settings").select("*").eq("id", 1).maybeSingle();
  const egpRate = Number(settingsRow?.egp_rate || DEFAULT_EGP_RATE);

  for (const it of items) {
    const p = byId.get(it.offerId);
    const pregions = Array.isArray(p?.regions) ? p.regions.map(normalizeRegion) : [];
    const normReqRegion = normalizeRegion(region);
    const hasGlobal = pregions.length === 0 || pregions.includes("global");
    const isRegionMatch = Boolean(normReqRegion && (normReqRegion === "all" || pregions.includes(normReqRegion)));
    if (pregions.length > 0 && !hasGlobal && !isRegionMatch) {
      return { success: false, error: `الباقة "${p.name}" غير متاحة لمنطقة ${region}.` };
    }
  }

  let playerName =
    typeof body?.playerName === "string" && body.playerName.trim() ? body.playerName.trim() : null;
  let accRegion: string | null =
    typeof body?.accountRegion === "string" && body.accountRegion.trim() ? body.accountRegion.trim() : null;

  // If client did not provide pre-verified player name, run fast validation
  if (!playerName) {
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
    if (!validation.valid && !validation.fallback) {
      return { success: false, error: validation.error || "تعذر التحقق من معرف اللاعب" };
    }
    playerName = validation.username || `ID #${playerId}`;
    accRegion = validation.accountRegion || null;
  }

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
    let costUsd = Number(p.cost_usd || 0);
    const hasAdminCustom = p.raw?.cost_edited_by_admin && typeof p.raw.custom_cost_usd === "number" && p.offer_id !== "mobile_legends_global:78_8_diamonds";
    if (hasAdminCustom) {
      costUsd = Number(p.raw.custom_cost_usd);
    } else {
      const rawFazerCost = Number(p.raw?.price_usd ?? p.raw?.cost_usd ?? 0);
      if (rawFazerCost > 0) {
        costUsd = rawFazerCost;
      }
    }
    const merchantBase = calcMerchantBasePriceEgp(costUsd, egpRate, DEFAULT_MERCHANT_MARKUP);
    const customEntry = asMerchant ? merchantCustomPrices[p.offer_id] : undefined;
    const customUsd = extractCustomPriceUsd(customEntry);
    const unitPrice =
      customUsd !== null && customUsd > 0
        ? round3(customUsd * egpRate)
        : (asMerchant
            ? calcMerchantUnitPriceEgp(merchantBase, merchantMargin, costUsd, egpRate, DEFAULT_MERCHANT_MARKUP)
            : calcRetailPriceEgp(costUsd, egpRate, DEFAULT_RETAIL_MARKUP));
    const catId =
      p.raw && typeof p.raw === "object" && typeof p.raw.fazer_category_id === "string"
        ? p.raw.fazer_category_id
        : undefined;
    const rawFazerOfferId =
      p.raw && typeof p.raw === "object" && typeof p.raw.fazer_offer_id === "string"
        ? p.raw.fazer_offer_id
        : FazerCardsService.splitCompositeOfferId(String(p.offer_id)).rawOfferId;
    const isComposite = Boolean(
      p?.raw && typeof p.raw === "object" && p.raw.is_composite && Array.isArray(p.raw.components) && p.raw.components.length > 0,
    );
    const unitPriceUsd =
      customUsd !== null && customUsd > 0
        ? customUsd
        : round3(unitPrice / egpRate);
    return {
      package_id: p.offer_id,
      fazer_offer_id: rawFazerOfferId,
      fazer_category_id: catId,
      name: p.name,
      player_name: playerName || body?.playerName || null,
      qty: it.qty,
      unit_price_egp: unitPrice,
      unit_price_usd: unitPriceUsd,
      unit_cost_usd: costUsd,
      total_usd: round3(unitPriceUsd * it.qty),
      diamonds: Number(p.diamonds || 0),
      bonus_diamonds: Number(p.bonus_diamonds || 0),
      game_id: p.game_id || effectiveGameId,
      region,
      is_composite: isComposite,
      components: isComposite ? p.raw.components : null,
    };
  });

  const merchantTotalUsd = round3(orderItems.reduce((s, i) => s + (i.total_usd || 0), 0));
  const retailTotalEgp = Math.round(orderItems.reduce((s, i) => s + i.unit_price_egp * i.qty, 0) * 100) / 100;
  const total = asMerchant ? round3(merchantTotalUsd * egpRate) : retailTotalEgp;
  if (!Number.isFinite(total) || total <= 0) {
    return { success: false, error: "قيمة الطلب غير صحيحة" };
  }

  if (asMerchant) {
    const curBal = Number(merchant.balance_egp || 0);
    if (curBal < merchantTotalUsd) {
      return {
        success: false,
        error: `رصيد المحفظة ($${curBal.toFixed(2)} USD) غير كافٍ لإتمام الطلب ($${merchantTotalUsd.toFixed(2)} USD).`,
      };
    }
  }

  const orderRef = clientOrderId || `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

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
    const debitAmount = merchantTotalUsd;
    const { data: dData, error: derr } = await sb.rpc("debit_merchant_for_order", {
      p_merchant_id: merchant.id,
      p_amount: debitAmount,
      p_order_ref: orderRef,
      p_note: `خصم طلب شحن ${orderRef} ($${debitAmount.toFixed(2)})`,
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
  let processingCount = 0;
  let failedCount = 0;
  let failedAmount = 0;
  const txIds: string[] = [];
  let lastErr: string | null = null;
  let lastRemainingFazer: number | undefined;
  const responses: any[] = [];

  const topUpTasks: Array<{
    isComposite: boolean;
    packageId?: string | undefined;
    offerId: string;
    fazerCategoryId?: string | undefined;
    diamonds?: number | undefined;
    q: number;
    subIndex?: number | undefined;
    shareEgp: number;
    gameId: string;
    idempotencyKey: string;
  }> = [];

  for (const it of orderItems) {
    if (it.is_composite && Array.isArray(it.components) && it.components.length > 0) {
      let components = it.components;
      try {
        const { data: gamePkgs } = await sb
          .from("fazer_packages")
          .select("offer_id, diamonds, bonus_diamonds, cost_usd, active, raw, regions, game_id")
          .eq("game_id", it.game_id)
          .eq("active", true);
        if (gamePkgs && gamePkgs.length > 0 && it.diamonds > 0) {
          const targetRegion = it.region || ((it as any).regions && (it as any).regions[0]);
          const optimized = findLeastCostComponentCombination(
            it.diamonds,
            gamePkgs,
            it.components,
            targetRegion,
            it.game_id,
          );
          if (optimized && optimized.length > 0) {
            components = optimized;
          }
        }
      } catch (optErr) {
        console.error("Dynamic least-cost combination error:", optErr);
      }

      const totalCompCost =
        components.reduce(
          (sum: number, c: any) => sum + Number(c.cost_usd || c.costUsd || 0) * Number(c.qty || 1),
          0,
        ) || it.unit_cost_usd || 1;

      const flattenedComps: Array<{
        offerId: string;
        fazerOfferId: string;
        fazerCategoryId?: string;
        diamonds: number;
        costUsd: number;
      }> = [];
      for (const comp of components) {
        const cQty = Math.max(1, Math.floor(Number(comp.qty || 1)));
        for (let cq = 0; cq < cQty; cq++) {
          flattenedComps.push({
            offerId: comp.offer_id,
            fazerOfferId: comp.fazer_offer_id || comp.offer_id,
            fazerCategoryId: comp.fazer_category_id || it.fazer_category_id,
            diamonds: Number(comp.diamonds || 0),
            costUsd: Number(comp.cost_usd || comp.costUsd || 0),
          });
        }
      }

      for (let q = 0; q < it.qty; q++) {
        let remainingUnit = asMerchant ? (it.unit_price_usd || 0) : it.unit_price_egp;

        for (let cIdx = 0; cIdx < flattenedComps.length; cIdx++) {
          const comp = flattenedComps[cIdx]!;
          const isLastComp = cIdx === flattenedComps.length - 1;
          const baseUnitPrice = asMerchant ? (it.unit_price_usd || 0) : it.unit_price_egp;
          const compShare = isLastComp
            ? Math.round(remainingUnit * 1000) / 1000
            : Math.min(
                remainingUnit,
                Math.round(((comp.costUsd || 1) / totalCompCost) * baseUnitPrice * 1000) / 1000,
              );
          remainingUnit = Math.max(0, remainingUnit - compShare);

          const idempotencyKey = `${orderRef}-${it.package_id}-${q}-${comp.fazerOfferId}-${cIdx}`;
          topUpTasks.push({
            isComposite: true,
            packageId: it.package_id,
            offerId: comp.fazerOfferId,
            fazerCategoryId: comp.fazerCategoryId,
            diamonds: comp.diamonds,
            q,
            subIndex: cIdx,
            shareEgp: compShare,
            gameId: it.game_id,
            idempotencyKey,
          });
        }
      }
    } else {
      for (let q = 0; q < it.qty; q++) {
        topUpTasks.push({
          isComposite: false,
          offerId: it.fazer_offer_id,
          fazerCategoryId: it.fazer_category_id,
          q,
          shareEgp: asMerchant ? (it.unit_price_usd || 0) : it.unit_price_egp,
          gameId: it.game_id,
          idempotencyKey: `${orderRef}-${it.fazer_offer_id}-${q}`,
        });
      }
    }
  }

  // Execute all top-up tasks in parallel for blazing-fast checkout
  const taskExecutions = await Promise.all(
    topUpTasks.map(async (task) => {
      const res = await FazerCardsService.executeTopUp({
        offerId: task.offerId,
        playerId,
        zoneId,
        gameId: task.gameId,
        fazerCategoryId: task.fazerCategoryId,
        region,
        idempotencyKey: task.idempotencyKey,
      });
      return { task, res };
    }),
  );

  for (const { task, res } of taskExecutions) {
    if (task.isComposite) {
      responses.push({
        parent_package: task.packageId,
        item: task.offerId,
        diamonds: task.diamonds,
        q: task.q,
        sub_index: task.subIndex,
        share_egp: task.shareEgp,
        res,
      });
    } else {
      responses.push({ item: task.offerId, q: task.q, res });
    }

    if (res.success) {
      if (res.status === "completed") {
        succeededCount++;
      } else {
        processingCount++;
      }
      if (res.transactionId) txIds.push(res.transactionId);
      if (typeof res.balanceRemaining === "number") lastRemainingFazer = res.balanceRemaining;
    } else {
      failedCount++;
      failedAmount += task.shareEgp;
      lastErr =
        res.error ||
        (task.isComposite
          ? `فشل شحن باقة ${task.diamonds} ماسة ضمن الباقة المتجمعة`
          : "فشل تنفيذ الشحن لدى المزود");
    }
  }

  if (lastRemainingFazer !== undefined) {
    await persistFazerAccountBalance({ connected: true, balance: lastRemainingFazer, currency: "USD" });
  }

  let finalStatus: "success" | "processing" | "failed" | "incomplete";
  if (failedCount > 0) {
    if (succeededCount === 0 && processingCount === 0) {
      finalStatus = "failed";
    } else {
      finalStatus = "incomplete";
    }
    if (asMerchant && failedAmount > 0) {
      await issueMerchantRefund(
        sb,
        merchant.id,
        failedAmount,
        orderRef,
        succeededCount > 0 || processingCount > 0
          ? `استرداد جزئي للوحدات غير المنفذة من طلب ${orderRef}`
          : `استرداد كامل بسبب فشل التنفيذ للطلب ${orderRef}`,
      );
      if (updatedBalance !== undefined) {
        updatedBalance = Math.round((updatedBalance + failedAmount) * 100) / 100;
      }
    }
  } else if (processingCount > 0) {
    finalStatus = "processing";
  } else if (succeededCount > 0) {
    finalStatus = "success";
  } else {
    finalStatus = "failed";
  }

  const isDelivered = finalStatus === "success";
  await sb
    .from("orders")
    .update({
      status: finalStatus,
      fazer_transaction_id: txIds.join(",") || null,
      fazer_response: responses,
      error_message: lastErr,
      delivered_at: isDelivered ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  // Trigger rapid non-blocking background auto-sync so the order flips to completed in real-time
  if (finalStatus === "processing" || processingCount > 0) {
    if (!process.env["VITEST"]) {
      setTimeout(() => {
        autoSyncPendingOrders(order.id).catch(() => {});
      }, 300);
      setTimeout(() => {
        autoSyncPendingOrders(order.id).catch(() => {});
      }, 1000);
      setTimeout(() => {
        autoSyncPendingOrders(order.id).catch(() => {});
      }, 2500);
      setTimeout(() => {
        autoSyncPendingOrders(order.id).catch(() => {});
      }, 5000);
    }
  }

  return {
    success: finalStatus === "success" || finalStatus === "processing" || finalStatus === "incomplete",
    order_ref: orderRef,
    status: finalStatus,
    total_egp: total,
    game_id: effectiveGameId,
    region,
    refunded_egp: asMerchant && failedAmount > 0 ? failedAmount : 0,
    refunded_usd: asMerchant && failedAmount > 0 ? failedAmount : 0,
    balance_egp: updatedBalance,
    balance_usd: updatedBalance,
    transaction_ids: txIds,
    player_name: playerName || `ID #${playerId}`,
    account_region: accRegion,
    error: lastErr,
    message: asMerchant
      ? finalStatus === "success"
        ? "تم خصم الرصيد وتنفيذ الشحن بنجاح وتسليم الباقة في اللعبة. 🎉"
        : finalStatus === "processing"
          ? "تم خصم الرصيد وإرسال الشحن مباشرة وجاري المعالجة على سيرفر اللعبة (قيد المعالجة) ⏳."
          : succeededCount > 0
            ? `تم تنفيذ جزء من الطلب واسترداد $${failedAmount} USD للباقي تلقائياً.`
            : "فشل تنفيذ الشحن وتم استرداد المبلغ بالكامل إلى محفظة التاجر تلقائياً."
      : finalStatus === "success"
        ? "تم تنفيذ الشحن بنجاح وتسليم الباقة في اللعبة. 🎉"
        : finalStatus === "processing"
          ? "تم إرسال الطلب بنجاح وجاري المعالجة على سيرفر اللعبة (قيد المعالجة) ⏳."
          : "تعذر إكمال التنفيذ الفوري، تم حفظ الطلب للمراجعة.",
  };
}

let lastAutoSyncTime = 0;
let autoSyncInFlight = false;

export async function syncSingleOrderInternal(
  sb: any,
  order: any,
): Promise<{ status: string; updated: boolean; fazerResults: any[]; failMsg: string }> {
  const txIdsRaw = order.fazer_transaction_id;
  if (!txIdsRaw) {
    return { status: order.status, updated: false, fazerResults: [], failMsg: "" };
  }

  const txIds = txIdsRaw.split(",").map((s: string) => s.trim()).filter(Boolean);
  if (txIds.length === 0) {
    return { status: order.status, updated: false, fazerResults: [], failMsg: "" };
  }

  const fazerResults: any[] = [];
  let allCompleted = true;
  let anyFailed = false;
  let anyProcessing = false;
  let failMsg = "";

  for (const tid of txIds) {
    const fRes = await FazerCardsService.getOrder(tid);
    fazerResults.push(fRes);
    if (fRes.status === "completed") {
      // completed ok
    } else if (fRes.status === "failed" || fRes.status === "cancelled") {
      anyFailed = true;
      allCompleted = false;
      failMsg = fRes.failReason || "فشلت العملية في السيرفر";
    } else {
      anyProcessing = true;
      allCompleted = false;
    }
  }

  let newStatus = order.status;
  const nowIso = new Date().toISOString();

  if (allCompleted) {
    newStatus = "success";
    await sb
      .from("orders")
      .update({
        status: "success",
        delivered_at: order.delivered_at || nowIso,
        fazer_response: fazerResults,
        error_message: null,
        updated_at: nowIso,
      })
      .eq("id", order.id);
    return { status: newStatus, updated: newStatus !== order.status, fazerResults, failMsg };
  } else if (anyFailed) {
    newStatus = "failed";
    if (order.merchant_id && order.status !== "failed") {
      await issueMerchantRefund(
        sb,
        order.merchant_id,
        Number(order.total_egp || 0),
        order.order_ref,
        `استرداد تلقائي للطلب ${order.order_ref} بعد تأكيد تعذر الشحن من السيرفر`,
      );
    }
    await sb
      .from("orders")
      .update({
        status: "failed",
        error_message: failMsg || "فشلت العملية في السيرفر",
        fazer_response: fazerResults,
        updated_at: nowIso,
      })
      .eq("id", order.id);
    return { status: newStatus, updated: newStatus !== order.status, fazerResults, failMsg };
  } else if (anyProcessing) {
    newStatus = "processing";
    await sb
      .from("orders")
      .update({
        status: "processing",
        fazer_response: fazerResults,
        updated_at: nowIso,
      })
      .eq("id", order.id);
    return { status: newStatus, updated: newStatus !== order.status, fazerResults, failMsg };
  }

  return { status: newStatus, updated: false, fazerResults, failMsg };
}

export async function autoSyncPendingOrders(specificOrderId?: string): Promise<{ synced: number; updated: number }> {
  if (autoSyncInFlight) return { synced: 0, updated: 0 };
  const now = Date.now();
  if (!specificOrderId && now - lastAutoSyncTime < 2000) {
    return { synced: 0, updated: 0 };
  }

  autoSyncInFlight = true;
  lastAutoSyncTime = now;

  try {
    const sb = getAdminClient() as any;
    let query = sb
      .from("orders")
      .select("*")
      .in("status", ["processing", "pending"])
      .not("fazer_transaction_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (specificOrderId) {
      const isUid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(specificOrderId);
      query = isUid
        ? sb.from("orders").select("*").eq("id", specificOrderId)
        : sb.from("orders").select("*").eq("order_ref", specificOrderId);
    }

    const { data: pendingOrders } = await query;
    if (!pendingOrders || pendingOrders.length === 0) {
      return { synced: 0, updated: 0 };
    }

    const syncResults = await Promise.all(
      pendingOrders.map(async (ord: any) => {
        try {
          return await syncSingleOrderInternal(sb, ord);
        } catch (err) {
          console.error(`autoSyncPendingOrders error on ${ord.id}:`, err);
          return null;
        }
      })
    );
    const updatedCount = syncResults.filter((r) => r?.updated).length;
    return { synced: pendingOrders.length, updated: updatedCount };
  } catch (err) {
    console.error("autoSyncPendingOrders unexpected error:", err);
    return { synced: 0, updated: 0 };
  } finally {
    autoSyncInFlight = false;
  }
}

export async function syncOrderWithFazer(token: string, body: { order_id?: string; order_ref?: string }) {
  const { user } = await requireUser(token);
  const sb = getAdminClient() as any;
  const targetId = body.order_id || body.order_ref;
  if (!targetId) throw new Error("معرف الطلب مطلوب للمزامنة");

  const isUid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
  const { data: order, error: oErr } = await (isUid
    ? sb.from("orders").select("*").eq("id", targetId)
    : sb.from("orders").select("*").eq("order_ref", targetId)
  ).maybeSingle();

  if (oErr || !order) throw new Error("الطلب غير موجود");

  // Allow admin OR the merchant who owns this order
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    const { data: merchant } = await sb.from("merchant_accounts").select("id").eq("user_id", user.id).maybeSingle();
    if (!merchant || order.merchant_id !== merchant.id) {
      throw new Error("غير مصرح لك بمزامنة هذا الطلب");
    }
  }

  const syncRes = await syncSingleOrderInternal(sb, order);
  const { data: updatedOrder } = await sb.from("orders").select("*").eq("id", order.id).maybeSingle();

  return {
    success: true,
    order: updatedOrder || order,
    order_id: order.id,
    order_ref: order.order_ref,
    previous_status: order.status,
    new_status: syncRes.status,
    fazer_results: syncRes.fazerResults,
    message:
      syncRes.status === "success"
        ? "تم تأكيد اكتمال الشحن بنجاح! 🚀"
        : syncRes.status === "failed"
          ? `أكد السيرفر تعذر تنفيذ العملية (${syncRes.failMsg}). تم تحديث الحالة${order.merchant_id ? " واسترداد الرصيد للتاجر" : ""}.`
          : "العملية لا تزال قيد المعالجة المباشرة في السيرفر ⏳",
  };
}

export async function getMerchantDashboard(token: string) {
  const { user } = await requireUser(token);
  const sb = getAdminClient() as any;
  const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  let { data: merchant } = await sb.from("merchant_accounts").select("*").eq("user_id", user.id).maybeSingle();

  if (!merchant && profile?.role === "admin") {
    const { data: newMerch } = await sb
      .from("merchant_accounts")
      .insert({
        user_id: user.id,
        balance_egp: 50000,
        margin_percent: 0,
        is_active: true,
      })
      .select()
      .maybeSingle();
    if (newMerch) merchant = newMerch;
  }

  if (!merchant) return { profile, merchant: null, stats: null, orders: [], transactions: [] };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();
  let { data: orders } = await sb
    .from("orders")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Auto-sync any in-flight pending/processing orders for this merchant
  const processingOrders = (orders || []).filter((o: any) => ["pending", "processing"].includes(o.status));
  if (processingOrders.length > 0 && !process.env["VITEST"]) {
    try {
      const syncResults = await Promise.all(
        processingOrders.slice(0, 5).map((ord: any) => syncSingleOrderInternal(sb, ord).catch(() => null))
      );
      if (syncResults.some((r) => r?.updated)) {
        const [{ data: freshOrders }, { data: freshMerchant }] = await Promise.all([
          sb.from("orders").select("*").eq("merchant_id", merchant.id).order("created_at", { ascending: false }).limit(100),
          sb.from("merchant_accounts").select("*").eq("user_id", user.id).maybeSingle(),
        ]);
        if (freshOrders) orders = freshOrders;
        if (freshMerchant) Object.assign(merchant, freshMerchant);
      }
    } catch {}
  }

  const { data: ledger } = await sb
    .from("wallet_ledger")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const settings = await getCachedStoreSettings(sb);
  const egpRate = Number(settings?.egp_rate || DEFAULT_EGP_RATE);

  const list = (orders || []).map((o: any) => enrichOrderWithUsd(o, egpRate));
  const successfulOrProcessingOrders = list.filter((o: any) => !["failed", "cancelled"].includes(o.status));
  const totalSpentUsd = round3(successfulOrProcessingOrders.reduce((s: number, o: any) => s + (o.total_usd || 0), 0));
  const totalSpentEgp = round3(successfulOrProcessingOrders.reduce((s: number, o: any) => s + (Number(o.total_egp) || 0), 0));
  const balanceUsd = round3(Number(merchant.balance_egp || 0));

  const stats = {
    balance_egp: balanceUsd,
    balance_usd: balanceUsd,
    total_spent_usd: totalSpentUsd,
    total_spent_egp: totalSpentEgp,
    margin_percent: Number(merchant.margin_percent || 0),
    orders_today: list.filter((o: any) => o.created_at >= todayIso).length,
    delivered_today: list.filter(
      (o: any) => o.status === "success" && (o.delivered_at || o.updated_at || o.created_at) >= todayIso,
    ).length,
    incomplete_orders: list.filter((o: any) => ["pending", "processing", "incomplete", "failed"].includes(o.status)).length,
  };

  const formattedLedger = (ledger || []).map((t: any) => {
    const val = round3(Number(t.amount || 0));
    const balAfter = round3(Number(t.balance_after || 0));
    return {
      ...t,
      amount_egp: val,
      amount_usd: val,
      balance_after_egp: balAfter,
      balance_after_usd: balAfter,
    };
  });

  const customPricesMap = await getMerchantCustomPrices();
  const merchantCustomMap = customPricesMap[merchant.id] || {};
  const formattedCustomPrices: Record<string, number> = {};
  for (const [offId, val] of Object.entries(merchantCustomMap)) {
    const usd = extractCustomPriceUsd(val);
    if (usd !== null && usd > 0) {
      formattedCustomPrices[offId] = usd;
    }
  }

  const isUsd = profile?.region === "GLOBAL" || profile?.region === "US" || profile?.currency === "USD";
  return {
    profile,
    merchant: {
      ...merchant,
      balance_usd: balanceUsd,
      is_usd: isUsd,
      custom_prices: formattedCustomPrices,
    },
    stats,
    orders: list,
    transactions: formattedLedger,
    egp_rate: egpRate,
  };
}

export async function adminListMerchants(token: string, opts: { page: number; limit: number; q?: string }) {
  await requireAdmin(token);
  const sb = getAdminClient() as any;
  const page = Math.max(1, opts.page || 1);
  const limit = Math.min(50, Math.max(1, opts.limit || 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const [{ data: merchants, count }, settings, emailMap] = await Promise.all([
    sb
      .from("merchant_accounts")
      .select("*", { count: "exact" })
      .neq("id", "665c7a8e-0749-44d1-95b6-3f20dd56509c")
      .order("created_at", { ascending: false })
      .range(from, to),
    getCachedStoreSettings(sb),
    getUserEmailsMap(sb),
  ]);

  const egpRate = Number(settings?.egp_rate || DEFAULT_EGP_RATE);
  const userIds = (merchants || []).map((m: any) => m.user_id);
  const merchantIds = (merchants || []).map((m: any) => m.id);

  const { data: profiles } = userIds.length
    ? await sb.from("profiles").select("id,full_name,phone,region,role").in("id", userIds)
    : { data: [] };
  const pmap = new Map((profiles || []).map((p: any) => [p.id, p]));

  // Calculate real realized profit in USD for each merchant from successful orders
  const merchantProfitMap = new Map<string, number>();
  if (merchantIds.length > 0) {
    const { data: merchantOrders } = await sb
      .from("orders")
      .select("merchant_id, items, total_egp, status")
      .in("merchant_id", merchantIds)
      .eq("status", "success");

    for (const ord of merchantOrders || []) {
      const items = Array.isArray(ord.items) ? ord.items : [];
      let totalCostUsd = 0;
      let totalUsd = 0;
      for (const it of items) {
        const q = Number(it.qty || 1);
        const uCost = Number(it.unit_cost_usd ?? it.cost_usd ?? 0);
        const uPriceUsd = it.unit_price_usd ?? (it.unit_price_egp ? it.unit_price_egp / egpRate : uCost);
        totalCostUsd += uCost * q;
        totalUsd += Number(uPriceUsd || 0) * q;
      }
      if (!totalUsd && Number(ord.total_egp) > 0) {
        totalUsd = Number(ord.total_egp) / egpRate;
      }
      const profitUsd = round3(totalUsd - totalCostUsd);
      const curr = merchantProfitMap.get(ord.merchant_id) || 0;
      merchantProfitMap.set(ord.merchant_id, round3(curr + profitUsd));
    }
  }

  const q = (opts.q || "").trim().toLowerCase();
  let rows = (merchants || [])
    .filter((m: any) => {
      const prof = pmap.get(m.user_id) as any;
      return !prof?.full_name?.startsWith("[DELETED]");
    })
    .map((m: any) => ({
      ...m,
      balance_egp: Number(m.balance_egp || 0),
      balance_usd: round3(Number(m.balance_egp || 0)),
      profit_usd: round3(merchantProfitMap.get(m.id) || 0),
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
  const note = body.note;

  const usd = Number(body.amount_usd ?? body.amountUsd ?? body.amount);
  if (!merchantId || !Number.isFinite(usd) || usd <= 0) throw new Error("مبلغ الشحن بالدولار يجب أن يكون رقماً أكبر من صفر");

  const amountUsd = round3(usd);
  const finalNote = note || `شحن رصيد $${amountUsd.toFixed(2)}`;

  let res = await sbAdmin.rpc("admin_credit_merchant", {
    p_merchant_id: merchantId,
    p_amount: amountUsd,
    p_note: finalNote,
    p_reference_type: "admin",
    p_reference_id: null,
  });
  if (res.error) {
    // direct atomic fallback if rpc is unavailable
    const { data: currentMerch } = await sbAdmin
      .from("merchant_accounts")
      .select("balance_egp")
      .eq("id", merchantId)
      .maybeSingle();
    const newBal = round3((Number(currentMerch?.balance_egp) || 0) + amountUsd);
    const { error: updErr } = await sbAdmin
      .from("merchant_accounts")
      .update({ balance_egp: newBal, updated_at: new Date().toISOString() })
      .eq("id", merchantId);
    if (updErr) throw new Error(res.error.message || updErr.message);

    await sbAdmin.from("wallet_ledger").insert({
      merchant_id: merchantId,
      amount: amountUsd,
      entry_type: "credit",
      reference_type: "admin",
      reference_id: null,
      balance_after: newBal,
      note: finalNote,
    });
    return { success: true, amount_usd: amountUsd, amount_egp: amountUsd, result: [{ merchant_id: merchantId, new_balance: newBal }] };
  }
  return { success: true, amount_usd: amountUsd, amount_egp: amountUsd, result: res.data };
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
  if (res.error) {
    const directRes = await sbAdmin
      .from("merchant_accounts")
      .update({ margin_percent: margin, updated_at: new Date().toISOString() })
      .eq("id", merchantId);
    if (directRes.error) throw new Error(res.error.message || directRes.error.message);
  }
  return { success: true };
}

export async function adminCreateMerchant(
  token: string,
  body: {
    email: string;
    password: string;
    fullName?: string | undefined;
    phone?: string | undefined;
    region?: string | undefined;
    country?: string | undefined;
    marginPercent?: number | undefined;
    initialBalanceEgp?: number | undefined;
    initialBalanceUsd?: number | undefined;
  },
) {
  await requireAdmin(token);
  const sb = getAdminClient();
  const sba = sb as any;

  const email = (body.email || "").trim().toLowerCase();
  const password = (body.password || "").trim();
  const fullName = (body.fullName || "تاجر معتمد").trim();
  const phone = (body.phone || "").trim() || null;
  const region = (body.region || body.country || "EG").trim().toUpperCase();
  const marginPercent = Math.min(50, Math.max(0, Number(body.marginPercent ?? 5) || 0));

  const { data: sRow } = await sba.from("store_settings").select("egp_rate").eq("id", 1).maybeSingle();
  const egpRate = Number(sRow?.egp_rate || DEFAULT_EGP_RATE);

  let initialBalanceEgp = Math.max(0, Number(body.initialBalanceEgp ?? 0) || 0);
  if (body.initialBalanceUsd != null && Number(body.initialBalanceUsd) > 0) {
    initialBalanceEgp = Math.round(Number(body.initialBalanceUsd) * egpRate * 100) / 100;
  }

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
      region,
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
      note: body.initialBalanceUsd
        ? `رصيد افتتاحي $${body.initialBalanceUsd} (${initialBalanceEgp} ج.م)`
        : "رصيد افتتاحي لحساب التاجر",
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
    merchant: {
      ...merchantRow,
      email,
      profile: { id: targetUserId, role: "merchant", full_name: fullName, phone, region },
    },
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

export async function adminSetMerchantBalance(token: string, body: any) {
  await requireAdmin(token);
  const sbAdmin = getAdminClient() as any;
  const merchantId = body.merchant_id || body.merchantId;
  if (!merchantId) throw new Error("معرف التاجر مطلوب");

  const { data: merchant, error: mErr } = await sbAdmin
    .from("merchant_accounts")
    .select("*")
    .eq("id", merchantId)
    .maybeSingle();
  if (mErr || !merchant) throw new Error("حساب التاجر غير موجود");

  const currentBalanceUsd = Number(merchant.balance_egp || 0);
  const rawUsd = Number(body.balance_usd ?? body.balanceUsd ?? body.amount ?? body.balance_egp);
  if (!Number.isFinite(rawUsd) || rawUsd < 0) throw new Error("الرصيد بالدولار يجب أن يكون صفراً أو موجباً");

  const newBalanceUsd = round3(rawUsd);
  const diff = round3(newBalanceUsd - currentBalanceUsd);
  const nowIso = new Date().toISOString();
  const note = body.note || `تعديل الرصيد إلى $${newBalanceUsd.toFixed(2)}`;

  const { error: upErr } = await sbAdmin
    .from("merchant_accounts")
    .update({ balance_egp: newBalanceUsd, updated_at: nowIso })
    .eq("id", merchantId);
  if (upErr) throw new Error(upErr.message);

  if (diff !== 0) {
    await sbAdmin.from("wallet_ledger").insert({
      merchant_id: merchantId,
      amount: diff,
      balance_after: newBalanceUsd,
      entry_type: "adjustment",
      note,
      created_at: nowIso,
    });
  }

  return {
    success: true,
    merchant_id: merchantId,
    previous_balance_usd: currentBalanceUsd,
    balance_usd: newBalanceUsd,
    balance_egp: newBalanceUsd,
    merchant: { ...merchant, balance_egp: newBalanceUsd },
  };
}

export async function adminDeleteMerchant(token: string, body: any) {
  await requireAdmin(token);
  const sbAdmin = getAdminClient() as any;
  const merchantId = body.merchant_id || body.merchantId;
  if (!merchantId) throw new Error("معرف التاجر مطلوب");

  const { data: merchant } = await sbAdmin
    .from("merchant_accounts")
    .select("*")
    .eq("id", merchantId)
    .maybeSingle();
  if (!merchant) throw new Error("حساب التاجر غير موجود أو تم حذفه مسبقاً");

  // 1. Safely deactivate merchant account and zero out balance
  await sbAdmin
    .from("merchant_accounts")
    .update({ is_active: false, balance_egp: 0, updated_at: new Date().toISOString() })
    .eq("id", merchantId);

  // 2. Clear merchant_id on orders if requested, or leave audit trail
  // 3. Update profile role to 'customer' and prefix name to hide from listings
  const { data: prof } = await sbAdmin.from("profiles").select("full_name").eq("id", merchant.user_id).maybeSingle();
  const currentName = prof?.full_name || "تاجر";
  const markedName = currentName.startsWith("[DELETED]") ? currentName : `[DELETED] ${currentName}`;
  await sbAdmin.from("profiles").update({ role: "customer", full_name: markedName }).eq("id", merchant.user_id);

  // 4. Try removing merchant_accounts row if no FK constraint blocks it
  try {
    await sbAdmin.from("merchant_accounts").delete().eq("id", merchantId);
  } catch {
    // Soft-deactivated above if FK prevents hard delete
  }

  // 5. Delete auth user if allowed
  try {
    const authAdmin = (sbAdmin as any).auth?.admin;
    if (authAdmin && typeof authAdmin.deleteUser === "function") {
      await authAdmin.deleteUser(merchant.user_id);
    }
  } catch {
    // Non-fatal if auth delete is restricted
  }

  return { success: true, deleted_id: merchantId };
}

export async function adminGetMerchantDetails(token: string, merchantId: string) {
  await requireAdmin(token);
  if (!merchantId) throw new Error("معرف التاجر مطلوب");
  const sbAdmin = getAdminClient() as any;

  const { data: merchant, error: mErr } = await sbAdmin
    .from("merchant_accounts")
    .select("*")
    .eq("id", merchantId)
    .maybeSingle();
  if (mErr || !merchant) throw new Error("حساب التاجر غير موجود");

  const { data: profile } = await sbAdmin
    .from("profiles")
    .select("*")
    .eq("id", merchant.user_id)
    .maybeSingle();

  let email: string | null = null;
  try {
    const authAdmin = (sbAdmin as any).auth?.admin;
    if (authAdmin && typeof authAdmin.getUserById === "function") {
      const { data: uData } = await authAdmin.getUserById(merchant.user_id);
      if (uData?.user?.email) email = uData.user.email;
    }
  } catch {
    // ignore
  }

  const [ordersRes, ledgerRes, settingsRes, packagesRes] = await Promise.all([
    sbAdmin
      .from("orders")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(25),
    sbAdmin
      .from("wallet_ledger")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(30),
    sbAdmin.from("store_settings").select("*").eq("id", 1).maybeSingle(),
    sbAdmin
      .from("fazer_packages")
      .select("*")
      .eq("active", true)
      .order("game_id", { ascending: true })
      .order("diamonds", { ascending: true })
      .limit(1000),
  ]);

  const egpRate = Number(settingsRes.data?.egp_rate || DEFAULT_EGP_RATE);
  const marginPercent = Number(merchant.margin_percent || 0);

  const customPricesAll = await getMerchantCustomPrices();
  const merchantCustomMap = customPricesAll[merchantId] || {};

  // Compute exact package pricing preview for this merchant
  const packagesPreview = (packagesRes.data || []).map((p: any) => {
    const costUsd = round3(Number(p.cost_usd || 0));
    const costEgp = calcCostEgp(costUsd, egpRate);
    const standardMerchantPriceEgp = calcMerchantUnitPriceEgp(
      p.merchant_base_price_egp || costEgp,
      marginPercent,
      costUsd,
      egpRate,
    );
    const standardMerchantUsd = round3(standardMerchantPriceEgp / egpRate);
    const customEntry = merchantCustomMap[p.offer_id];
    const customPriceUsd = extractCustomPriceUsd(customEntry);
    const isCustomPrice = customPriceUsd !== null && customPriceUsd > 0;
    const merchantPriceUsd = isCustomPrice ? customPriceUsd : standardMerchantUsd;
    const merchantPriceEgp = isCustomPrice ? round3(customPriceUsd * egpRate) : standardMerchantPriceEgp;
    const retailPrice = calcRetailPriceEgp(costUsd, egpRate);
    const profitPerUnitEgp = Math.max(0, round3(merchantPriceEgp - costEgp));
    const profitPerUnitUsd = Math.max(0, round3(merchantPriceUsd - costUsd));

    return {
      id: p.id,
      offerId: p.offer_id,
      gameId: p.game_id,
      name: p.name,
      diamonds: Number(p.diamonds || 0),
      regions: p.regions || null,
      costUsd,
      costEgp,
      isCustomPrice,
      customPriceUsd: isCustomPrice ? customPriceUsd : null,
      customPriceEgp: isCustomPrice ? merchantPriceEgp : null,
      standardMerchantPriceEgp,
      standardMerchantUsd,
      merchantPriceEgp,
      merchantPriceUsd,
      retailPriceEgp: retailPrice,
      profitPerUnitEgp,
      profitPerUnitUsd,
      marginPercent,
      merchantBasePriceEgp: p.merchant_base_price_egp || costEgp,
      active: p.active !== false,
    };
  });

  const enrichedOrders = (ordersRes.data || []).map((o: any) => enrichOrderWithUsd(o, egpRate));
  const successfulOrProcessingOrders = enrichedOrders.filter((o: any) => !["failed", "cancelled"].includes(o.status));
  const totalSpentUsd = round3(successfulOrProcessingOrders.reduce((s: number, o: any) => s + (o.total_usd || 0), 0));
  const totalSpentEgp = round3(successfulOrProcessingOrders.reduce((s: number, o: any) => s + (Number(o.total_egp) || 0), 0));
  const balanceUsd = round3(Number(merchant.balance_egp || 0));
  const initialCreditUsd = round3(balanceUsd + totalSpentUsd);
  const initialCreditEgp = round3(balanceUsd + totalSpentUsd);

  const formattedLedger = (ledgerRes.data || []).map((t: any) => {
    const val = round3(Number(t.amount || 0));
    const balAfter = round3(Number(t.balance_after || 0));
    return {
      ...t,
      amount_egp: val,
      amount_usd: val,
      balance_after_egp: balAfter,
      balance_after_usd: balAfter,
    };
  });

  return {
    merchant: {
      ...merchant,
      balance_egp: Number(merchant.balance_egp || 0),
      balance_usd: balanceUsd,
      total_spent_usd: totalSpentUsd,
      total_spent_egp: totalSpentEgp,
      initial_credit_usd: initialCreditUsd,
      initial_credit_egp: initialCreditEgp,
      margin_percent: marginPercent,
      profile,
      email,
    },
    orders: enrichedOrders,
    transactions: formattedLedger,
    packagesPreview,
    egpRate,
  };
}

export async function adminListRecentOrders(token: string, limit = 50) {
  await requireAdmin(token);
  const sba = getAdminClient() as any;
  let { data: orders, error } = await sba
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(100, Math.max(1, limit)));
  if (error) throw new Error(error.message);

  // Auto-sync in-flight pending/processing orders live with the game server
  const hasProcessing = (orders || []).some((o: any) => ["pending", "processing"].includes(o.status));
  if (hasProcessing && !process.env["VITEST"]) {
    try {
      const syncRes = await autoSyncPendingOrders();
      if (syncRes.updated > 0) {
        const { data: freshOrders } = await sba
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(Math.min(100, Math.max(1, limit)));
        if (freshOrders) orders = freshOrders;
      }
    } catch {}
  }

  const settings = await getCachedStoreSettings(sba);
  const egpRate = Number(settings?.egp_rate || 55);

  const merchantIds = [...new Set((orders || []).map((o: any) => o.merchant_id).filter(Boolean))];
  const userIds = [...new Set((orders || []).map((o: any) => o.user_id).filter(Boolean))];

  const merchantsMap = new Map<string, any>();
  if (merchantIds.length > 0) {
    const { data: merchants } = await sba
      .from("merchant_accounts")
      .select("id, user_id, margin_percent")
      .in("id", merchantIds);
    for (const m of merchants || []) {
      merchantsMap.set(m.id, m);
      if (m.user_id) userIds.push(m.user_id);
    }
  }

  const uniqueUserIds = [...new Set(userIds)];
  const profilesMap = new Map<string, any>();
  if (uniqueUserIds.length > 0) {
    const { data: profiles } = await sba
      .from("profiles")
      .select("id, full_name, phone, role")
      .in("id", uniqueUserIds);
    for (const p of profiles || []) {
      profilesMap.set(p.id, p);
    }
  }

  const emailMap = await getUserEmailsMap(sba);

  const enriched = (orders || []).map((o: any) => {
    const isMerchant = Boolean(o.merchant_id);
    const mAccount = o.merchant_id ? merchantsMap.get(o.merchant_id) : null;
    const mUserId = mAccount?.user_id;
    const mProfile = mUserId ? profilesMap.get(mUserId) : null;
    const mEmail = mUserId ? emailMap.get(mUserId) : null;

    const uProfile = o.user_id ? profilesMap.get(o.user_id) : null;
    const uEmail = o.user_id ? emailMap.get(o.user_id) : null;

    const items = Array.isArray(o.items) ? o.items : [];
    let totalCostUsd = 0;
    let totalUsd = 0;
    for (const it of items) {
      const q = Number(it.qty || 1);
      const uCost = Number(it.unit_cost_usd || it.cost_usd || 0);
      const uPriceUsd = it.unit_price_usd ?? (it.unit_price_egp ? it.unit_price_egp / egpRate : uCost);
      totalCostUsd += uCost * q;
      totalUsd += Number(uPriceUsd || 0) * q;
    }
    const totalEgp = Number(o.total_egp || 0);
    if (!totalUsd && totalEgp > 0) {
      totalUsd = totalEgp / egpRate;
    }
    const profitUsd = round3(totalUsd - totalCostUsd);
    const costEgp = round3(totalCostUsd * egpRate);
    const profitEgp = round3(profitUsd * egpRate);
    const extractedPlayerName = o.player_name || items[0]?.player_name || null;

    return {
      ...o,
      player_name: extractedPlayerName,
      is_merchant: isMerchant,
      merchant_email: mEmail || null,
      merchant_name: mProfile?.full_name || null,
      customer_email: uEmail || null,
      customer_name: uProfile?.full_name || null,
      customer_phone: uProfile?.phone || null,
      total_cost_usd: round3(totalCostUsd),
      total_usd: round3(totalUsd),
      profit_usd: profitUsd,
      cost_egp: costEgp,
      profit_egp: profitEgp,
      egp_rate_used: egpRate,
    };
  }).filter((o: any) => o.merchant_id !== "665c7a8e-0749-44d1-95b6-3f20dd56509c");

  return { orders: enriched };
}

export async function adjustMerchantBalancesForFxRateChange(sb: any, oldRate: number, targetRate: number) {
  // RULE ENFORCED: رصيد التاجر ثابت تماماً ومحمي ولا يتغير نهائياً إلا إذا قام الأدمن بتعديله يدوياً.
  // تغير سعر الصرف أو سعر الدولار لا يؤثر إطلاقاً على رصيد التاجر الحالي في المحفظة.
  return;
}

export async function adminUpdateEgpRate(
  token: string,
  params: number | { egpRate?: number; egp_rate?: number; mode?: "manual" | "binance_auto" },
) {
  await requireAdmin(token);
  const targetRate =
    typeof params === "number"
      ? params
      : Number(params.egpRate ?? params.egp_rate);
  const mode = typeof params === "object" && params.mode ? params.mode : "manual";

  if (!Number.isFinite(targetRate) || targetRate <= 0) throw new Error("سعر صرف غير صالح");
  const sb = getAdminClient() as any;
  const nowIso = new Date().toISOString();

  const { data: currentSettings } = await sb.from("store_settings").select("egp_rate").eq("id", 1).maybeSingle();
  const oldRate = Number(currentSettings?.egp_rate || DEFAULT_EGP_RATE);

  const { error } = await sb
    .from("store_settings")
    .update({ egp_rate: targetRate, updated_at: nowIso })
    .eq("id", 1);
  if (error) throw new Error(error.message);

  if (oldRate > 0 && Math.abs(oldRate - targetRate) > 0.001) {
    await adjustMerchantBalancesForFxRateChange(sb, oldRate, targetRate);
  }

  // Persist FX settings with mode: 'manual' (locks the rate from being auto-overwritten)
  const { data: existing } = await sb
    .from("fazer_packages")
    .select("raw")
    .eq("offer_id", "config:fx_settings")
    .maybeSingle();

  const prevRaw = (existing?.raw as any) || {};
  await sb.from("fazer_packages").upsert({
    offer_id: "config:fx_settings",
    game_id: "system",
    name: "FX Settings",
    active: false,
    raw: {
      ...prevRaw,
      mode,
      manual_rate: targetRate,
      manual_updated_at: nowIso,
      updated_by: "admin",
    },
  });

  invalidateStoreSettingsCache();

  return { success: true, egp_rate: targetRate, mode };
}

export async function adminSyncBinanceRate(token: string) {
  await requireAdmin(token);
  const sb = getAdminClient() as any;
  const { fetchBinanceUsdtEgp } = await import("./fx.service");
  const liveBinance = await fetchBinanceUsdtEgp();
  if (!liveBinance || liveBinance <= 0) {
    throw new Error("تعذر جلب سعر بينانس P2P اللحظي، يرجى المحاولة لاحقاً أو التحديد يدوياً.");
  }

  const nowIso = new Date().toISOString();
  const { data: currentSettings } = await sb.from("store_settings").select("egp_rate").eq("id", 1).maybeSingle();
  const currentRate = Number(currentSettings?.egp_rate || DEFAULT_EGP_RATE);

  const { data: existing } = await sb
    .from("fazer_packages")
    .select("raw")
    .eq("offer_id", "config:fx_settings")
    .maybeSingle();

  const prevRaw = (existing?.raw as any) || {};
  await sb.from("fazer_packages").upsert({
    offer_id: "config:fx_settings",
    game_id: "system",
    name: "FX Settings",
    active: false,
    raw: {
      ...prevRaw,
      mode: "manual",
      binance_rate: liveBinance,
      binance_updated_at: nowIso,
      updated_by: "admin",
    },
  });

  return { success: true, egp_rate: currentRate, binance_rate: liveBinance, mode: "manual" };
}

export async function getMyProfile(token: string) {
  const { user, client } = await requireUser(token);
  const sb = client as any;
  const sba = getAdminClient() as any;
  const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const { data: merchant } = await sba.from("merchant_accounts").select("*").eq("user_id", user.id).maybeSingle();
  return { user: { id: user.id, email: user.email }, profile, merchant };
}

export async function adminSetMerchantRegion(
  token: string,
  body: { merchantId?: string; merchant_id?: string; userId?: string; user_id?: string; region: string },
) {
  await requireAdmin(token);
  const region = (body.region || "EG").trim().toUpperCase();
  const sb = getAdminClient() as any;
  let targetUserId = body.userId || body.user_id;
  const merchantId = body.merchantId || body.merchant_id;
  if (!targetUserId && merchantId) {
    const { data: m } = await sb.from("merchant_accounts").select("user_id").eq("id", merchantId).maybeSingle();
    targetUserId = m?.user_id;
  }
  if (!targetUserId) throw new Error("معرف التاجر غير موجود");
  const { data, error } = await sb
    .from("profiles")
    .update({ region, updated_at: new Date().toISOString() })
    .eq("id", targetUserId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { success: true, profile: data };
}

export async function updateMyNationality(token: string, region: string) {
  const { user } = await requireUser(token);
  const cleanRegion = (region || "EG").trim().toUpperCase();
  const sb = getAdminClient() as any;
  const { data, error } = await sb
    .from("profiles")
    .update({ region: cleanRegion, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { success: true, profile: data };
}

export async function adminUpdatePackagePrice(
  token: string,
  body: {
    offerId?: string | undefined;
    offer_id?: string | undefined;
    costUsd?: number | undefined;
    cost_usd?: number | undefined;
    name?: string | undefined;
    active?: boolean | undefined;
  },
) {
  await requireAdmin(token);
  const offerId = (body.offerId || body.offer_id || "").trim();
  const costUsd = Number(body.costUsd ?? body.cost_usd);

  if (!offerId) throw new Error("معرف الباقة (offerId) مطلوب");
  if (!Number.isFinite(costUsd) || costUsd <= 0) {
    throw new Error("سعر التكلفة بالدولار يجب أن يكون رقماً أكبر من صفر");
  }

  const sb = getAdminClient() as any;
  const nowIso = new Date().toISOString();

  const { data: existing, error: fetchErr } = await sb
    .from("fazer_packages")
    .select("*")
    .eq("offer_id", offerId)
    .maybeSingle();

  if (fetchErr || !existing) {
    throw new Error("الباقة غير موجودة في قاعدة البيانات");
  }

  const prevRaw = (existing.raw as any) || {};
  const updatedRaw = {
    ...prevRaw,
    custom_cost_usd: costUsd,
    cost_edited_by_admin: true,
    admin_edited_at: nowIso,
  };

  const updateFields: Record<string, any> = {
    cost_usd: Math.round(costUsd * 10000) / 10000,
    raw: updatedRaw,
    updated_at: nowIso,
  };

  if (typeof body.name === "string" && body.name.trim()) {
    updateFields["name"] = body.name.trim();
  }
  if (typeof body.active === "boolean") {
    updateFields["active"] = body.active;
  }

  const { data: updated, error: updateErr } = await sb
    .from("fazer_packages")
    .update(updateFields)
    .eq("offer_id", offerId)
    .select()
    .single();

  if (updateErr) throw new Error(updateErr.message);

  // If MLBB package, re-curate to update composite package formulas immediately
  if (existing.game_id === "mlbb") {
    try {
      await curateMlbbPackages(sb);
    } catch (e) {
      console.error("Failed to curate MLBB packages after price update:", e);
    }
  }

  return { success: true, package: updated };
}

export async function getOrderStatus(targetRefOrId: string) {
  const sb = getAdminClient() as any;
  const clean = String(targetRefOrId || "").trim();
  if (!clean) return { found: false };

  const isUid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
  const q = isUid
    ? sb.from("orders").select("*").eq("id", clean)
    : sb.from("orders").select("*").eq("order_ref", clean);
  const { data: order } = await q.maybeSingle();

  if (!order) return { found: false };

  const items = Array.isArray(order.items) ? order.items : [];
  const playerName = order.player_name || items[0]?.player_name || null;

  return {
    found: true,
    id: order.id,
    order_ref: order.order_ref,
    status: order.status,
    total_egp: Number(order.total_egp || 0),
    game_id: order.game_id,
    player_id: order.player_id,
    player_name: playerName,
    items,
    region: order.region,
    account_region: order.account_region,
    error_message: order.error_message,
    created_at: order.created_at,
    delivered_at: order.delivered_at,
  };
}

export async function adminCancelAndRefundOrder(token: string, opts: { orderId: string; reason?: string | undefined }) {
  await requireAdmin(token);
  const sb = getAdminClient() as any;
  const orderId = opts.orderId?.trim();
  if (!orderId) throw new Error("معرف الطلب مطلوب");

  const { data: order, error: oerr } = await sb
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (oerr || !order) throw new Error("الطلب غير موجود");

  // Check if already refunded in wallet_ledger
  let alreadyRefunded = false;
  if (order.merchant_id) {
    const { data: existingRefund } = await sb
      .from("wallet_ledger")
      .select("id")
      .eq("merchant_id", order.merchant_id)
      .eq("entry_type", "refund")
      .eq("reference_id", order.order_ref)
      .maybeSingle();
    if (existingRefund) {
      alreadyRefunded = true;
    }
  }

  if (alreadyRefunded && (order.status === "failed" || order.status === "cancelled")) {
    throw new Error("تم استرداد هذا الطلب مسبقاً بالفعل في محفظة التاجر");
  }

  const reason = opts.reason?.trim() || "تم الإلغاء والاسترداد اليدوي بواسطة الإدارة";
  const nowIso = new Date().toISOString();

  // Refund merchant if not yet refunded in pure USD
  const orderUsd = round3(
    order.items && Array.isArray(order.items)
      ? order.items.reduce((s: number, i: any) => s + Number(i.total_usd || 0), 0)
      : (order.total_egp ? order.total_egp / 55.55 : 0)
  );

  if (!alreadyRefunded && order.merchant_id && orderUsd > 0) {
    await issueMerchantRefund(
      sb,
      order.merchant_id,
      orderUsd,
      order.order_ref,
      `استرداد يدوي بواسطة الإدارة للطلب ${order.order_ref} ($${orderUsd.toFixed(2)}): ${reason}`,
    );
  }

  // Update order status to failed
  const { error: updErr } = await sb
    .from("orders")
    .update({
      status: "failed",
      error_message: reason,
      updated_at: nowIso,
    })
    .eq("id", order.id);

  if (updErr) throw new Error(updErr.message);

  return {
    success: true,
    orderId: order.id,
    orderRef: order.order_ref,
    status: "failed",
    message: `تم إلغاء الطلب ${order.order_ref} واسترداد الرصيد للتاجر بنجاح ✅`,
  };
}
