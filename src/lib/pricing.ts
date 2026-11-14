export const DEFAULT_EGP_RATE = 50;
export const DEFAULT_RETAIL_MARKUP = 0.15;
export const DEFAULT_MERCHANT_MARKUP = 0.05;

/**
 * Rounds a number to at most 3 decimal places without scientific notation or floating-point noise.
 */
export function round3(value: number, fallback = 0): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/**
 * Formats a number for display with up to 3 decimal places and thousand separators (e.g. 1,234.568).
 */
export function formatDecimals3(val: number | string | null | undefined): string {
  const n = Number(val);
  if (!Number.isFinite(n)) return "0";
  const r = Math.round((n + Number.EPSILON) * 1000) / 1000;
  return r.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

export function calcCostEgp(costUsd: number, egpRate: number): number {
  const safeUsd = Number.isFinite(costUsd) && costUsd > 0 ? costUsd : 0;
  const safeRate = Number.isFinite(egpRate) && egpRate > 0 ? egpRate : DEFAULT_EGP_RATE;
  return round3(safeUsd * safeRate, 0);
}

export function calcRetailPriceEgp(
  costUsd: number,
  egpRate: number,
  retailMarkup = DEFAULT_RETAIL_MARKUP,
): number {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return 1;
  const safeRate = Number.isFinite(egpRate) && egpRate > 0 ? egpRate : DEFAULT_EGP_RATE;
  const safeMarkup = Number.isFinite(retailMarkup) && retailMarkup >= 0 ? retailMarkup : DEFAULT_RETAIL_MARKUP;
  return round3(costUsd * safeRate * (1 + safeMarkup), 1);
}

export function calcMerchantBasePriceEgp(
  costUsd: number,
  egpRate: number,
  merchantMarkup = DEFAULT_MERCHANT_MARKUP,
): number {
  const safeRate = Number.isFinite(egpRate) && egpRate > 0 ? egpRate : DEFAULT_EGP_RATE;
  const safeMarkup = Number.isFinite(merchantMarkup) && merchantMarkup >= 0 ? merchantMarkup : 0;
  return round3(costUsd * safeRate * (1 + safeMarkup), 0);
}

export function calcMerchantUnitPriceEgp(
  merchantBasePriceEgp: number,
  merchantMarginPercent = 0,
  costUsd?: number,
  egpRate?: number,
  merchantMarkup = DEFAULT_MERCHANT_MARKUP,
): number {
  const safeMargin = Number.isFinite(merchantMarginPercent)
    ? Math.min(Math.max(merchantMarginPercent, 0), 100)
    : 0;

  if (typeof costUsd === "number" && costUsd > 0 && typeof egpRate === "number" && egpRate > 0) {
    // Exact wholesale cost in EGP: costUsd * egpRate
    // Admin profit margin: Wholesale Cost * (1 + safeMargin / 100)
    // If margin is 0%: price is exactly the wholesale cost without any extra increment or rounding up!
    return round3(costUsd * egpRate * (1 + safeMargin / 100), 0);
  }

  // Fallback when costUsd is not directly provided: derive baseCost
  const baseCost = merchantMarkup > 0 ? merchantBasePriceEgp / (1 + merchantMarkup) : merchantBasePriceEgp;
  return round3(baseCost * (1 + safeMargin / 100), 0);
}

export function calcConvertedPrice(
  unitPriceEgp: number,
  egpRate: number,
  targetFxRate: number,
  decimals = 3,
  costUsd?: number,
  merchantMarginPercent = 0,
  merchantMarkup = DEFAULT_MERCHANT_MARKUP,
): number {
  const safeEgpRate = Number.isFinite(egpRate) && egpRate > 0 ? egpRate : DEFAULT_EGP_RATE;
  const safeFx = Number.isFinite(targetFxRate) && targetFxRate > 0 ? targetFxRate : safeEgpRate;
  const safeMargin = Number.isFinite(merchantMarginPercent)
    ? Math.min(Math.max(merchantMarginPercent, 0), 100)
    : 0;

  const raw =
    typeof costUsd === "number" && costUsd > 0
      ? costUsd * safeFx * (1 + safeMargin / 100)
      : (unitPriceEgp / safeEgpRate) * safeFx;

  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const effectiveDecimals = Math.min(Math.max(decimals, 0), 3);
  if (effectiveDecimals <= 0) {
    return Math.round(raw);
  }
  const factor = Math.pow(10, effectiveDecimals);
  return Math.round((raw + Number.EPSILON) * factor) / factor;
}

export function convertEgpToCurrency(
  amountEgp: number,
  egpRate: number,
  targetFxRate: number,
  decimals = 3,
): number {
  if (!Number.isFinite(amountEgp)) return 0;
  const safeEgpRate = Number.isFinite(egpRate) && egpRate > 0 ? egpRate : DEFAULT_EGP_RATE;
  const safeFx = Number.isFinite(targetFxRate) && targetFxRate > 0 ? targetFxRate : safeEgpRate;
  const converted = (amountEgp / safeEgpRate) * safeFx;
  const effectiveDecimals = Math.min(Math.max(decimals, 0), 3);
  if (effectiveDecimals <= 0) return Math.round(converted);
  const factor = Math.pow(10, effectiveDecimals);
  return Math.round((converted + Number.EPSILON) * factor) / factor;
}

