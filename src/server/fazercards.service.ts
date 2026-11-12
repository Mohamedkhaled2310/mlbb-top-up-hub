import type { FazerTopUpResponse, PlayerValidationResult, SerializablePrimitive } from "../types/store";

function getFazerBaseUrl(): string {
  return (process.env["FAZER_API_BASE_URL"] || "https://api.fzr.cards/api/v2").replace(/\/+$/, "");
}

const GAME_CATEGORY_IDS: Record<string, string> = {
  mlbb: "mobile_legends_global",
  pubg: "pubg_mobile_auto",
  freefire: "free_fire_mena",
  hok: "honor_of_kings",
};

const VALIDATE_GAME_CONFIG: Record<string, { categoryId: string; zoneFieldKey?: string } | null> = {
  mlbb: { categoryId: "mobile_legends", zoneFieldKey: "zone_id" },
  pubg: { categoryId: "pubg_mobile" },
  freefire: { categoryId: "free_fire" },
  hok: null,
};

const REGION_FROM_CATEGORY_SUFFIX: Record<string, string> = {
  global: "global",
  mena: "mena",
  eu: "eu",
  europe: "eu",
  bd: "bd",
  br: "br",
  brazil: "br",
  cis: "cis",
  id: "id",
  indonesia: "id",
  latam: "latam",
  my: "my",
  malaysia: "my",
  my_sg: "my_sg",
  ph: "ph",
  philippines: "ph",
  ru: "ru",
  sg: "sg",
  singapore: "sg",
  th: "th",
  thailand: "th",
  tr: "tr",
  turkey: "tr",
  tw: "tw",
  taiwan: "tw",
  united_states: "us",
  us: "us",
  vn: "vn",
  vietnam: "vn",
  auto: "global",
};

export interface FazerCatalogProduct {
  offer_id: string;
  game_id: string;
  fazer_category_id?: string | null | undefined;
  category?: string | null | undefined;
  name: string;
  diamonds?: number | undefined;
  bonus_diamonds?: number | undefined;
  currency_name?: string | null | undefined;
  cost_usd?: number | null | undefined;
  regions?: string[] | null | undefined;
  active?: boolean | undefined;
  raw?: Record<string, SerializablePrimitive> | null | undefined;
}

export class FazerCardsService {
  private static getApiKey(): string {
    return (process.env["FAZER_API_KEY"] || "").trim();
  }

  private static getCategoryId(gameId?: string, explicitCategoryId?: string): string {
    if (explicitCategoryId && explicitCategoryId.trim()) {
      return explicitCategoryId.trim();
    }
    const key = (gameId || "mlbb").toLowerCase();
    return GAME_CATEGORY_IDS[key] || gameId || "mobile_legends_global";
  }

