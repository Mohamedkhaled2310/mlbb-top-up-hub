import { FazerCardsService } from "./fazercards.service";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function getEnv(name: string) {
  return process.env[name] || process.env[`VITE_${name}`] || "";
}

function getAuthedClient(token: string) {
  const url = getEnv("SUPABASE_URL");
  const anon = getEnv("SUPABASE_PUBLISHABLE_KEY") || getEnv("SUPABASE_ANON_KEY");
  if (!url || !anon) throw new Error("Missing Supabase env");
  return createClient<Database>(url, anon, {
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
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("forbidden");
  return { user, client };
}

const DEFAULT_EGP_RATE = 50;
const DEFAULT_RETAIL_MARKUP = 0.2; // 20% default retail over cost*egp if not specified
const DEFAULT_MERCHANT_MARKUP = 0.1;

async function syncFazerInternal() {
  const sb = supabaseAdmin as any;
  const account = await FazerCardsService.checkAccount();
  const catalog = await FazerCardsService.fetchCatalog();
  const updates: any = { updated_at: new Date().toISOString() };
  if (account.connected) {
    updates.fazer_balance = account.balance ?? null;
    updates.fazer_balance_currency = account.currency ?? null;
    updates.fazer_balance_updated_at = new Date().toISOString();
  }
  let upserted = 0;
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
      updated_at: new Date().toISOString(),
    }));
    const { error } = await sb.from("fazer_packages").upsert(rows, { onConflict: "offer_id" });
    if (!error) {
      upserted = rows.length;
      updates.packages_synced_at = new Date().toISOString();
    }
  }
  await sb.from("store_settings").update(updates).eq("id", 1);
  return { ok: true, account, catalog: { ok: catalog.ok, count: upserted, message: catalog.message }, settings: updates };
}

