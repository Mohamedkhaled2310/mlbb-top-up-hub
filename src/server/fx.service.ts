interface LiveRatesResult {
  rates: Record<string, number>;
  updatedAt: string;
  source: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Static baseline fallback rates in case all network attempts fail
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EGP: 50.0,
  SAR: 3.75,
  AED: 3.6725,
  KWD: 0.307,
  QAR: 3.64,
  BHD: 0.376,
  OMR: 0.385,
  JOD: 0.709,
  IQD: 1310.0,
  LYD: 4.88,
  TND: 3.12,
  MAD: 10.05,
  DZD: 134.5,
  TRY: 34.5,
};

let cachedResult: LiveRatesResult | null = null;
let cacheExpiry = 0;
let inFlightPromise: Promise<LiveRatesResult> | null = null;

async function fetchFromPrimary(): Promise<Record<string, number> | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: Record<string, number>; result?: string };
    if (data?.rates && typeof data.rates["EGP"] === "number") {
      return data.rates;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchFromSecondary(): Promise<Record<string, number> | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { usd?: Record<string, number> };
    if (data?.usd) {
      const upperRates: Record<string, number> = {};
      for (const [k, v] of Object.entries(data.usd)) {
        if (typeof v === "number" && v > 0) {
          upperRates[k.toUpperCase()] = v;
        }
      }
      if (typeof upperRates["EGP"] === "number") {
        return upperRates;
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getLiveUsdRates(forceRefresh = false): Promise<LiveRatesResult> {
  if (process.env["VITEST"] && !forceRefresh) {
    return {
      rates: { ...FALLBACK_RATES },
      updatedAt: new Date().toISOString(),
      source: "fallback",
    };
  }

  const now = Date.now();
  if (!forceRefresh && cachedResult && now < cacheExpiry) {
    return cachedResult;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const primaryRates = await fetchFromPrimary();
      if (primaryRates) {
        cachedResult = {
          rates: { ...FALLBACK_RATES, ...primaryRates, USD: 1 },
          updatedAt: new Date().toISOString(),
          source: "open.er-api.com",
        };
        cacheExpiry = Date.now() + CACHE_TTL_MS;
        return cachedResult;
      }

      const secondaryRates = await fetchFromSecondary();
      if (secondaryRates) {
        cachedResult = {
          rates: { ...FALLBACK_RATES, ...secondaryRates, USD: 1 },
          updatedAt: new Date().toISOString(),
          source: "currency-api",
        };
        cacheExpiry = Date.now() + CACHE_TTL_MS;
        return cachedResult;
      }

      if (cachedResult) {
        return cachedResult;
      }

      cachedResult = {
        rates: { ...FALLBACK_RATES },
        updatedAt: new Date().toISOString(),
        source: "fallback",
      };
      cacheExpiry = Date.now() + 60_000;
      return cachedResult;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

export async function getLiveUsdToEgpRate(): Promise<number> {
  const { rates } = await getLiveUsdRates();
  const egp = rates["EGP"];
  if (typeof egp === "number" && egp > 0) {
    return Math.round(egp * 100) / 100;
  }
  return 50.0;
}