  static splitCompositeOfferId(offerId: string, explicitCategoryId?: string): { rawOfferId: string; categoryId?: string } {
    const trimmed = (offerId || "").trim();
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      return {
        categoryId: explicitCategoryId?.trim() || trimmed.slice(0, colonIdx),
        rawOfferId: trimmed.slice(colonIdx + 1),
      };
    }
    return {
      rawOfferId: trimmed,
      ...(explicitCategoryId?.trim() ? { categoryId: explicitCategoryId.trim() } : {}),
    };
  }

  static mapAccountRegionToGameRegion(gameId: string, rawRegion?: string | null): string | null {
    const r = (rawRegion || "").trim().toLowerCase();
    if (!r) return null;
    const g = this.normalizeGameId(gameId, "mlbb");

    if (g === "pubg" || g === "hok") {
      return "global";
    }

    if (g === "mlbb") {
      if (r === "id" || r.includes("indonesia")) return "id";
      if (r === "br" || r.includes("brazil")) return "br";
      if (r === "my" || r.includes("malaysia")) return "my";
      if (r === "ph" || r.includes("philip")) return "ph";
      if (r === "sg" || r.includes("singapore")) return "sg";
      if (r === "tr" || r.includes("turk")) return "tr";
      if (r === "ru" || r.includes("russia")) return "ru";
      if (r === "us" || r === "usa" || r.includes("united states")) return "us";
      return "global";
    }

    if (g === "freefire") {
      if (
        r === "mena" ||
        r.includes("egypt") ||
        r.includes("saudi") ||
        r.includes("tunisia") ||
        r.includes("morocco") ||
        r.includes("algeria") ||
        r.includes("iraq") ||
        r.includes("jordan") ||
        r.includes("emirates") ||
        r.includes("uae") ||
        r.includes("kuwait") ||
        r.includes("qatar") ||
        r.includes("oman") ||
        r.includes("libya") ||
        r.includes("middle east")
      ) {
        return "mena";
      }
      if (r === "eu" || r.includes("europe") || r.includes("france") || r.includes("germany")) return "eu";
      if (r === "br" || r.includes("brazil")) return "br";
      if (r === "id" || r.includes("indonesia")) return "id";
      if (r === "bd" || r.includes("bangladesh")) return "bd";
      if (r === "cis" || r.includes("russia")) return "cis";
      if (r === "sg" || r.includes("singapore")) return "sg";
      if (r === "th" || r.includes("thailand")) return "th";
      if (r === "tw" || r.includes("taiwan")) return "tw";
      if (r === "vn" || r.includes("vietnam")) return "vn";
      if (r === "latam" || r.includes("mexico") || r.includes("argentina")) return "latam";
      return "mena";
    }

    return "global";
  }

  private static headers(): Record<string, string> {
    return {
      "X-API-Key": this.getApiKey(),
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private static async fetchWithTimeout(
    url: string,
    init: { method: "GET" | "POST"; headers?: Record<string, string>; body?: string; timeoutMs?: number },
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 8000);
    try {
      const requestInit: RequestInit = {
        method: init.method,
        headers: init.headers ?? this.headers(),
        signal: controller.signal,
      };
      if (init.body !== undefined) {
        requestInit.body = init.body;
      }
      return await fetch(url, requestInit);
    } finally {
      clearTimeout(timer);
    }
  }

  static async checkAccount(): Promise<{
    connected: boolean;
    balance?: number | undefined;
    currency?: string | undefined;
    name?: string | undefined;
    message?: string | undefined;
    raw?: Record<string, SerializablePrimitive> | undefined;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { connected: false, message: "FAZER_API_KEY غير مُضاف في متغيرات البيئة" };
    }
    const baseUrl = getFazerBaseUrl();
    try {
      const [meRes, balRes] = await Promise.allSettled([
        this.fetchWithTimeout(`${baseUrl}/me`, { method: "GET", timeoutMs: 7000 }),
        this.fetchWithTimeout(`${baseUrl}/balance`, { method: "GET", timeoutMs: 7000 }),
      ]);

      const meOkRes = meRes.status === "fulfilled" ? meRes.value : null;
      const balOkRes = balRes.status === "fulfilled" ? balRes.value : null;

      const meText = meOkRes ? await meOkRes.text() : "";
      const balText = balOkRes ? await balOkRes.text() : "";

      let meData: Record<string, any> | null = null;
      let balData: Record<string, any> | null = null;
      try {
        meData = meText ? (JSON.parse(meText) as Record<string, any>) : null;
      } catch {
        meData = null;
      }
      try {
        balData = balText ? (JSON.parse(balText) as Record<string, any>) : null;
      } catch {
        balData = null;
      }

      if (!meOkRes?.ok && !balOkRes?.ok) {
        const status = balOkRes?.status || meOkRes?.status || 502;
        return {
          connected: false,
          message: `FazerCards error (${status}): ${(balText || meText).slice(0, 200)}`,
        };
      }

      // Live Fazer v2 returns numeric string on `GET /balance` -> { ok: true, balance: "2.0680", currency: "USD" }
      const rawBalance =
        balData?.["balance"] ??
        balData?.["data"]?.["balance"] ??
        meData?.["balance"] ??
        meData?.["wallet_balance"] ??
        meData?.["data"]?.["balance"] ??
        null;

      const numericBalance =
        typeof rawBalance === "number"
          ? rawBalance
          : rawBalance != null && rawBalance !== "" && Number.isFinite(Number(rawBalance))
            ? Number(rawBalance)
            : undefined;

      const currency = String(
        balData?.["currency"] ?? meData?.["currency"] ?? meData?.["data"]?.["currency"] ?? "USD",
      );
      const name = String(
        meData?.["email"] ?? meData?.["login"] ?? meData?.["name"] ?? meData?.["data"]?.["name"] ?? "Fazer Reseller",
      );

      const rawSummary: Record<string, SerializablePrimitive> = {
        currency,
        name,
        ...(numericBalance !== undefined ? { balance: numericBalance } : {}),
        ...(typeof meData?.["plan"] === "string" ? { plan: meData["plan"] } : {}),
        ...(meData?.["summary"]?.["totalOrders"] != null ? { totalOrders: Number(meData["summary"]["totalOrders"]) } : {}),
      };

      const result: {
        connected: boolean;
        balance?: number | undefined;
        currency?: string | undefined;
        name?: string | undefined;
        message?: string | undefined;
        raw?: Record<string, SerializablePrimitive> | undefined;
      } = {
        connected: true,
        currency,
        name,
        raw: rawSummary,
      };
      if (numericBalance !== undefined) {
        result.balance = numericBalance;
      }
      return result;
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
    _explicitCategoryId?: string,
  ): Promise<PlayerValidationResult & { region?: string | undefined }> {
    const trimmedId = (playerId || "").trim();
    const trimmedZone = (zoneId || "").trim();
    const normalizedGame = this.normalizeGameId(gameId, "mlbb");
    const needsZone = normalizedGame === "mlbb";
    const effectiveZone = needsZone ? trimmedZone : trimmedZone || "-";
    const selectedRegion = (region || "").trim();

    if (!trimmedId) {
      return { valid: false, error: "يرجى إدخال معرف اللاعب (Player ID)" };
    }
    if (needsZone && !trimmedZone) {
      return { valid: false, error: "يرجى إدخال معرف اللاعب ورقم السيرفر (Zone ID)" };
    }
    if (needsZone && !/^\d{4,15}$/.test(trimmedId)) {
      return { valid: false, error: "معرف اللاعب (Player ID) في MLBB يجب أن يكون أرقاماً فقط (4-15 رقم)" };
    }
    if (needsZone && !/^\d{2,8}$/.test(trimmedZone)) {
      return { valid: false, error: "رقم السيرفر (Zone ID) غير صالح" };
    }
    if (!needsZone && !/^[a-zA-Z0-9_-]{4,24}$/.test(trimmedId)) {
      return { valid: false, error: "معرف اللاعب (Player ID) غير صالح" };
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        valid: false,
        userId: trimmedId,
        zoneId: effectiveZone,
        error: "FAZER_API_KEY غير مُضاف — تعذر التحقق الفعلي من الحساب",
      };
    }

    const validateConfig = VALIDATE_GAME_CONFIG[normalizedGame];
    if (!validateConfig) {
      // Games without Fazer validate-id endpoint (e.g., Honor of Kings) rely on strict ID format validation.
      return {
        valid: true,
        userId: trimmedId,
        zoneId: effectiveZone,
        username: `ID #${trimmedId}`,
        accountRegion: selectedRegion || "global",
      };
    }

    const fields: Record<string, string> = validateConfig.zoneFieldKey
      ? { player_id: trimmedId, [validateConfig.zoneFieldKey]: trimmedZone }
      : { player_id: trimmedId };

    try {
      const response = await this.fetchWithTimeout(`${getFazerBaseUrl()}/topups/validate-id`, {
        method: "POST",
        body: JSON.stringify({ category_id: validateConfig.categoryId, fields }),
        timeoutMs: 9000,
      });
      const data = (await response.json().catch(() => null)) as Record<string, any> | null;

      if (!response.ok || !data) {
        return {
          valid: false,
          userId: trimmedId,
          zoneId: effectiveZone,
          error: String(
            data?.["message"] ||
              data?.["error"] ||
              `تعذر التحقق من الحساب (${response.status})`,
          ),
        };
      }

      if (data["valid"] === false) {
        return {
          valid: false,
          userId: trimmedId,
          zoneId: effectiveZone,
          error: "معرف اللاعب أو السيرفر غير صحيح أو غير موجود",
        };
      }

      const username =
        data["player_name"] ||
        data["username"] ||
        data["nickname"] ||
        data["name"] ||
        data["data"]?.["player_name"] ||
        data["data"]?.["username"] ||
        (needsZone ? `${trimmedId} (${trimmedZone})` : trimmedId);

      const rawDetectedRegion =
        data["region"] ||
        data["country"] ||
        data["server_region"] ||
        data["data"]?.["region"] ||
        null;

      const mappedRegion =
        this.mapAccountRegionToGameRegion(normalizedGame, rawDetectedRegion ? String(rawDetectedRegion) : null) ||
        selectedRegion ||
        null;

      return {
        valid: true,
        userId: trimmedId,
        zoneId: effectiveZone,
        username: String(username),
        accountRegion: mappedRegion,
        ...(rawDetectedRegion ? { region: String(rawDetectedRegion) } : {}),
      };
    } catch (err: unknown) {
      return {
        valid: false,
        userId: trimmedId,
        zoneId: effectiveZone,
        error: err instanceof Error ? `خطأ في الاتصال بخدمة التحقق: ${err.message}` : "تعذر الاتصال بخدمة التحقق من الحساب",
      };
    }
  }

  static async executeTopUp(params: {
    offerId: string;
    playerId: string;
    zoneId?: string | undefined;
    gameId?: string | undefined;
    fazerCategoryId?: string | undefined;
    region?: string | undefined;
    idempotencyKey?: string | undefined;
  }): Promise<FazerTopUpResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        error: "FAZER_API_KEY غير مُضاف — لا يمكن تنفيذ الشحن الفعلي بدون مفتاح FazerCards",
      };
    }

    const idempotency = params.idempotencyKey || `fzr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const normalizedGame = this.normalizeGameId(params.gameId || "mlbb", "mlbb");
    const split = this.splitCompositeOfferId(params.offerId, params.fazerCategoryId);
    const categoryId = this.getCategoryId(normalizedGame, split.categoryId);
    const rawOfferId = split.rawOfferId;
    const playerId = (params.playerId || "").trim();
    const zoneId = (params.zoneId || "").trim();

    // FazerCards `/topups/order` for Mobile Legends expects `server_id` (per live offers `fields`)
    const fields: Record<string, string> =
      normalizedGame === "mlbb" && zoneId && zoneId !== "-"
        ? { player_id: playerId, server_id: zoneId }
        : { player_id: playerId };

    try {
      const body: Record<string, unknown> = {
        category_id: categoryId,
        offer_id: rawOfferId,
        fields,
      };
      const response = await this.fetchWithTimeout(`${getFazerBaseUrl()}/topups/order`, {
        method: "POST",
        headers: { ...this.headers(), "Idempotency-Key": idempotency },
        body: JSON.stringify(body),
        timeoutMs: 15000,
      });
      const data = (await response.json().catch(() => null)) as Record<string, any> | null;
      const nestedOrder = (data?.["order"] && typeof data["order"] === "object" ? data["order"] : data?.["data"]) as
        | Record<string, any>
        | undefined;

      if (response.ok && data && data["ok"] !== false && data["success"] !== false) {
        const orderObj = nestedOrder || data;
        const txId = String(
          orderObj["transaction_id"] || orderObj["order_id"] || orderObj["id"] || data["transaction_id"] || idempotency,
        );
        const ordId = String(orderObj["order_id"] || orderObj["id"] || data["order_id"] || txId);
        const status = String(orderObj["status"] || data["status"] || "processing");
        const bal = data["balance_remaining"] ?? orderObj["balance_remaining"] ?? data["balance"];

        const resp: FazerTopUpResponse = {
          success: true,
          transactionId: txId,
          orderId: ordId,
          status,
          raw: this.compactRawRecord({
            status,
            order_id: ordId,
            transaction_id: txId,
            category_id: categoryId,
            offer_id: rawOfferId,
          }),
        };
        if (bal != null && Number.isFinite(Number(bal))) {
          resp.balanceRemaining = Number(bal);
        }
        return resp;
      }

      return {
        success: false,
        error: String(
          data?.["message"] ||
            data?.["error"] ||
            data?.["errors"]?.[0]?.["message"] ||
            `FazerCards order failed (${response.status})`,
        ),
        raw: this.compactRawRecord({
          status_code: response.status,
          error: data?.["message"] || data?.["error"] || "order_failed",
          category_id: categoryId,
          offer_id: rawOfferId,
        }),
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error connecting to FazerCards",
      };
    }
  }

  /**
   * 1) Discover active topup categories dynamically from `GET /topups?limit=500` via `meta.next_cursor`
   * 2) Keep clean canonical categories for MLBB, PUBG Mobile, Free Fire, and Honor of Kings
   * 3) Fetch offers per category concurrently with regional tagging and collision-free composite `offer_id`
   */
  static async fetchCatalog(): Promise<{
    ok: boolean;
    products: FazerCatalogProduct[];
    message?: string | undefined;
    gamesCovered?: string[] | undefined;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { ok: false, products: [], message: "FAZER_API_KEY غير مُضاف في متغيرات البيئة" };
    }

    const baseUrl = getFazerBaseUrl();
    const collected: FazerCatalogProduct[] = [];
    const discoveredTargets = new Map<string, { categoryId: string; gameHint: "mlbb" | "pubg" | "freefire" | "hok" }>();

    // Step 1: Discover categories from /topups (cursor pagination via meta.next_cursor)
    let cursor: string | null = null;
    for (let page = 0; page < 8; page++) {
      const qs = new URLSearchParams({ limit: "500" });
      if (cursor) qs.set("cursor", cursor);
      try {
        const res = await this.fetchWithTimeout(`${baseUrl}/topups?${qs.toString()}`, {
          method: "GET",
          timeoutMs: 8000,
        });
        if (!res.ok) break;
        const data = (await res.json().catch(() => null)) as Record<string, any> | null;
        if (!data) break;
        const cats = this.extractItems(data) || [];
        for (const cat of cats) {
          const catId = String(cat?.["category_id"] || cat?.["id"] || cat?.["slug"] || cat?.["code"] || "").trim();
          const catName = String(cat?.["name"] || cat?.["title"] || "").trim();
          const matchedGame = this.classifyCategoryToSupportedGame(catId, catName);
          if (catId && matchedGame) {
            discoveredTargets.set(`${matchedGame}::${catId}`, { categoryId: catId, gameHint: matchedGame });
          }
        }

        const hasMore = data["meta"]?.["has_more"];
        const nextCursor = data["meta"]?.["next_cursor"] ?? data["next_cursor"] ?? null;
        if (hasMore === false || !nextCursor || typeof nextCursor !== "string") break;
        cursor = nextCursor;
      } catch {
        break;
      }
    }

    // Ensure every supported game has its primary category even if `/topups` listing failed
    for (const [game, cat] of Object.entries(GAME_CATEGORY_IDS) as Array<["mlbb" | "pubg" | "freefire" | "hok", string]>) {
      const hasGame = Array.from(discoveredTargets.values()).some((t) => t.gameHint === game);
      if (!hasGame) {
        discoveredTargets.set(`${game}::${cat}`, { categoryId: cat, gameHint: game });
      }
    }

    // Step 2: Fetch `/topups/offers?category_id=...` for each discovered category in bounded batches
    const targets = Array.from(discoveredTargets.values());
    const BATCH_SIZE = 6;
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (t) => {
          const url = `${baseUrl}/topups/offers?category_id=${encodeURIComponent(t.categoryId)}`;
          const res = await this.fetchWithTimeout(url, { method: "GET", timeoutMs: 8000 });
          if (!res.ok) return [] as FazerCatalogProduct[];
          const data = await res.json().catch(() => null);
          const items = this.extractItems(data);
          if (!items || !items.length) return [] as FazerCatalogProduct[];
          return items
            .map((item) => this.normalizeProduct(item, t.gameHint, t.categoryId))
            .filter((x): x is FazerCatalogProduct => x !== null);
        }),
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.length) {
          collected.push(...r.value);
        }
      }
    }

    const byKey = new Map<string, FazerCatalogProduct>();
    for (const p of collected) {
      if (!byKey.has(p.offer_id)) {
        byKey.set(p.offer_id, p);
      }
    }

    const products = Array.from(byKey.values());
    const gamesCovered = Array.from(new Set(products.map((p) => p.game_id)));
    if (products.length > 0) {
      return { ok: true, products, gamesCovered };
    }
    return {
      ok: false,
      products: [],
      gamesCovered: [],
      message: "تعذر جلب كتالوج Fazer تلقائياً (تحقق من صلاحيات المفتاح أو استجابة Fazer API).",
    };
  }

  private static extractItems(data: any): any[] | null {
    if (!data) return null;
    if (Array.isArray(data)) return data;
    const candidates = [
      data.offers,
      data.items,
      data.data,
      data.products,
      data.categories,
      data.result,
      data.data?.offers,
      data.data?.items,
      data.data?.data,
      data.data?.products,
    ];
    for (const c of candidates) {
      if (Array.isArray(c)) return c;
    }
    return null;
  }

  private static classifyCategoryToSupportedGame(
    categoryId: string,
    name: string,
  ): "mlbb" | "pubg" | "freefire" | "hok" | null {
    const id = categoryId.toLowerCase();
    const label = `${categoryId} ${name}`.toLowerCase();

    // Exclude spin-off / unrelated / noisy bulk duplicate catalogs
    if (
      id.includes("adventure") ||
      id.includes("new_state") ||
      id.includes("magic_chess") ||
      id === "mobile_legends_exclusive" ||
      id === "mobile_legends_special" ||
      id === "pubg_mobile_fast" ||
      id === "pubg_mobile_manual" ||
      id === "pubg_mobile_reserve"
    ) {
      return null;
    }

    if (id.startsWith("mobile_legends") || label.includes("mobile legends") || label.includes("mlbb")) {
      return "mlbb";
    }
    if (id.startsWith("pubg_mobile") || label.includes("pubg mobile")) {
      return "pubg";
    }
    if (id.startsWith("free_fire") || label.includes("free fire")) {
      return "freefire";
    }
    if (id === "honor_of_kings" || id.startsWith("honor_of_kings") || label.includes("honor of kings")) {
      return "hok";
    }
    return null;
  }

  private static inferRegionFromCategory(categoryId?: string): string[] | null {
    if (!categoryId) return null;
    const clean = categoryId.toLowerCase().trim();
    if (clean === "honor_of_kings" || clean === "pubg_mobile_auto") return ["global"];

    for (const [suffix, code] of Object.entries(REGION_FROM_CATEGORY_SUFFIX)) {
      if (clean.endsWith(`_${suffix}`)) {
        return [code];
      }
    }
    return ["global"];
  }

  private static normalizeGameId(raw: string, fallback = "mlbb"): string {
    const g = String(raw || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!g) return fallback;
    if (g === "mlbb" || g.includes("mobile_legends") || g.includes("mobilelegends")) return "mlbb";
    if (g.includes("pubg")) return "pubg";
    if (g.includes("free_fire") || g.includes("freefire") || g === "ff") return "freefire";
    if (g.includes("honor_of_kings") || g.includes("honorofkings") || g === "hok") return "hok";
    return fallback || g;
  }

  private static inferExplicitGameFromText(offerId: string, name: string): "mlbb" | "pubg" | "freefire" | "hok" | null {
    const t = `${offerId} ${name}`.toLowerCase();
    if (/\bpubg\b|unknown\s*cash|\buc\b/.test(t)) return "pubg";
    if (/free\s*fire|\bfreefire\b|\bgarena\b/.test(t)) return "freefire";
    if (/honor\s*of\s*kings|\bhok\b|\btokens?\b/.test(t)) return "hok";
    if (/mobile\s*legends|\bmlbb\b/.test(t)) return "mlbb";
    return null;
  }

  private static parseNumericAmount(it: Record<string, any>, name: string): { diamonds: number; bonus: number } {
    const explicitDiamonds = Number(it["diamonds"] ?? it["amount"] ?? it["qty"] ?? it["value"] ?? 0) || 0;
    const explicitBonus = Number(it["bonus"] ?? it["bonus_diamonds"] ?? it["bonusDiamonds"] ?? 0) || 0;
    if (explicitDiamonds > 0) {
      return { diamonds: explicitDiamonds, bonus: explicitBonus };
    }
    const plusMatch = name.match(/(\d[\d,]*)\s*\+\s*(\d[\d,]*)/);
    if (plusMatch?.[1] && plusMatch[2]) {
      return {
        diamonds: parseInt(plusMatch[1].replace(/,/g, ""), 10) || 0,
        bonus: explicitBonus || parseInt(plusMatch[2].replace(/,/g, ""), 10) || 0,
      };
    }
    const currencyMatch = name.match(/(\d[\d,]*)\s*(?:diamonds?|uc|tokens?|coins?)/i);
    if (currencyMatch?.[1]) {
      return {
        diamonds: parseInt(currencyMatch[1].replace(/,/g, ""), 10) || 0,
        bonus: explicitBonus,
      };
    }
    return { diamonds: 0, bonus: explicitBonus };
  }

  private static resolvePackageCategory(it: Record<string, any>, name: string): string {
    const rawCat = String(it["type"] || it["category_type"] || it["group"] || "").toLowerCase();
    const lowerName = name.toLowerCase();
    if (
      rawCat.includes("weekly") ||
      rawCat.includes("pass") ||
      lowerName.includes("weekly") ||
      lowerName.includes("pass") ||
      lowerName.includes("membership") ||
      lowerName.includes("prime") ||
      lowerName.includes("monthly")
    ) {
      return "weekly_pass";
    }
    if (rawCat.includes("double") || lowerName.includes("double") || lowerName.includes("2x") || lowerName.includes("first top") || lowerName.includes("first purchase")) {
      return "double_diamonds";
    }
    if (rawCat.includes("bundle") || lowerName.includes("bundle") || lowerName.includes("twilight") || lowerName.includes("pack") || lowerName.includes("bag") || lowerName.includes("box")) {
      return "bundles";
    }
    return "diamonds";
  }

  private static compactRawRecord(obj: Record<string, any>): Record<string, SerializablePrimitive> {
    const out: Record<string, SerializablePrimitive> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        out[k] = v;
      }
    }
    return out;
  }

  private static normalizeProduct(
    it: Record<string, any> | null | undefined,
    gameHint?: string,
    categoryId?: string,
  ): FazerCatalogProduct | null {
    if (!it || typeof it !== "object") return null;
    const rawOfferId = it["offer_id"] || it["id"] || it["product_id"] || it["sku"] || it["code"] || it["offerId"];
    if (!rawOfferId) return null;

    const cleanRawOfferId = String(rawOfferId).trim();
    const name = String(it["name"] || it["title"] || it["product_name"] || it["label"] || cleanRawOfferId);
    const cost =
      it["cost"] ??
      it["cost_usd"] ??
      it["price"] ??
      it["price_usd"] ??
      it["unit_price"] ??
      it["usd_price"] ??
      it["priceUsd"] ??
      it["amount_usd"] ??
      null;

    const gameRaw = String(it["game_id"] || it["game"] || it["category_id"] || it["category"] || it["gameId"] || "").trim();
    const recognizedRaw = this.normalizeGameId(gameRaw, "");
    const explicitInText = this.inferExplicitGameFromText(cleanRawOfferId, name);
    const game_id = gameHint || recognizedRaw || explicitInText || "mlbb";

    const { diamonds, bonus } = this.parseNumericAmount(it, name);
    const currency_name =
      it["currency_name"] ||
      it["currencyName"] ||
      (game_id === "pubg" ? "UC" : game_id === "hok" ? "Tokens" : "Diamonds");

    const resolvedCategoryId =
      categoryId ||
      (typeof it["category_id"] === "string" && it["category_id"]) ||
      GAME_CATEGORY_IDS[game_id] ||
      "mobile_legends_global";

    const regionsRaw = it["regions"] ?? (it["region"] ? [it["region"]] : null) ?? it["countries"] ?? null;
    const regions = Array.isArray(regionsRaw)
      ? regionsRaw.map((r) => String(r).trim().toLowerCase()).filter(Boolean)
      : typeof regionsRaw === "string" && regionsRaw.trim()
        ? [regionsRaw.trim().toLowerCase()]
        : this.inferRegionFromCategory(resolvedCategoryId);

    // Composite offer_id guarantees zero collisions across Fazer categories that reuse `offer_id` strings
    const storedOfferId =
      resolvedCategoryId && !cleanRawOfferId.includes(":")
        ? `${resolvedCategoryId}:${cleanRawOfferId}`
        : cleanRawOfferId;

    return {
      offer_id: storedOfferId,
      game_id,
      fazer_category_id: resolvedCategoryId,
      category: this.resolvePackageCategory(it, name),
      name,
      diamonds,
      bonus_diamonds: bonus,
      currency_name: String(currency_name),
      cost_usd: cost != null && Number.isFinite(Number(cost)) ? Number(cost) : null,
      regions,
      active: it["active"] !== false && it["enabled"] !== false && it["status"] !== "inactive",
      raw: this.compactRawRecord({
        ...it,
        fazer_category_id: resolvedCategoryId,
        fazer_offer_id: cleanRawOfferId,
        offer_id: storedOfferId,
      }),
    };
  }
}
