import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TableRow = Record<string, any>;

const dbState = {
  users: [] as Array<{ id: string; email: string; password: string }>,
  profiles: [] as TableRow[],
  merchant_accounts: [] as Array<{ id: string; user_id: string; balance_egp: number; margin_percent: number; is_active: boolean }>,
  wallet_ledger: [] as Array<{ id: string; merchant_id: string; amount: number; entry_type: string; reference_type: string; reference_id: string | null; balance_after: number; note: string; created_at: string }>,
  orders: [] as TableRow[],
  store_settings: [] as Array<{ id: number; egp_rate: number; fazer_balance: number | null; fazer_balance_currency: string; fazer_balance_updated_at: string | null; packages_synced_at: string | null }>,
  fazer_packages: [] as TableRow[],
};

function resetDbState() {
  dbState.users = [
    { id: "admin-uuid-1", email: "admin@metostore.com", password: "secret" },
    { id: "merch-uuid-1", email: "merchant1@metostore.com", password: "secret" },
  ];
  dbState.profiles = [
    { id: "admin-uuid-1", role: "admin", full_name: "Admin METO", phone: "0101" },
    { id: "merch-uuid-1", role: "merchant", full_name: "تاجر معتمد", phone: "0102" },
  ];
  dbState.merchant_accounts = [
    { id: "m-acc-1", user_id: "merch-uuid-1", balance_egp: 500, margin_percent: 10, is_active: true },
  ];
  dbState.wallet_ledger = [];
  dbState.orders = [];
  dbState.store_settings = [
    {
      id: 1,
      egp_rate: 50,
      fazer_balance: 200,
      fazer_balance_currency: "USD",
      fazer_balance_updated_at: null,
      packages_synced_at: new Date().toISOString(),
    },
  ];
  dbState.fazer_packages = [
    {
      offer_id: "ml_86",
      game_id: "mlbb",
      category: "diamonds",
      name: "86 Diamonds",
      diamonds: 86,
      bonus_diamonds: 0,
      currency_name: "Diamonds",
      cost_usd: 2,
      regions: null,
      active: true,
      raw: { fazer_category_id: "cat_mlbb_1" },
      updated_at: new Date().toISOString(),
    },
    {
      offer_id: "pubg_60",
      game_id: "pubg",
      category: "diamonds",
      name: "60 UC",
      diamonds: 60,
      bonus_diamonds: 0,
      currency_name: "UC",
      cost_usd: 1,
      regions: null,
      active: true,
      raw: { fazer_category_id: "cat_pubg_1" },
      updated_at: new Date().toISOString(),
    },
  ];
}

