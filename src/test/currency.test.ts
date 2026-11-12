import { describe, expect, it } from "vitest";
import {
  MERCHANT_COUNTRIES,
  formatCurrencyAmount,
  getCountryCurrencyInfo,
  getCurrencyRate,
  normalizeCountryCode,
  roundCurrencyAmount,
} from "../lib/currency";
import { calcConvertedPrice, convertEgpToCurrency } from "../lib/pricing";
import { getLiveUsdRates, getLiveUsdToEgpRate } from "../server/fx.service";

describe("Merchant Nationality and Currency System", () => {
  it("defines standard Arab and regional merchant countries with currencies", () => {
    const egypt = getCountryCurrencyInfo("EG");
    expect(egypt.currency).toBe("EGP");
    expect(egypt.decimals).toBe(0);

    const ksa = getCountryCurrencyInfo("SA");
    expect(ksa.currency).toBe("SAR");
    expect(ksa.decimals).toBe(2);

    const uae = getCountryCurrencyInfo("AE");
    expect(uae.currency).toBe("AED");
    expect(uae.decimals).toBe(2);

    const kuwait = getCountryCurrencyInfo("KW");
    expect(kuwait.currency).toBe("KWD");
    expect(kuwait.decimals).toBe(3);

    const usa = getCountryCurrencyInfo("US");
    expect(usa.currency).toBe("USD");
  });

  it("normalizes country codes and currency codes cleanly", () => {
    expect(normalizeCountryCode("eg")).toBe("EG");
    expect(normalizeCountryCode("SAR")).toBe("SA");
    expect(normalizeCountryCode("KWD")).toBe("KW");
    expect(normalizeCountryCode("unknown")).toBe("EG");
    expect(normalizeCountryCode(null)).toBe("EG");
  });

  it("retrieves live or fallback currency rate correctly", () => {
    const fxRates = { SAR: 3.75, AED: 3.6725, KWD: 0.307, EGP: 50.2 };
    expect(getCurrencyRate("USD", fxRates, 50)).toBe(1);
    expect(getCurrencyRate("SAR", fxRates, 50)).toBe(3.75);
    expect(getCurrencyRate("EGP", fxRates, 50)).toBe(50.2);
    expect(getCurrencyRate("EGP", null, 49.5)).toBe(49.5);
  });

  it("converts EGP amount to merchant currency accurately", () => {
    // 1000 EGP at 50 EGP/USD and 3.75 SAR/USD = (1000 / 50) * 3.75 = 75.00 SAR
    const sarBalance = convertEgpToCurrency(1000, 50, 3.75, 2);
    expect(sarBalance).toBe(75);

    // Kuwait Dinar (3 decimals): (1000 / 50) * 0.307 = 6.140 KWD
    const kwdBalance = convertEgpToCurrency(1000, 50, 0.307, 3);
    expect(kwdBalance).toBe(6.14);
  });

  it("calculates converted package price according to target FX rate and margin", () => {
    // Cost 2 USD, merchant markup 7.5%, merchant margin 10%
    // In USD: 2 * 1.075 * 0.90 = 1.935 USD
    // In SAR at 3.75: 1.935 * 3.75 = 7.25625 -> ceiling with 2 decimals = 7.26 SAR
    const sarPrice = calcConvertedPrice(97, 50, 3.75, 2, 2, 10, 0.075);
    expect(sarPrice).toBe(7.26);

    // In EGP at 50: 1.935 * 50 = 96.75 -> 97 EGP
    const egpPrice = calcConvertedPrice(97, 50, 50, 0, 2, 10, 0.075);
    expect(egpPrice).toBe(97);
  });

  it("formats currency amounts nicely for display", () => {
    expect(formatCurrencyAmount(100, "EG")).toContain("ج.م");
    expect(formatCurrencyAmount(75.5, "SA")).toBe("75.50 ر.س");
  });

  it("fetches USD exchange rates safely via fx.service fallback in test mode", async () => {
    const res = await getLiveUsdRates();
    expect(res.rates["USD"]).toBe(1);
    expect(res.rates["EGP"]).toBeGreaterThan(0);
    expect(res.rates["SAR"]).toBe(3.75);

    const egpRate = await getLiveUsdToEgpRate();
    expect(egpRate).toBeGreaterThanOrEqual(40);
  });
});

