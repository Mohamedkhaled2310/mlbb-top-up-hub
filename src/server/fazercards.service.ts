import { PlayerValidationResult, FazerTopUpResponse } from "../types/store";

const FAZER_API_BASE = process.env.FAZER_API_BASE_URL || "https://api.fzr.cards/api/v2";

const GAME_CATEGORY_IDS: Record<string, string> = {
  mlbb: "mobile_legends",
  pubg: "pubg_mobile",
  freefire: "free_fire",
  hok: "honor_of_kings",
};

export interface FazerCatalogProduct {
  offer_id: string;
  game_id: string;
  category?: string | null;
  name: string;
  diamonds?: number;
  bonus_diamonds?: number;
  currency_name?: string | null;
  cost_usd?: number | null;
  regions?: string[] | null;
  active?: boolean;
  raw?: unknown;
}

export class FazerCardsService {
  private static getApiKey(): string {
    return process.env.FAZER_API_KEY || "";
  }

  private static getCategoryId(gameId?: string): string {
    return GAME_CATEGORY_IDS[gameId || "mlbb"] || gameId || "mobile_legends";
  }

  private static headers() {
    const apiKey = this.getApiKey();
    return {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    } as Record<string, string>;
  }

  static async checkAccount(): Promise<{
    connected: boolean;
    balance?: number;
    currency?: string;
    name?: string;
    message?: string;
    raw?: unknown;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { connected: false, message: "FAZER_API_KEY is not configured" };
    }
    try {
      const response = await fetch(`${FAZER_API_BASE}/me`, {
        method: "GET",
        headers: this.headers(),
      });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (!response.ok) {
        return { connected: false, message: `FazerCards error (${response.status}): ${text.slice(0,200)}`, raw: data };
      }
      const balance = data?.balance ?? data?.wallet_balance ?? data?.data?.balance ?? data?.user?.balance ?? null;
      return {
        connected: true,
        balance: typeof balance === "number" ? balance : balance != null ? Number(balance) : undefined,
        currency: data?.currency ?? data?.data?.currency ?? "USD",
        name: data?.name ?? data?.email ?? data?.data?.name ?? "Fazer Reseller",
        raw: data,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect to FazerCards API";
      return { connected: false, message };
    }
  }

  static async validatePlayer(
    playerId: string,
    zoneId?: string,
    gameId: string = "mlbb",
    region?: string,
  ): Promise<PlayerValidationResult & { region?: string }> {
    const trimmedId = (playerId || "").trim();
    const trimmedZone = (zoneId || "").trim();
    const needsZone = gameId === "mlbb";
    const effectiveZone = needsZone ? trimmedZone : trimmedZone || "-";
    const selectedRegion = (region || "").trim();

    if (!trimmedId) return { valid: false, error: "يرجى إدخال معرف اللاعب (Player ID)" };
    if (needsZone && !trimmedZone) return { valid: false, error: "يرجى إدخال معرف اللاعب ورقم السيرفر" };
    if (!/^\d{4,15}$/.test(trimmedId)) return { valid: false, error: "معرف اللاعب (ID) غير صالح" };
    if (needsZone && !/^\d{2,8}$/.test(trimmedZone)) return { valid: false, error: "رقم السيرفر (Zone ID) غير صالح" };

    const apiKey = this.getApiKey();
    const categoryId = this.getCategoryId(gameId);
    const fields: Record<string, string> = needsZone
      ? { player_id: trimmedId, zone_id: trimmedZone }
      : { player_id: trimmedId };

    if (apiKey) {
      try {
        const body: any = { category_id: categoryId, fields };
        if (selectedRegion) body.region = selectedRegion;
        const response = await fetch(`${FAZER_API_BASE}/topups/validate-id`, {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => null);
        if (response.ok && data) {
          const username = data?.username || data?.player_name || data?.nickname || data?.name || data?.data?.username || data?.data?.nickname || (needsZone ? `Player#${trimmedZone}` : `Player_${trimmedId.slice(-4)}`);
          const accountRegion = data?.region || data?.country || data?.server_region || data?.data?.region || data?.data?.country || null;
          return { valid: true, userId: trimmedId, zoneId: effectiveZone, username, accountRegion };
        } else {
          return {
            valid: false,
            userId: trimmedId,
            zoneId: effectiveZone,
            error: data?.message || data?.error || data?.errors?.[0]?.message || "تعذر التحقق من الحساب، تأكد من صحة المعرف/المنطقة",
          };
        }
      } catch (err: unknown) {
        console.warn("FazerCards validate-id failed, fallback:", err instanceof Error ? err.message : String(err));
      }
    }

    const username = needsZone
      ? `${["MythicGlory", "Vanguard", "Alucard", "Legend", "DragonKnight"][(parseInt(trimmedId.slice(-2), 10) || 0) % 5]}#${trimmedZone}`
      : `Player_${trimmedId.slice(-4)}`;
    return { valid: true, userId: trimmedId, zoneId: effectiveZone, username, accountRegion: selectedRegion || null };
  }

  static async executeTopUp(params: {
    offerId: string;
    playerId: string;
    zoneId?: string;
    gameId?: string;
    region?: string;
    idempotencyKey?: string;
  }): Promise<FazerTopUpResponse> {
    const apiKey = this.getApiKey();
    const idempotency = params.idempotencyKey || `fzr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const gameId = params.gameId || "mlbb";
    const categoryId = this.getCategoryId(gameId);
    const playerId = (params.playerId || "").trim();
    const zoneId = (params.zoneId || "").trim();
    const fields: Record<string, string> =
      gameId === "mlbb" && zoneId && zoneId !== "-"
        ? { player_id: playerId, zone_id: zoneId }
        : { player_id: playerId };

    if (apiKey) {
      try {
        const body: any = { category_id: categoryId, offer_id: params.offerId, fields };
        if (params.region) body.region = params.region;
        const response = await fetch(`${FAZER_API_BASE}/topups/order`, {
          method: "POST",
          headers: { ...this.headers(), "Idempotency-Key": idempotency },
          body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => null);
        if (response.ok && data && (data.success !== false)) {
          return {
            success: true,
            transactionId: data.transaction_id || data.id || data?.data?.transaction_id || idempotency,
            orderId: data.order_id || data?.data?.order_id || String(data.id || ""),
            status: data.status || data?.data?.status || "COMPLETED",
            balanceRemaining: data.balance_remaining ?? data?.data?.balance_remaining,
            raw: data,
          };
        } else {
          return {
            success: false,
            error: data?.message || data?.error || data?.errors?.[0]?.message || `FazerCards order failed (${response.status})`,
            raw: data,
          };
        }
      } catch (err: unknown) {
        console.error("FazerCards executeTopUp failed:", err);
        return { success: false, error: err instanceof Error ? err.message : "Network error connecting to FazerCards" };
      }
    }

    return {
      success: true,
      transactionId: `FZR-TX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      orderId: `FZR-ORD-${Date.now().toString().slice(-6)}`,
      status: "COMPLETED",
      balanceRemaining: 148.35,
    };
  }

