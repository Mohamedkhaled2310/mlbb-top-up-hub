import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchBinanceUsdtEgp, getLiveUsdToEgpRate } from "../server/fx.service";
import { loadStoredAuth, useStore } from "../lib/store/useStore";

describe("Binance FX & Remember Me tests", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe("Binance P2P Rate fetching", () => {
    it("parses Binance P2P API response correctly and computes average rate", async () => {
      const mockBinanceResponse = {
        code: "000000",
        message: null,
        data: [
          { adv: { price: "54.80" } },
          { adv: { price: "54.85" } },
          { adv: { price: "54.90" } },
        ],
        success: true,
      };

      vi.spyOn(globalThis, "fetch").mockImplementationOnce(() =>
        Promise.resolve(new Response(JSON.stringify(mockBinanceResponse), { status: 200 })),
      );

      const rate = await fetchBinanceUsdtEgp();
      expect(rate).toBe(54.85); // average of 54.80, 54.85, 54.90
    });

    it("falls back gracefully when Binance returns an error or is unreachable", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementationOnce(() =>
        Promise.reject(new Error("Network timeout")),
      );

      const rate = await fetchBinanceUsdtEgp();
      expect(rate).toBeNull();

      // getLiveUsdToEgpRate falls back to open exchange / 50
      const fallbackRate = await getLiveUsdToEgpRate();
      expect(typeof fallbackRate).toBe("number");
      expect(fallbackRate).toBeGreaterThan(0);
    });
  });

  describe("Remember Me session storage", () => {
    it("persists auth in localStorage when rememberMe is true", () => {
      const token = "token_remember_true";
      const profile = { id: "p1", full_name: "Test Admin" };

      useStore.getState().setAuth(token, profile, null, undefined, true);

      expect(localStorage.getItem("meto_auth_session_v1")).not.toBeNull();
      expect(sessionStorage.getItem("meto_auth_session_v1")).toBeNull();

      const stored = loadStoredAuth();
      expect(stored?.accessToken).toBe(token);
    });

    it("persists auth only in sessionStorage when rememberMe is false", () => {
      const token = "token_remember_false";
      const profile = { id: "p2", full_name: "Test Merchant" };

      useStore.getState().setAuth(token, profile, null, undefined, false);

      expect(localStorage.getItem("meto_auth_session_v1")).toBeNull();
      expect(sessionStorage.getItem("meto_auth_session_v1")).not.toBeNull();

      const stored = loadStoredAuth();
      expect(stored?.accessToken).toBe(token);
    });

    it("clears both storages upon logout", () => {
      useStore.getState().setAuth("temp_token", null, null, undefined, true);
      expect(localStorage.getItem("meto_auth_session_v1")).not.toBeNull();

      useStore.getState().logout();
      expect(localStorage.getItem("meto_auth_session_v1")).toBeNull();
      expect(sessionStorage.getItem("meto_auth_session_v1")).toBeNull();
    });
  });
});
