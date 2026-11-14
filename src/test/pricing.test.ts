import { describe, expect, it } from "vitest";
import {
  DEFAULT_EGP_RATE,
  DEFAULT_MERCHANT_MARKUP,
  DEFAULT_RETAIL_MARKUP,
  calcCostEgp,
  calcMerchantBasePriceEgp,
  calcMerchantUnitPriceEgp,
  calcRetailPriceEgp,
  formatDecimals3,
  round3,
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

  it("when merchant margin is 0%, price strictly equals wholesale cost with zero extra markup or rounding up", () => {
    const costUsd = 1.33; // Weekly Diamond Pass
    const rate = 50;
    const wholesaleCost = calcCostEgp(costUsd, rate); // 66.5
    expect(wholesaleCost).toBe(66.5);

    const priceWhenMarginZero = calcMerchantUnitPriceEgp(wholesaleCost, 0, costUsd, rate);
    expect(priceWhenMarginZero).toBe(66.5); // Must be exactly 66.5, not 67!
    expect(priceWhenMarginZero - wholesaleCost).toBe(0);

    const priceFraction = calcMerchantUnitPriceEgp(12.25, 0, 0.245, 50);
    expect(priceFraction).toBe(12.25); // Must be exactly 12.25, not 13!
  });

  it("formats decimal numbers with at most 3 decimal places without noise", () => {
    expect(round3(66.5)).toBe(66.5);
    expect(round3(69.825)).toBe(69.825);
    expect(round3(66.6666667)).toBe(66.667);
    expect(formatDecimals3(66.5)).toBe("66.5");
    expect(formatDecimals3(69.825)).toBe("69.825");
    expect(formatDecimals3(1234.5678)).toBe("1,234.568");
  });

  it("clamps invalid margins and falls back safely on zero/negative values", () => {
    // 105 / 1.05 * (1 + 0) = 100
    expect(calcMerchantUnitPriceEgp(105, -10)).toBe(100);
    expect(calcRetailPriceEgp(0, 50)).toBe(1);
  });
});