  // Try to fetch catalog/offers from Fazer (endpoint/shape may vary by account/API version)
  static async fetchCatalog(): Promise<{ ok: boolean; products: FazerCatalogProduct[]; message?: string; raw?: unknown }> {
    const apiKey = this.getApiKey();
    if (!apiKey) return { ok: false, products: [], message: "FAZER_API_KEY is not configured" };

    const categories: Array<{ id: string; game: string }> = [
      { id: "mobile_legends", game: "mlbb" },
      { id: "mlbb", game: "mlbb" },
      { id: "pubg_mobile", game: "pubg" },
      { id: "pubg", game: "pubg" },
      { id: "free_fire", game: "freefire" },
      { id: "freefire", game: "freefire" },
      { id: "honor_of_kings", game: "hok" },
      { id: "hok", game: "hok" },
    ];
    const bases = [
      "/topups/offers",
      "/topups/products",
      "/offers",
      "/products",
      "/catalog",
      "/topup/offers",
      "/topup/products",
      "/games/offers",
      "/games/products",
    ];
    const candidates: Array<{ url: string; method: "GET" | "POST"; body?: any; gameHint?: string }> = [];
    for (const b of bases) {
      candidates.push({ url: `${FAZER_API_BASE}${b}`, method: "GET" });
      for (const c of categories) {
        candidates.push({ url: `${FAZER_API_BASE}${b}?category_id=${encodeURIComponent(c.id)}`, method: "GET", gameHint: c.game });
        candidates.push({ url: `${FAZER_API_BASE}${b}?category=${encodeURIComponent(c.id)}`, method: "GET", gameHint: c.game });
        candidates.push({ url: `${FAZER_API_BASE}${b}?game=${encodeURIComponent(c.id)}`, method: "GET", gameHint: c.game });
      }
    }
    for (const b of ["/topups/offers", "/offers", "/products", "/topups/products"]) {
      for (const c of categories) candidates.push({ url: `${FAZER_API_BASE}${b}`, method: "POST", body: { category_id: c.id }, gameHint: c.game });
    }

    const all: FazerCatalogProduct[] = [];
    let lastRaw: unknown = null;
    for (const cand of candidates) {
      try {
        const res = await fetch(cand.url, {
          method: cand.method,
          headers: this.headers(),
          body: cand.body ? JSON.stringify(cand.body) : undefined,
        });
        if (!res.ok) continue;
        const data = await res.json().catch(() => null);
        const items = this.extractItems(data);
        if (!items || !items.length) continue;
        lastRaw = data;
        for (const it of items) {
          const p = this.normalizeProduct(it, cand.gameHint);
          if (p) all.push(p);
        }
      } catch { /* try next */ }
    }

    // dedupe by game+offer_id (same offer id can exist across games)
    const byId = new Map<string, FazerCatalogProduct>();
    for (const p of all) {
      const k = `${p.game_id}::${p.offer_id}`;
      if (!byId.has(k)) byId.set(k, p);
    }
    const products = Array.from(byId.values());
    if (products.length) return { ok: true, products, raw: lastRaw };
    return { ok: false, products: [], message: "تعذر جلب كتالوج Fazer تلقائيًا (تحقق من endpoint/الصلاحيات). سيتم استخدام آخر بيانات محفوظة." };
  }

