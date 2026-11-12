import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FazerCardsService } from "../server/fazercards.service";

describe("FazerCardsService", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env["FAZER_API_KEY"];
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...origEnv };
    vi.unstubAllGlobals();
  });

  it("refuses simulated validation when FAZER_API_KEY is missing and validates real API responses", async () => {
    expect((await FazerCardsService.validatePlayer("", "", "mlbb")).valid).toBe(false);
    expect((await FazerCardsService.validatePlayer("123", "1234", "mlbb")).valid).toBe(false);
    expect((await FazerCardsService.validatePlayer("12345678", "", "mlbb")).valid).toBe(false);

    // Without FAZER_API_KEY there must NEVER be a mock/simulated valid player
    const noKeyRes = await FazerCardsService.validatePlayer("5123456789", "", "pubg");
    expect(noKeyRes.valid).toBe(false);
    expect(noKeyRes.error).toContain("FAZER_API_KEY");

    process.env["FAZER_API_KEY"] = "test-fazer-key";
    const calls: Array<{ url: string; body: any }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        calls.push({ url, body });
        if (body?.fields?.player_id === "999999999") {
          return new Response(JSON.stringify({ ok: true, valid: false, player_name: null }), { status: 200 });
        }
        return new Response(
          JSON.stringify({
            ok: true,
            category_id: body?.category_id,
            valid: true,
            player_name: "GHOST 乂",
            region: body?.category_id === "mobile_legends" ? "Tunisia" : "Egypt",
          }),
          { status: 200 },
        );
      }),
    );

    const mlbbValid = await FazerCardsService.validatePlayer("740917533", "4273", "mlbb");
    expect(mlbbValid.valid).toBe(true);
    expect(mlbbValid.username).toBe("GHOST 乂");
    expect(mlbbValid.accountRegion).toBe("global");
    expect(calls[0]?.body).toEqual({
      category_id: "mobile_legends",
      fields: { player_id: "740917533", zone_id: "4273" },
    });

    const mlbbInvalid = await FazerCardsService.validatePlayer("999999999", "4273", "mlbb");
    expect(mlbbInvalid.valid).toBe(false);

    const pubgValid = await FazerCardsService.validatePlayer("5123456789", "", "pubg");
    expect(pubgValid.valid).toBe(true);

    const ffValid = await FazerCardsService.validatePlayer("1234567890", "", "freefire");
    expect(ffValid.valid).toBe(true);
    expect(ffValid.accountRegion).toBe("mena");

    const hokValid = await FazerCardsService.validatePlayer("HOK987654", "", "hok");
    expect(hokValid.valid).toBe(true);
  });

  it("checks account profile from /me and wallet balance from /balance", async () => {
    process.env["FAZER_API_KEY"] = "test-fazer-key";
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/balance")) {
        return new Response(JSON.stringify({ ok: true, balance: "185.7500", currency: "USD" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, email: "METO Reseller", plan: "gold", summary: { totalOrders: 42 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await FazerCardsService.checkAccount();
    expect(res.connected).toBe(true);
    expect(res.balance).toBe(185.75);
    expect(res.currency).toBe("USD");
    expect(res.name).toBe("METO Reseller");
  });

  it("discovers categories dynamically via /topups (meta.next_cursor) and classifies all 4 games cleanly", async () => {
    process.env["FAZER_API_KEY"] = "test-fazer-key";

    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/topups?")) {
        return new Response(
          JSON.stringify({
            ok: true,
            items: [
              { category_id: "mobile_legends_global", name: "Mobile Legends (Global)" },
              { category_id: "mobile_legends_adventure", name: "Mobile Legends: Adventure" },
              { category_id: "pubg_mobile_auto", name: "PUBG Mobile (Auto)" },
              { category_id: "pubg_new_state", name: "PUBG: New State" },
              { category_id: "free_fire_mena", name: "Free Fire (MENA)" },
              { category_id: "honor_of_kings", name: "Honor of Kings" },
            ],
            meta: { total: 6, limit: 500, next_cursor: null, has_more: false },
          }),
          { status: 200 },
        );
      }
      if (url.includes("category_id=mobile_legends_global")) {
        return new Response(
          JSON.stringify({
            offers: [{ offer_id: "ml_86", name: "78 + 8 Diamonds", price_usd: "1.0800" }],
          }),
          { status: 200 },
        );
      }
      if (url.includes("category_id=pubg_mobile_auto")) {
        return new Response(
          JSON.stringify({
            offers: [{ offer_id: "60_uc", name: "60 UC", price_usd: "0.8798" }],
          }),
          { status: 200 },
        );
      }
      if (url.includes("category_id=free_fire_mena")) {
        return new Response(
          JSON.stringify({
            offers: [{ offer_id: "110_diamonds", name: "110 Diamonds", price_usd: "0.9200" }],
          }),
          { status: 200 },
        );
      }
      if (url.includes("category_id=honor_of_kings")) {
        return new Response(
          JSON.stringify({
            offers: [{ offer_id: "80_tokens", name: "80 Tokens", price_usd: "0.8400" }],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ offers: [] }), { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const catalog = await FazerCardsService.fetchCatalog();
    expect(catalog.ok).toBe(true);
    expect(catalog.products).toHaveLength(4);

    const ff = catalog.products.find((p) => p.offer_id === "free_fire_mena:110_diamonds");
    expect(ff?.game_id).toBe("freefire");
    expect(ff?.fazer_category_id).toBe("free_fire_mena");
    expect(ff?.regions).toEqual(["mena"]);
    expect(ff?.diamonds).toBe(110);

    const pubg = catalog.products.find((p) => p.offer_id === "pubg_mobile_auto:60_uc");
    expect(pubg?.game_id).toBe("pubg");
    expect(pubg?.currency_name).toBe("UC");
    expect(pubg?.diamonds).toBe(60);

    const hok = catalog.products.find((p) => p.offer_id === "honor_of_kings:80_tokens");
    expect(hok?.game_id).toBe("hok");
    expect(hok?.currency_name).toBe("Tokens");
    expect(hok?.diamonds).toBe(80);

    const ml = catalog.products.find((p) => p.offer_id === "mobile_legends_global:ml_86");
    expect(ml?.game_id).toBe("mlbb");
    expect(ml?.diamonds).toBe(78);
    expect(ml?.bonus_diamonds).toBe(8);
  });

  it("refuses simulated orders without FAZER_API_KEY and sends raw offer_id + server_id for MLBB", async () => {
    const noKeyOrder = await FazerCardsService.executeTopUp({
      offerId: "mobile_legends_global:ml_86",
      playerId: "740917533",
      zoneId: "4273",
      gameId: "mlbb",
    });
    expect(noKeyOrder.success).toBe(false);
    expect(noKeyOrder.error).toContain("FAZER_API_KEY");

    process.env["FAZER_API_KEY"] = "test-fazer-key";
    let capturedBody: any = null;
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
      return new Response(
        JSON.stringify({ ok: true, order: { id: "ord-3095273", status: "processing" } }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const orderRes = await FazerCardsService.executeTopUp({
      offerId: "mobile_legends_global:ml_86",
      playerId: "740917533",
      zoneId: "4273",
      gameId: "mlbb",
    });

    expect(orderRes.success).toBe(true);
    expect(orderRes.transactionId).toBe("ord-3095273");
    expect(capturedBody?.category_id).toBe("mobile_legends_global");
    expect(capturedBody?.offer_id).toBe("ml_86");
    expect(capturedBody?.fields).toEqual({ player_id: "740917533", server_id: "4273" });
  });
});