function makeQuery(table: keyof typeof dbState) {
  let rows = [...(dbState[table] as TableRow[])];
  let mode: "select" | "insert" | "update" | "upsert" = "select";
  let payload: any = null;
  let wantCount = false;

  const filters: Array<(r: TableRow) => boolean> = [];

  const applyFilters = (list: TableRow[]) => list.filter((r) => filters.every((f) => f(r)));

  const execute = async (singleMode?: "single" | "maybeSingle") => {
    if (mode === "insert") {
      const incoming = Array.isArray(payload) ? payload : [payload];
      const inserted = incoming.map((row) => ({
        id: row["id"] || `${table}-${Math.random().toString(36).slice(2, 8)}`,
        created_at: row["created_at"] || new Date().toISOString(),
        updated_at: row["updated_at"] || new Date().toISOString(),
        ...row,
      }));
      (dbState[table] as TableRow[]).push(...inserted);
      const data = singleMode ? inserted[0] ?? null : inserted;
      return { data, error: null };
    }
    if (mode === "upsert") {
      const incoming = Array.isArray(payload) ? payload : [payload];
      const store = dbState[table] as TableRow[];
      for (const item of incoming) {
        const key = table === "fazer_packages" ? "offer_id" : "id";
        const idx = store.findIndex((r) => r[key] === item[key]);
        if (idx >= 0) store[idx] = { ...store[idx], ...item };
        else store.push(item);
      }
      return { data: incoming, error: null };
    }
    if (mode === "update") {
      const store = dbState[table] as TableRow[];
      const matched: TableRow[] = [];
      for (let i = 0; i < store.length; i++) {
        if (filters.every((f) => f(store[i]!))) {
          store[i] = { ...store[i], ...payload };
          matched.push(store[i]!);
        }
      }
      return { data: singleMode ? matched[0] ?? null : matched, error: null };
    }

    const filtered = applyFilters(rows);
    if (singleMode === "single" || singleMode === "maybeSingle") {
      return { data: filtered[0] ?? null, error: null };
    }
    return { data: filtered, count: wantCount ? filtered.length : undefined, error: null };
  };

  const builder: any = {
    select: (_cols?: string, opts?: { count?: string }) => {
      if (opts?.count) wantCount = true;
      return builder;
    },
    insert: (p: any) => {
      mode = "insert";
      payload = p;
      return builder;
    },
    upsert: (p: any) => {
      mode = "upsert";
      payload = p;
      return builder;
    },
    update: (p: any) => {
      mode = "update";
      payload = p;
      return builder;
    },
    eq: (col: string, val: any) => {
      filters.push((r) => r[col] === val);
      return builder;
    },
    in: (col: string, vals: any[]) => {
      filters.push((r) => vals.includes(r[col]));
      return builder;
    },
    order: () => builder,
    range: (from: number, to: number) => {
      rows = rows.slice(from, to + 1);
      return builder;
    },
    limit: (n: number) => {
      rows = rows.slice(0, n);
      return builder;
    },
    single: () => execute("single"),
    maybeSingle: () => execute("maybeSingle"),
    then: (resolve: any, reject: any) => execute().then(resolve, reject),
  };
  return builder;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: (_url: string, _key: string, opts?: any) => {
    const authHeader = opts?.global?.headers?.Authorization || "";
    const tokenFromHeader = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    const resolveUserByToken = (tok: string) => {
      if (tok === "admin-token") return dbState.users[0]!;
      if (tok === "merch-token") return dbState.users[1]!;
      return dbState.users.find((u) => tok === `tok-${u.id}`) || null;
    };

    return {
      from: (table: keyof typeof dbState) => makeQuery(table),
      rpc: async (fn: string, params: Record<string, any>) => {
        if (fn === "debit_merchant_for_order") {
          const m = dbState.merchant_accounts.find((x) => x.id === params["p_merchant_id"] && x.is_active);
          if (!m) return { data: null, error: { message: "merchant_not_found_or_inactive" } };
          if (m.balance_egp < params["p_amount"]) return { data: null, error: { message: "insufficient_balance" } };
          m.balance_egp = Math.round((m.balance_egp - params["p_amount"]) * 100) / 100;
          const entry = {
            id: `led-${dbState.wallet_ledger.length + 1}`,
            merchant_id: m.id,
            amount: -params["p_amount"],
            entry_type: "order_debit",
            reference_type: "order",
            reference_id: params["p_order_ref"],
            balance_after: m.balance_egp,
            note: params["p_note"],
            created_at: new Date().toISOString(),
          };
          dbState.wallet_ledger.push(entry);
          return { data: [{ merchant_id: m.id, new_balance: m.balance_egp, ledger_id: entry.id }], error: null };
        }
        if (fn === "refund_merchant_for_order") {
          const m = dbState.merchant_accounts.find((x) => x.id === params["p_merchant_id"]);
          if (!m) return { data: null, error: { message: "merchant_not_found" } };
          m.balance_egp = Math.round((m.balance_egp + params["p_amount"]) * 100) / 100;
          const entry = {
            id: `led-${dbState.wallet_ledger.length + 1}`,
            merchant_id: m.id,
            amount: params["p_amount"],
            entry_type: "refund",
            reference_type: "order",
            reference_id: params["p_order_ref"],
            balance_after: m.balance_egp,
            note: params["p_note"],
            created_at: new Date().toISOString(),
          };
          dbState.wallet_ledger.push(entry);
          return { data: [{ merchant_id: m.id, new_balance: m.balance_egp, ledger_id: entry.id }], error: null };
        }
        if (fn === "admin_credit_merchant") {
          const m = dbState.merchant_accounts.find((x) => x.id === params["p_merchant_id"]);
          if (!m) return { data: null, error: { message: "merchant_not_found" } };
          m.balance_egp = Math.round((m.balance_egp + params["p_amount"]) * 100) / 100;
          const entry = {
            id: `led-${dbState.wallet_ledger.length + 1}`,
            merchant_id: m.id,
            amount: params["p_amount"],
            entry_type: "admin_credit",
            reference_type: "admin",
            reference_id: null,
            balance_after: m.balance_egp,
            note: params["p_note"],
            created_at: new Date().toISOString(),
          };
          dbState.wallet_ledger.push(entry);
          return { data: [{ merchant_id: m.id, new_balance: m.balance_egp, ledger_id: entry.id }], error: null };
        }
        if (fn === "admin_set_merchant_margin") {
          const m = dbState.merchant_accounts.find((x) => x.id === params["p_merchant_id"]);
          if (!m) return { data: null, error: { message: "merchant_not_found" } };
          m.margin_percent = params["p_margin_percent"];
          return { data: null, error: null };
        }
        return { data: null, error: { message: `unknown rpc ${fn}` } };
      },
      auth: {
        getUser: async (tok?: string) => {
          const u = resolveUserByToken(tok || tokenFromHeader);
          return u ? { data: { user: { id: u.id, email: u.email } }, error: null } : { data: { user: null }, error: { message: "invalid" } };
        },
        signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
          const u = dbState.users.find((x) => x.email === email && x.password === password);
          if (!u) return { data: { session: null, user: null }, error: { message: "Invalid credentials" } };
          const token = u.id === "admin-uuid-1" ? "admin-token" : u.id === "merch-uuid-1" ? "merch-token" : `tok-${u.id}`;
          return {
            data: {
              session: { access_token: token, refresh_token: `ref-${u.id}`, expires_at: Math.floor(Date.now() / 1000) + 3600 },
              user: { id: u.id, email: u.email },
            },
            error: null,
          };
        },
        refreshSession: async ({ refresh_token }: { refresh_token: string }) => {
          const uid = refresh_token.replace(/^ref-/, "");
          const u = dbState.users.find((x) => x.id === uid);
          if (!u) return { data: { session: null, user: null }, error: { message: "invalid" } };
          return {
            data: {
              session: { access_token: `tok-${u.id}`, refresh_token, expires_at: Math.floor(Date.now() / 1000) + 3600 },
              user: { id: u.id, email: u.email },
            },
            error: null,
          };
        },
        admin: {
          createUser: async ({ email, password }: { email: string; password: string }) => {
            const exists = dbState.users.find((u) => u.email === email);
            if (exists) return { data: { user: null }, error: { message: "already exists" } };
            const user = { id: `user-${dbState.users.length + 1}`, email, password };
            dbState.users.push(user);
            return { data: { user }, error: null };
          },
          listUsers: async () => ({ data: { users: dbState.users.map((u) => ({ id: u.id, email: u.email })) } }),
          updateUserById: async () => ({ data: {}, error: null }),
        },
      },
    };
  },
}));