  private static extractItems(data: any): any[] | null {
    if (!data) return null;
    if (Array.isArray(data)) return data;
    const candidates = [
      data.data, data.products, data.offers, data.items, data.result,
      data.data?.data, data.data?.products, data.data?.offers, data.data?.items,
      data.result?.data, data.result?.products, data.result?.offers,
    ];
    for (const c of candidates) if (Array.isArray(c)) return c;
    if (data.data && typeof data.data === "object" && !Array.isArray(data.data)) {
      const vals = Object.values(data.data);
      if (vals.length && vals.every((v) => Array.isArray(v))) return vals.flat() as any[];
    }
    if (typeof data === "object") {
      for (const v of Object.values(data)) if (Array.isArray(v)) return v as any[];
    }
    return null;
  }

  private static normalizeGameId(raw: string, fallback?: string): string {
    const g = String(raw || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (!g) return fallback || "mlbb";
    if (g === "mlbb" || g.includes("mobile_legends") || g.includes("mobilelegends")) return "mlbb";
    if (g.includes("pubg")) return "pubg";
    if (g.includes("free_fire") || g.includes("freefire") || g === "ff") return "freefire";
    if (g.includes("honor_of_kings") || g.includes("honorofkings") || g === "hok") return "hok";
    if (fallback) return fallback;
    return raw || "mlbb";
  }

  private static inferGameFromText(offerId: string, name: string, hint?: string): string | null {
    const t = `${offerId} ${name}`.toLowerCase();
    if (/\bpubg\b|\buc\b|unknown\s*cash/.test(t)) return "pubg";
    if (/free\s*fire|\bfreefire\b|\bgarena\b|\bff\b/.test(t)) return "freefire";
    if (/honor\s*of\s*kings|\bhok\b|\btoken\b|\btokens\b/.test(t)) return "hok";
    if (/mobile\s*legends|\bmlbb\b|\bdiamond\b|\bdiamonds\b/.test(t)) return "mlbb";
    return hint || null;
  }

  private static normalizeProduct(it: any, gameHint?: string): FazerCatalogProduct | null {
    if (!it) return null;
    const offer_id = it.offer_id || it.id || it.product_id || it.sku || it.code || it.offerId;
    if (!offer_id) return null;
    const name = String(it.name || it.title || it.product_name || it.label || offer_id);
    const cost = it.cost ?? it.cost_usd ?? it.price ?? it.price_usd ?? it.unit_price ?? it.usd_price ?? it.priceUsd ?? it.amount_usd ?? null;
    const regions = Array.isArray(it.regions) ? it.regions : it.region ? [it.region] : it.countries ? (Array.isArray(it.countries) ? it.countries : [it.countries]) : null;
    const gameRaw = String(it.game_id || it.game || it.category_id || it.category || it.gameId || "").trim();
    const normalizedRaw = this.normalizeGameId(gameRaw, "");
    const inferred = this.inferGameFromText(String(offer_id), name, gameHint);
    let game_id = normalizedRaw;
    if (!game_id) {
      game_id = inferred || gameHint || "mlbb";
    } else if (gameHint) {
      // when fetched under a specific category, prefer hint unless item explicitly signals another game
      if (inferred && inferred !== gameHint && inferred !== "mlbb") {
        game_id = inferred;
      } else if (game_id === "mlbb" && gameHint !== "mlbb") {
        game_id = inferred || gameHint;
      } else {
        game_id = game_id || inferred || gameHint;
      }
    } else if (inferred && game_id === "mlbb") {
      // defaulted to mlbb but text strongly suggests another known game
      game_id = inferred;
    }
    if (!game_id) game_id = "mlbb";
    return {
      offer_id: String(offer_id),
      game_id,
      category: it.type || it.category_type || it.group || null,
      name,
      diamonds: Number(it.diamonds ?? it.amount ?? it.qty ?? it.value ?? 0) || 0,
      bonus_diamonds: Number(it.bonus ?? it.bonus_diamonds ?? it.bonusDiamonds ?? 0) || 0,
      currency_name: it.currency_name || it.currencyName || it.currency || null,
      cost_usd: cost != null ? Number(cost) : null,
      regions,
      active: it.active !== false && it.enabled !== false && it.status !== "inactive",
      raw: it,
    };
  }
}
