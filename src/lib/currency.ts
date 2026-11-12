export interface CountryCurrencyInfo {
  code: string;
  labelAr: string;
  currency: string;
  symbolAr: string;
  decimals: number;
}

export const MERCHANT_COUNTRIES: CountryCurrencyInfo[] = [
  { code: "EG", labelAr: "مصر", currency: "EGP", symbolAr: "ج.م", decimals: 0 },
  { code: "SA", labelAr: "السعودية", currency: "SAR", symbolAr: "ر.س", decimals: 2 },
  { code: "AE", labelAr: "الإمارات", currency: "AED", symbolAr: "د.إ", decimals: 2 },
  { code: "KW", labelAr: "الكويت", currency: "KWD", symbolAr: "د.ك", decimals: 3 },
  { code: "QA", labelAr: "قطر", currency: "QAR", symbolAr: "ر.ق", decimals: 2 },
  { code: "BH", labelAr: "البحرين", currency: "BHD", symbolAr: "د.ب", decimals: 3 },
  { code: "OM", labelAr: "عُمان", currency: "OMR", symbolAr: "ر.ع", decimals: 3 },
  { code: "JO", labelAr: "الأردن", currency: "JOD", symbolAr: "د.أ", decimals: 3 },
  { code: "IQ", labelAr: "العراق", currency: "IQD", symbolAr: "د.ع", decimals: 0 },
  { code: "LY", labelAr: "ليبيا", currency: "LYD", symbolAr: "د.ل", decimals: 2 },
  { code: "TN", labelAr: "تونس", currency: "TND", symbolAr: "د.ت", decimals: 3 },
  { code: "MA", labelAr: "المغرب", currency: "MAD", symbolAr: "د.م", decimals: 2 },
  { code: "DZ", labelAr: "الجزائر", currency: "DZD", symbolAr: "د.ج", decimals: 0 },
  { code: "TR", labelAr: "تركيا", currency: "TRY", symbolAr: "ل.ت", decimals: 2 },
  { code: "US", labelAr: "الولايات المتحدة", currency: "USD", symbolAr: "$", decimals: 2 },
  { code: "GLOBAL", labelAr: "دولي (USD)", currency: "USD", symbolAr: "$", decimals: 2 },
];

const COUNTRY_MAP = new Map<string, CountryCurrencyInfo>(
  MERCHANT_COUNTRIES.map((item) => [item.code.toUpperCase(), item]),
);

const CURRENCY_FALLBACK_MAP = new Map<string, CountryCurrencyInfo>();
for (const item of MERCHANT_COUNTRIES) {
  if (!CURRENCY_FALLBACK_MAP.has(item.currency)) {
    CURRENCY_FALLBACK_MAP.set(item.currency, item);
  }
}

export const DEFAULT_MERCHANT_COUNTRY = "EG";

export function normalizeCountryCode(region?: string | null): string {
  const clean = (region || "").trim().toUpperCase();
  if (!clean) return DEFAULT_MERCHANT_COUNTRY;
  if (COUNTRY_MAP.has(clean)) return clean;
  if (CURRENCY_FALLBACK_MAP.has(clean)) {
    return CURRENCY_FALLBACK_MAP.get(clean)!.code;
  }
  return DEFAULT_MERCHANT_COUNTRY;
}

export function getCountryCurrencyInfo(region?: string | null): CountryCurrencyInfo {
  const code = normalizeCountryCode(region);
  return COUNTRY_MAP.get(code) || MERCHANT_COUNTRIES[0]!;
}

export function getCurrencyRate(
  currency: string,
  fxRates?: Record<string, number> | null,
  egpRate?: number | null,
): number {
  const upper = (currency || "EGP").trim().toUpperCase();
  if (upper === "USD") return 1;
  const fromFx = fxRates?.[upper];
  if (typeof fromFx === "number" && Number.isFinite(fromFx) && fromFx > 0) {
    return fromFx;
  }
  if (upper === "EGP" && typeof egpRate === "number" && Number.isFinite(egpRate) && egpRate > 0) {
    return egpRate;
  }
  return 0;
}

export function roundCurrencyAmount(value: number, decimals: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (decimals <= 0) {
    return Math.ceil(value);
  }
  const factor = Math.pow(10, decimals);
  return Math.ceil(value * factor) / factor;
}

export function formatCurrencyAmount(value: number, regionOrCurrency?: string | null): string {
  const info = getCountryCurrencyInfo(regionOrCurrency);
  const safeVal = Number.isFinite(value) ? value : 0;
  if (info.decimals === 0) {
    return `${Math.round(safeVal).toLocaleString("en-US")} ${info.symbolAr}`;
  }
  return `${safeVal.toFixed(info.decimals)} ${info.symbolAr}`;
}

