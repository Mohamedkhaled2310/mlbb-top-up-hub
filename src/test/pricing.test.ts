import { describe, expect, it } from "vitest";
import {
  DEFAULT_EGP_RATE,
  DEFAULT_MERCHANT_MARKUP,
  DEFAULT_RETAIL_MARKUP,
  calcCostEgp,
  calcMerchantBasePriceEgp,
  calcMerchantUnitPriceEgp,
  calcRetailPriceEgp,
} from "../lib/pricing";

describe("pricing helpers", () => {
  it("computes consistent retail and merchant prices from USD cost and EGP rate", () => {
    const costUsd = 2;
    const rate = DEFAULT_EGP_RATE; // 50
    expect(calcCostEgp(costUsd, rate)).toBe(100);
    // 2 * 50 * 1.15 = 115
    expect(calcRetailPriceEgp(costUsd, rate, DEFAULT_RETAIL_MARKUP)).toBe(115);
    // 2 * 50 * 1.05 = 105
    expect(calcMerchantBasePriceEgp(costUsd, rate, DEFAULT_MERCHANT_MARKUP)).toBe(105);
  });

  it("applies per-merchant margin consistently with or without costUsd", () => {
    const unitFromUsd = calcMerchantUnitPriceEgp(105, 5, 2, 50, DEFAULT_MERCHANT_MARKUP);
    // 2 * 50 * (1 + 0.05) = 105
    expect(unitFromUsd).toBe(105);

    const unitFromBase = calcMerchantUnitPriceEgp(105, 5);
    // (105 / 1.05) * (1 + 0.05) = 105
    expect(unitFromBase).toBe(105);
  });

  it("clamps invalid margins and falls back safely on zero/negative values", () => {
    // 105 / 1.05 * (1 + 0) = 100
    expect(calcMerchantUnitPriceEgp(105, -10)).toBe(100);
    expect(calcRetailPriceEgp(0, 50)).toBe(1);
  });
});

