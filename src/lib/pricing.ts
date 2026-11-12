export const DEFAULT_EGP_RATE = 50;
export const DEFAULT_RETAIL_MARKUP = 0.15;
export const DEFAULT_MERCHANT_MARKUP = 0.075;

function roundUpPositive(value: number, fallback = 1): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(fallback, Math.ceil(value));
}

export function calcCostEgp(costUsd: number, egpRate: number): number {
  const safeUsd = Number.isFinite(costUsd) && costUsd > 0 ? costUsd : 0;
  const safeRate = Number.isFinite(egpRate) && egpRate > 0 ? egpRate : DEFAULT_EGP_RATE;
  return Math.round(safeUsd * safeRate * 100) / 100;
}

export function calcRetailPriceEgp(
  costUsd: number,
  egpRate: number,
  retailMarkup = DEFAULT_RETAIL_MARKUP,
): number {
  const safeRate = Number.isFinite(egpRate) && egpRate > 0 ? egpRate : DEFAULT_EGP_RATE;
  const safeMarkup = Number.isFinite(retailMarkup) && retailMarkup >= 0 ? retailMarkup : DEFAULT_RETAIL_MARKUP;
  return roundUpPositive(costUsd * safeRate * (1 + safeMarkup));
}

export function calcMerchantBasePriceEgp(
  costUsd: number,
  egpRate: number,
  merchantMarkup = DEFAULT_MERCHANT_MARKUP,
): number {
  const safeRate = Number.isFinite(egpRate) && egpRate > 0 ? egpRate : DEFAULT_EGP_RATE;
  const safeMarkup = Number.isFinite(merchantMarkup) && merchantMarkup >= 0 ? merchantMarkup : DEFAULT_MERCHANT_MARKUP;
  return roundUpPositive(costUsd * safeRate * (1 + safeMarkup));
}

export function calcMerchantUnitPriceEgp(
  merchantBasePriceEgp: number,
  merchantMarginPercent = 0,
  costUsd?: number,
  egpRate?: number,
  merchantMarkup = DEFAULT_MERCHANT_MARKUP,
): number {
  const safeMargin = Number.isFinite(merchantMarginPercent)
    ? Math.min(Math.max(merchantMarginPercent, 0), 50)
    : 0;

  if (typeof costUsd === "number" && costUsd > 0 && typeof egpRate === "number" && egpRate > 0) {
    const safeMarkup = Number.isFinite(merchantMarkup) && merchantMarkup >= 0 ? merchantMarkup : DEFAULT_MERCHANT_MARKUP;
    return roundUpPositive(costUsd * egpRate * (1 + safeMarkup) * (1 - safeMargin / 100));
  }

  return roundUpPositive(merchantBasePriceEgp * (1 - safeMargin / 100));
}

export function calcConvertedPrice(
  unitPriceEgp: number,
  egpRate: number,
  targetFxRate: number,
  decimals = 2,
  costUsd?: number,
  merchantMarginPercent = 0,
  merchantMarkup = DEFAULT_MERCHANT_MARKUP,
): number {
  const safeEgpRate = Number.isFinite(egpRate) && egpRate > 0 ? egpRate : DEFAULT_EGP_RATE;
  const safeFx = Number.isFinite(targetFxRate) && targetFxRate > 0 ? targetFxRate : safeEgpRate;
  const safeMargin = Number.isFinite(merchantMarginPercent)
    ? Math.min(Math.max(merchantMarginPercent, 0), 50)
    : 0;
  const safeMarkup = Number.isFinite(merchantMarkup) && merchantMarkup >= 0 ? merchantMarkup : DEFAULT_MERCHANT_MARKUP;

  const raw =
    typeof costUsd === "number" && costUsd > 0
      ? costUsd * safeFx * (1 + safeMarkup) * (1 - safeMargin / 100)
      : (unitPriceEgp / safeEgpRate) * safeFx;

  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (decimals <= 0) {
    return Math.max(1, Math.ceil(raw));
  }
  const factor = Math.pow(10, decimals);
  return Math.max(1 / factor, Math.ceil(raw * factor) / factor);
}

export function convertEgpToCurrency(
  amountEgp: number,
  egpRate: number,
  targetFxRate: number,
  decimals = 2,
): number {
  if (!Number.isFinite(amountEgp)) return 0;
  const safeEgpRate = Number.isFinite(egpRate) && egpRate > 0 ? egpRate : DEFAULT_EGP_RATE;
  const safeFx = Number.isFinite(targetFxRate) && targetFxRate > 0 ? targetFxRate : safeEgpRate;
  const converted = (amountEgp / safeEgpRate) * safeFx;
  if (decimals <= 0) return Math.round(converted);
  const factor = Math.pow(10, decimals);
  return Math.round(converted * factor) / factor;
}

