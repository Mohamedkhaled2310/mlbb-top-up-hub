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
    // 2 * 50 * 1.075 = 107.5 -> ceil = 108
    expect(calcMerchantBasePriceEgp(costUsd, rate, DEFAULT_MERCHANT_MARKUP)).toBe(108);
  });

  it("applies per-merchant margin consistently with or without costUsd", () => {
    const unitFromUsd = calcMerchantUnitPriceEgp(108, 5, 2, 50, DEFAULT_MERCHANT_MARKUP);
    // 2 * 50 * 1.075 * 0.95 = 102.125 -> ceil = 103
    expect(unitFromUsd).toBe(103);

    const unitFromBase = calcMerchantUnitPriceEgp(108, 5);
    // 108 * 0.95 = 102.6 -> ceil = 103
    expect(unitFromBase).toBe(103);
  });

  it("clamps invalid margins and falls back safely on zero/negative values", () => {
    expect(calcMerchantUnitPriceEgp(100, -10)).toBe(100);
    expect(calcMerchantUnitPriceEgp(100, 90)).toBe(50); // clamped at max 50%
    expect(calcRetailPriceEgp(0, 50)).toBe(1);
  });
});