export async function getStoreData(gameId?: string) {
  const sb = supabaseAdmin as any;
  let { data: settingsRow } = await sb.from("store_settings").select("*").eq("id", 1).maybeSingle();
  let egpRate = Number(settingsRow?.egp_rate || DEFAULT_EGP_RATE);
  let q = sb.from("fazer_packages").select("*").eq("active", true).order("updated_at", { ascending: false }).limit(500);
  if (gameId) q = q.eq("game_id", gameId);
  let { data: pkgs } = await q;

  // auto-sync on first load / empty cache so store works when API key is configured
  if (!pkgs || pkgs.length === 0) {
    try {
      await syncFazerInternal();
      const s2 = await sb.from("store_settings").select("*").eq("id", 1).maybeSingle();
      settingsRow = s2.data || settingsRow;
      egpRate = Number(settingsRow?.egp_rate || DEFAULT_EGP_RATE);
      let q2 = sb.from("fazer_packages").select("*").eq("active", true).order("updated_at", { ascending: false }).limit(500);
      if (gameId) q2 = q2.eq("game_id", gameId);
      pkgs = (await q2).data || pkgs;
    } catch { /* ignore sync errors, return empty state */ }
  }

  const packages = (pkgs || []).map((p: any) => {
    const costUsd = Number(p.cost_usd || 0);
    const retail = costUsd > 0 ? Math.ceil(costUsd * egpRate * (1 + DEFAULT_RETAIL_MARKUP)) : 0;
    const merchantBase = costUsd > 0 ? Math.ceil(costUsd * egpRate * (1 + DEFAULT_MERCHANT_MARKUP)) : 0;
    return {
      id: p.offer_id,
      offerId: p.offer_id,
      gameId: p.game_id,
      name: p.name,
      category: p.category || "diamonds",
      diamonds: Number(p.diamonds || 0),
      bonusDiamonds: Number(p.bonus_diamonds || 0),
      currencyName: p.currency_name || undefined,
      costUsd,
      retailPriceEgp: retail,
      merchantBasePriceEgp: merchantBase,
      regions: Array.isArray(p.regions) ? p.regions : p.regions ? p.regions : null,
      active: !!p.active,
      raw: p.raw,
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
    },
  };
}

export async function syncFazerPackagesAndBalance(opts: { token?: string | null; secret?: string | null }) {
  // allow admin token OR cron secret
  const cronSecret = process.env.CRON_SECRET || process.env.SYNC_SECRET;
  const isCron = !!(opts.secret && cronSecret && opts.secret === cronSecret);
  if (!isCron) {
    if (!opts.token) return { ok: false, error: "unauthorized" };
    try { await requireAdmin(opts.token); } catch (e: any) { return { ok: false, error: e?.message || "forbidden" }; }
  }
  return await syncFazerInternal();
}

function normalizeRegion(r?: string | null) {
  return (r || "").trim().toLowerCase();
}

export async function submitCustomerOrder(body: any, token?: string | null) {
  const sb = supabaseAdmin as any;
  const items: Array<{ offerId: string; qty: number }> = Array.isArray(body?.items) ? body.items : [];
  const playerId = String(body?.playerId || "").trim();
  const zoneId = String(body?.zoneId || "").trim();
  const gameId = String(body?.gameId || "mlbb");
  const region = String(body?.region || "").trim();
  const asMerchant = !!body?.asMerchant;

  if (!playerId) return { success: false, error: "يرجى إدخال معرف اللاعب" };
  if (!region) return { success: false, error: "يرجى اختيار/تحديد منطقة الحساب (Region)" };
  if (!items.length) return { success: false, error: "يرجى اختيار باقة واحدة على الأقل" };

  // resolve user/merchant
  let userId: string | null = null;
  let merchant: any = null;
  if (token) {
    try {
      const { user } = await requireUser(token);
      userId = user.id;
      const { data: m } = await sb.from("merchant_accounts").select("*").eq("user_id", user.id).eq("is_active", true).maybeSingle();
      merchant = m;
    } catch { /* guest allowed for customer flow */ }
  }
  if (asMerchant) {
    if (!merchant) return { success: false, error: "حساب التاجر غير موجود أو غير مفعل. سجّل الدخول بحساب تاجر." };
  }

  // fetch packages
  const offerIds = items.map((i) => String(i.offerId));
  const { data: pkgs } = await sb.from("fazer_packages").select("*").in("offer_id", offerIds).eq("active", true);
  const byId = new Map((pkgs || []).map((p: any) => [p.offer_id, p]));
  if (byId.size !== offerIds.length) return { success: false, error: "بعض الباقات غير متاحة حاليًا، حدّث الصفحة وحاول مرة أخرى." };

  const { data: settingsRow } = await sb.from("store_settings").select("*").eq("id", 1).maybeSingle();
  const egpRate = Number(settingsRow?.egp_rate || DEFAULT_EGP_RATE);

  // region check per package (if package defines regions)
  for (const it of items) {
    const p: any = byId.get(String(it.offerId));
    const pregions = Array.isArray(p?.regions) ? p.regions.map(normalizeRegion) : [];
    if (pregions.length && !pregions.includes(normalizeRegion(region))) {
      return { success: false, error: `الباقة "${p.name}" غير متاحة لمنطقة ${region}.` };
    }
  }

  // validate player (and region) once
  const validation = await FazerCardsService.validatePlayer(playerId, zoneId, gameId, region);
  if (!validation.valid) return { success: false, error: validation.error || "تعذر التحقق من اللاعب" };
  const accRegion = (validation as any).accountRegion || null;
  if (accRegion && normalizeRegion(accRegion) && normalizeRegion(accRegion) !== normalizeRegion(region)) {
    return { success: false, error: `منطقة الحساب (${accRegion}) لا تطابق المنطقة المختارة (${region}).` };
  }

  const merchantMargin = merchant ? Number(merchant.margin_percent || 0) : 0;
  const retailMarkup = DEFAULT_RETAIL_MARKUP;
  const merchantMarkup = DEFAULT_MERCHANT_MARKUP;

  const orderItems = items.map((it) => {
    const p: any = byId.get(String(it.offerId));
    const qty = Math.max(1, Math.min(20, Number(it.qty || 1)));
    const costUsd = Number(p.cost_usd || 0);
    const unitPrice = asMerchant
      ? Math.ceil(costUsd * egpRate * (1 + merchantMarkup) * (1 - merchantMargin / 100))
      : Math.ceil(costUsd * egpRate * (1 + retailMarkup));
    return {
      package_id: p.offer_id,
      fazer_offer_id: p.offer_id,
      name: p.name,
      qty,
      unit_price_egp: unitPrice,
      unit_cost_usd: costUsd,
      diamonds: Number(p.diamonds || 0),
      bonus_diamonds: Number(p.bonus_diamonds || 0),
      game_id: p.game_id,
      region,
    };
  });
  const total = orderItems.reduce((s, i) => s + i.unit_price_egp * i.qty, 0);
  const orderRef = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  // create order (pending/processing)
  const { data: order, error: oerr } = await sb.from("orders").insert({
    order_ref: orderRef,
    user_id: userId,
    merchant_id: asMerchant ? merchant?.id : null,
    player_id: playerId,
    zone_id: zoneId || null,
    game_id: gameId,
    region,
    account_region: accRegion,
    status: "processing",
    total_egp: total,
    items: orderItems,
  }).select().single();
  if (oerr) return { success: false, error: oerr.message };

  // merchant flow: atomic debit then fulfill
  if (asMerchant) {
    const { error: derr } = await sb.rpc("debit_merchant_for_order", {
      p_merchant_id: merchant.id,
      p_amount: total,
      p_order_ref: orderRef,
      p_note: `خصم طلب ${orderRef}`,
    });
    if (derr) {
      await sb.from("orders").update({ status: "failed", error_message: derr.message }).eq("id", order.id);
      return { success: false, error: derr.message === "insufficient_balance" ? "رصيد المحفظة غير كافٍ لإتمام الطلب." : derr.message, order_ref: orderRef };
    }
  }

  // fulfill each item via Fazer
  let allOk = true;
  const txIds: string[] = [];
  let lastErr: string | null = null;
  const responses: any[] = [];
  for (const it of orderItems) {
    for (let q = 0; q < it.qty; q++) {
      const res = await FazerCardsService.executeTopUp({
        offerId: it.fazer_offer_id,
        playerId,
        zoneId,
        gameId,
        region,
        idempotencyKey: `${orderRef}-${it.fazer_offer_id}-${q}`,
      });
      responses.push({ item: it.fazer_offer_id, q, res });
      if (res.success) {
        if (res.transactionId) txIds.push(res.transactionId);
      } else {
        allOk = false;
        lastErr = res.error || "فشل تنفيذ الشحن";
      }
    }
  }

  const finalStatus = allOk ? "success" : asMerchant ? "failed" : "incomplete";
  await sb.from("orders").update({
    status: finalStatus,
    fazer_transaction_id: txIds.join(",") || null,
    fazer_response: responses,
    error_message: lastErr,
    delivered_at: allOk ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", order.id);

  // if merchant debit happened but fulfillment failed, we keep as failed (refund flow can be added) - surface clearly
  return {
    success: allOk || finalStatus === "incomplete",
    order_ref: orderRef,
    status: finalStatus,
    total_egp: total,
    transaction_ids: txIds,
    player_name: validation.username,
    account_region: accRegion,
    error: lastErr,
    message: asMerchant
      ? (allOk ? "تم خصم الرصيد وتنفيذ الشحن بنجاح." : "تم خصم الرصيد لكن فشل الشحن، تواصل مع الدعم.")
      : (allOk ? "تم تنفيذ الشحن بنجاح." : "تم تسجيل الطلب وسيتم مراجعته/تنفيذه بعد تأكيد الدفع."),
  };
}

export async function getMerchantDashboard(token: string) {
  const { user, client } = await requireUser(token);
  const sbUser = client as any;
  const sb = supabaseAdmin as any;
  const { data: profile } = await sbUser.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const { data: merchant } = await sb.from("merchant_accounts").select("*").eq("user_id", user.id).maybeSingle();
  if (!merchant) return { profile, merchant: null, stats: null, orders: [], transactions: [] };

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayIso = todayStart.toISOString();
  const { data: orders } = await sb.from("orders").select("*").eq("merchant_id", merchant.id).order("created_at", { ascending: false }).limit(100);
  const { data: ledger } = await sb.from("wallet_ledger").select("*").eq("merchant_id", merchant.id).order("created_at", { ascending: false }).limit(100);
  const list = orders || [];
  const stats = {
    balance_egp: Number(merchant.balance_egp || 0),
    margin_percent: Number(merchant.margin_percent || 0),
    orders_today: list.filter((o: any) => o.created_at >= todayIso).length,
    delivered_today: list.filter((o: any) => o.status === "success" && (o.delivered_at || o.updated_at || o.created_at) >= todayIso).length,
    incomplete_orders: list.filter((o: any) => ["pending","processing","incomplete","failed"].includes(o.status)).length,
  };
  return { profile, merchant, stats, orders: list, transactions: ledger || [] };
}

export async function adminListMerchants(token: string, opts: { page: number; limit: number; q?: string }) {
  await requireAdmin(token);
  const sb = supabaseAdmin as any;
  const page = Math.max(1, opts.page || 1);
  const limit = Math.min(50, Math.max(1, opts.limit || 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // fetch merchants + profiles; for simplicity join in memory
  let mq = sb.from("merchant_accounts").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  const { data: merchants, count } = await mq;
  const userIds = (merchants || []).map((m: any) => m.user_id);
  const { data: profiles } = userIds.length ? await sb.from("profiles").select("id,full_name,phone,region,role").in("id", userIds) : { data: [] };
  const pmap = new Map((profiles || []).map((p: any) => [p.id, p]));

  // basic search filter (client-ish in server) on returned page set by name/phone/id
  const q = (opts.q || "").trim().toLowerCase();
  let rows = (merchants || []).map((m: any) => ({ ...m, profile: pmap.get(m.user_id) || null }));
  if (q) {
    rows = rows.filter((r: any) => (r.profile?.full_name || "").toLowerCase().includes(q) || (r.profile?.phone || "").toLowerCase().includes(q) || r.user_id.includes(q) || r.id.includes(q));
  }

  return { merchants: rows, page, limit, total: count || 0, totalPages: Math.max(1, Math.ceil((count || 0) / limit)) };
}

export async function adminCreditMerchant(token: string, body: any) {
  await requireAdmin(token);
  const sb = supabaseAdmin as any;
  const merchantId = body.merchant_id || body.merchantId;
  const amount = Number(body.amount);
  const note = body.note || "إضافة رصيد من الأدمن";
  if (!merchantId || !(amount > 0)) throw new Error("بيانات غير صحيحة");
  const { data, error } = await sb.rpc("admin_credit_merchant", {
    p_merchant_id: merchantId,
    p_amount: amount,
    p_note: note,
    p_reference_type: "admin",
    p_reference_id: null,
  });
  if (error) throw new Error(error.message);
  return { success: true, result: data };
}

export async function adminSetMerchantMargin(token: string, body: any) {
  await requireAdmin(token);
  const sb = supabaseAdmin as any;
  const merchantId = body.merchant_id || body.merchantId;
  const margin = Number(body.margin_percent ?? body.marginPercent);
  if (!merchantId) throw new Error("بيانات غير صحيحة");
  const { error } = await sb.rpc("admin_set_merchant_margin", { p_merchant_id: merchantId, p_margin_percent: margin });
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function adminUpdateEgpRate(token: string, egpRate: number) {
  await requireAdmin(token);
  if (!(egpRate > 0)) throw new Error("سعر صرف غير صالح");
  const sb = supabaseAdmin as any;
  const { error } = await sb.from("store_settings").update({ egp_rate: egpRate, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) throw new Error(error.message);
  return { success: true, egp_rate: egpRate };
}

export async function getMyProfile(token: string) {
  const { user, client } = await requireUser(token);
  const sb = client as any;
  const sba = supabaseAdmin as any;
  const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const { data: merchant } = await sba.from("merchant_accounts").select("*").eq("user_id", user.id).maybeSingle();
  return { user: { id: user.id, email: user.email }, profile, merchant };
}
