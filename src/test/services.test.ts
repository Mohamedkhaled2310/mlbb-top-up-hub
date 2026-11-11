import { describe, expect, it } from "vitest";
import { FazerCardsService } from "../server/fazercards.service";

describe("FazerCardsService", () => {
  it("rejects missing player id", async () => {
    const res = await FazerCardsService.validatePlayer("", "");
    expect(res.valid).toBe(false);
  });

  it("rejects too-short player id", async () => {
    const res = await FazerCardsService.validatePlayer("123", "1234");
    expect(res.valid).toBe(false);
  });
});
