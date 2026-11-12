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