import { handleApiRoute } from "../server/api-handler";
import { FazerCardsService } from "../server/fazercards.service";
import { resolveSupabaseConfig } from "../server/store.service";

function b64Json(obj: object) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

describe("API routes & merchant/admin workflows", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...origEnv,
      M_TOO_SUPABASE_URL: "https://purplepillowref.supabase.co",
      M_TOO_SUPABASE_SECRET_KEY: `hdr.${b64Json({ ref: "purplepillowref", role: "service_role" })}.sig`,
      M_TOO_SUPABASE_PUBLISHABLE_KEY: `hdr.${b64Json({ ref: "purplepillowref", role: "anon" })}.sig`,
    };
    delete process.env["M_TOO_SUPABASE_SERVICE_ROLE_KEY"];
    delete process.env["M_TOO_SUPABASE_ANON_KEY"];
    delete process.env["NEXT_PUBLIC_M_TOO_SUPABASE_ANON_KEY"];
    delete process.env["NEXT_PUBLIC_M_TOO_SUPABASE_PUBLISHABLE_KEY"];
    delete process.env["FAZER_API_KEY"];
    resetDbState();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("prioritizes Vercel M_TOO Supabase config over baked .env Lovable URL", () => {
    process.env["SUPABASE_URL"] = "https://ahhqekauudwgkiokdzzj.supabase.co";
    process.env["VITE_SUPABASE_URL"] = "https://ahhqekauudwgkiokdzzj.supabase.co";
    const resolved = resolveSupabaseConfig();
    expect(resolved.url).toBe("https://purplepillowref.supabase.co");
  });

  it("authenticates via /api/auth/login and loads merchant dashboard", async () => {
    const loginReq = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "merchant1@metostore.com", password: "secret" }),
    });
    const loginRes = await handleApiRoute(loginReq);
    expect(loginRes?.status).toBe(200);
    const loginData = await loginRes!.json();
    expect(loginData.accessToken).toBe("merch-token");
    expect(loginData.merchant.balance_egp).toBe(500);

    const dashReq = new Request("http://localhost/api/merchant/dashboard", {
      headers: { Authorization: `Bearer ${loginData.accessToken}` },
    });
    const dashRes = await handleApiRoute(dashReq);
    expect(dashRes?.status).toBe(200);
    expect(dashRes?.headers.get("cache-control")).toContain("no-store");
    const dashData = await dashRes!.json();
    expect(dashData.stats.balance_egp).toBe(500);
    expect(dashData.stats.margin_percent).toBe(10);
  });

  it("creates a new merchant with initial balance and credits wallet via admin endpoints", async () => {
    const createReq = new Request("http://localhost/api/admin/merchants/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer admin-token" },
      body: JSON.stringify({
        email: "new.merchant@metostore.com",
        password: "Password123!",
        fullName: "تاجر القاهرة",
        phone: "01099988877",
        marginPercent: 8,
        initialBalanceEgp: 1000,
      }),
    });
    const createRes = await handleApiRoute(createReq);
    expect(createRes?.status).toBe(200);
    const createData = await createRes!.json();
    expect(createData.success).toBe(true);
    expect(createData.merchant.balance_egp).toBe(1000);
    expect(createData.merchant.margin_percent).toBe(8);

    // Log in with newly created merchant credentials
    const loginRes = await handleApiRoute(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "new.merchant@metostore.com", password: "Password123!" }),
      }),
    );
    expect(loginRes?.status).toBe(200);
    const loginJson = await loginRes!.json();
    expect(loginJson.merchant.balance_egp).toBe(1000);

    // Credit merchant in USD ($10 = 500 EGP at 50 rate)
    const creditRes = await handleApiRoute(
      new Request("http://localhost/api/admin/merchants/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer admin-token" },
        body: JSON.stringify({
          merchant_id: createData.merchant.id,
          amount_usd: 10,
        }),
      }),
    );
    expect(creditRes?.status).toBe(200);
    const creditJson = await creditRes!.json();
    expect(creditJson.success).toBe(true);
    expect(creditJson.amount_egp).toBe(500);
  });

  it("debits merchant atomically on order and issues automatic refund if FazerCards fails", async () => {
    vi.spyOn(FazerCardsService, "validatePlayer").mockResolvedValue({
      valid: true,
      username: "Mythic#2024",
      accountRegion: "global",
    });
    vi.spyOn(FazerCardsService, "executeTopUp").mockResolvedValue({
      success: false,
      error: "Provider temporarily unavailable",
    });

    const orderReq = new Request("http://localhost/api/orders/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer merch-token" },
      body: JSON.stringify({
        playerId: "12345678",
        zoneId: "2024",
        gameId: "mlbb",
        region: "global",
        asMerchant: true,
        items: [{ offerId: "ml_86", qty: 1 }],
      }),
    });

    const orderRes = await handleApiRoute(orderReq);
    expect(orderRes?.status).toBe(400);
    const data = await orderRes!.json();
    expect(data.status).toBe("failed");
    // 2 USD * 50 * 1.075 * 0.90 = 96.75 -> ceil = 97 EGP
    expect(data.total_egp).toBe(97);
    expect(data.refunded_egp).toBe(97);

    // Merchant balance MUST be restored to 500 EGP with both debit and refund entries
    expect(dbState.merchant_accounts[0]!["balance_egp"]).toBe(500);
    expect(dbState.wallet_ledger.map((e) => e["entry_type"])).toEqual(["order_debit", "refund"]);
  });

  it("returns live Fazer balance & persists it on /api/status", async () => {
    vi.spyOn(FazerCardsService, "checkAccount").mockResolvedValue({
      connected: true,
      balance: 342.8,
      currency: "USD",
      name: "METO Live",
    });
    const res = await handleApiRoute(new Request("http://localhost/api/status"));
    expect(res?.status).toBe(200);
    expect(res?.headers.get("cache-control")).toContain("no-store");
    const json = await res!.json();
    expect(json.fazer.connected).toBe(true);
    expect(json.fazer_balance).toBe(342.8);
    expect(dbState.store_settings[0]!["fazer_balance"]).toBe(342.8);
    expect(json.fx_rates).toBeDefined();
    expect(json.fx_rates.SAR).toBeGreaterThan(0);
  });

  it("allows admin and merchant to set merchant nationality/region and currency", async () => {
    const adminRes = await handleApiRoute(
      new Request("http://localhost/api/admin/merchants/region", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer admin-token" },
        body: JSON.stringify({ merchant_id: "m-acc-1", region: "SA" }),
      }),
    );
    expect(adminRes?.status).toBe(200);
    expect(dbState.profiles.find((p) => p["id"] === "merch-uuid-1")?.["region"]).toBe("SA");

    const merchRes = await handleApiRoute(
      new Request("http://localhost/api/merchant/nationality", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer merch-token" },
        body: JSON.stringify({ region: "AE" }),
      }),
    );
    expect(merchRes?.status).toBe(200);
    expect(dbState.profiles.find((p) => p["id"] === "merch-uuid-1")?.["region"]).toBe("AE");
  });
});
