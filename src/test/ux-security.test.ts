import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../server/rate-limit";
import { clearRecentAccounts, getRecentAccounts, saveRecentAccount } from "../lib/recent-players";

describe("Security & UX Enhancements", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Rate Limiting Service", () => {
    it("extracts client IP from Cloudflare or X-Forwarded-For headers accurately", () => {
      const req1 = new Request("http://localhost/api/test", {
        headers: { "cf-connecting-ip": "197.35.120.44" },
      });
      expect(getClientIp(req1)).toBe("197.35.120.44");

      const req2 = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "41.238.10.2, 10.0.0.1" },
      });
      expect(getClientIp(req2)).toBe("41.238.10.2");

      const req3 = new Request("http://localhost/api/test");
      expect(getClientIp(req3)).toBe("127.0.0.1");
    });

    it("enforces sliding window request limit and returns 429 when exceeded", () => {
      const key = `test-ip-${Math.random()}`;

      // Allow 3 requests within window
      expect(checkRateLimit(key, 3, 1000).allowed).toBe(true);
      expect(checkRateLimit(key, 3, 1000).allowed).toBe(true);
      expect(checkRateLimit(key, 3, 1000).allowed).toBe(true);

      // 4th request must be blocked
      const blocked = checkRateLimit(key, 3, 1000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

      const resp = rateLimitResponse(blocked.retryAfterSeconds);
      expect(resp.status).toBe(429);
      expect(resp.headers.get("retry-after")).toBe(String(blocked.retryAfterSeconds));
    });
  });

  describe("Recent Player Accounts (UX)", () => {
    it("saves and retrieves recent accounts per game in chronological order", () => {
      saveRecentAccount({ id: "1001", zoneId: "2001", name: "PlayerOne", gameId: "mlbb" });
      saveRecentAccount({ id: "1002", zoneId: "2002", name: "PlayerTwo", gameId: "mlbb" });
      saveRecentAccount({ id: "9001", name: "PubgHero", gameId: "pubg" });

      const mlbbAccounts = getRecentAccounts("mlbb");
      expect(mlbbAccounts.length).toBe(2);
      expect(mlbbAccounts[0]?.id).toBe("1002");
      expect(mlbbAccounts[1]?.id).toBe("1001");

      const pubgAccounts = getRecentAccounts("pubg");
      expect(pubgAccounts.length).toBe(1);
      expect(pubgAccounts[0]?.name).toBe("PubgHero");
    });

    it("deduplicates accounts and caps at maximum allowed per game", () => {
      for (let i = 1; i <= 7; i++) {
        saveRecentAccount({ id: `id-${i}`, gameId: "mlbb" });
      }

      const mlbb = getRecentAccounts("mlbb");
      expect(mlbb.length).toBe(5);
      expect(mlbb[0]?.id).toBe("id-7");

      // Re-saving id-3 moves it to the top
      saveRecentAccount({ id: "id-3", name: "UpdatedName", gameId: "mlbb" });
      const reordered = getRecentAccounts("mlbb");
      expect(reordered[0]?.id).toBe("id-3");
      expect(reordered[0]?.name).toBe("UpdatedName");
      expect(reordered.length).toBe(5);
    });

    it("clears accounts cleanly", () => {
      saveRecentAccount({ id: "1001", gameId: "mlbb" });
      saveRecentAccount({ id: "9001", gameId: "pubg" });

      clearRecentAccounts("mlbb");
      expect(getRecentAccounts("mlbb")).toEqual([]);
      expect(getRecentAccounts("pubg").length).toBe(1);

      clearRecentAccounts();
      expect(getRecentAccounts()).toEqual([]);
    });
  });
});

