import type { TopUpPackage } from "@/types/store";

export interface GameServerRegion {
  code: string;
  labelAr: string;
  labelEn: string;
}

export const GAME_SERVERS: Record<string, GameServerRegion[]> = {
  mlbb: [
    { code: "global", labelAr: "عالمي (Global)", labelEn: "Global" },
    { code: "br", labelAr: "البرازيل (Brazil)", labelEn: "Brazil" },
    { code: "id", labelAr: "إندونيسيا (Indonesia)", labelEn: "Indonesia" },
    { code: "my", labelAr: "ماليزيا (Malaysia)", labelEn: "Malaysia" },
    { code: "ph", labelAr: "الفلبين (Philippines)", labelEn: "Philippines" },
    { code: "tr", labelAr: "تركيا (Turkey)", labelEn: "Turkey" },
    { code: "mena", labelAr: "الشرق الأوسط (MENA)", labelEn: "MENA" },
    { code: "sg", labelAr: "سنغافورة (Singapore)", labelEn: "Singapore" },
    { code: "ru", labelAr: "روسيا (Russia)", labelEn: "Russia" },
  ],
  pubg: [
    { code: "global", labelAr: "عالمي (Global)", labelEn: "Global" },
    { code: "kr", labelAr: "كوريا / اليابان (KRJP)", labelEn: "KR/JP" },
    { code: "tw", labelAr: "تايوان (Taiwan)", labelEn: "Taiwan" },
    { code: "vn", labelAr: "فيتنام (Vietnam)", labelEn: "Vietnam" },
    { code: "mena", labelAr: "الشرق الأوسط (MENA)", labelEn: "MENA" },
  ],
  freefire: [
    { code: "mena", labelAr: "الشرق الأوسط (MENA)", labelEn: "MENA" },
    { code: "global", labelAr: "عالمي (Global)", labelEn: "Global" },
    { code: "br", labelAr: "البرازيل (Brazil)", labelEn: "Brazil" },
    { code: "id", labelAr: "إندونيسيا (Indonesia)", labelEn: "Indonesia" },
    { code: "eu", labelAr: "أوروبا (Europe)", labelEn: "Europe" },
    { code: "th", labelAr: "تايلاند (Thailand)", labelEn: "Thailand" },
  ],
  hok: [
    { code: "global", labelAr: "عالمي (Global)", labelEn: "Global" },
    { code: "br", labelAr: "البرازيل (Brazil)", labelEn: "Brazil" },
    { code: "tr", labelAr: "تركيا (Turkey)", labelEn: "Turkey" },
    { code: "mena", labelAr: "الشرق الأوسط (MENA)", labelEn: "MENA" },
  ],
};

export function getGameServers(gameId = "mlbb"): GameServerRegion[] {
  const g = (gameId || "mlbb").toLowerCase();
  return GAME_SERVERS[g] || GAME_SERVERS["mlbb"]!;
}

export function normalizeRegion(r?: string | null): string {
  if (!r) return "";
  const s = String(r).trim().toLowerCase();
  if (s === "all" || s === "any") return "global";
  if (s === "latin america" || s === "latam") return "latam";
  if (s === "middle east" || s === "middle_east" || s === "me") return "mena";
  if (s === "europe") return "eu";
  return s;
}

export function getServerLabel(code: string, gameId = "mlbb"): string {
  const servers = getGameServers(gameId);
  const found = servers.find((s) => s.code.toLowerCase() === (code || "").toLowerCase());
  if (found) return found.labelAr;
  return (code || "").toUpperCase();
}

/**
 * Finds the exact matching package for targetServerCode (e.g. "br", "mena", "global").
 * If the current package already supports it, keeps it.
 * Otherwise, finds the package with same gameId, category, and diamonds for that server.
 */
export function findMatchingPackageForServer(
  currentPkg: TopUpPackage,
  targetServerCode: string,
  allPackages: TopUpPackage[],
): TopUpPackage {
  if (!currentPkg || !allPackages || !allPackages.length) return currentPkg;
  const targetReg = normalizeRegion(targetServerCode || "global");
  const currentRegs = Array.isArray(currentPkg.regions) && currentPkg.regions.length
    ? currentPkg.regions.map(normalizeRegion)
    : ["global"];

  // If current package already explicitly supports targetReg, keep it!
  if (currentRegs.includes(targetReg) && targetReg !== "global") {
    return currentPkg;
  }

  const curGame = (currentPkg.gameId || "mlbb").toLowerCase();
  const curDiamonds = Number(currentPkg.diamonds || 0);
  const curCategory = currentPkg.category || "diamonds";

  // 1. Try to find exact package supporting targetReg
  const exact = allPackages.find((p) => {
    if (!p.active) return false;
    if ((p.gameId || "mlbb").toLowerCase() !== curGame) return false;
    if (Number(p.diamonds || 0) !== curDiamonds) return false;
    if ((p.category || "diamonds") !== curCategory) return false;
    const pRegs = Array.isArray(p.regions) && p.regions.length
      ? p.regions.map(normalizeRegion)
      : ["global"];
    return pRegs.includes(targetReg);
  });
  if (exact) return exact;

  // 2. Fallback to global package
  const globalPkg = allPackages.find((p) => {
    if (!p.active) return false;
    if ((p.gameId || "mlbb").toLowerCase() !== curGame) return false;
    if (Number(p.diamonds || 0) !== curDiamonds) return false;
    if ((p.category || "diamonds") !== curCategory) return false;
    const pRegs = Array.isArray(p.regions) && p.regions.length
      ? p.regions.map(normalizeRegion)
      : ["global"];
    return pRegs.includes("global");
  });

  return globalPkg || currentPkg;
}

/**
 * Filters and prioritizes packages for a given game and selected server so that:
 * - For any diamond tier, if an exact server package exists, it is shown.
 * - If not, the global package is shown as fallback.
 * - Duplicate diamond tiers with conflicting prices are eliminated.
 */
export function filterPackagesForServer(
  gamePackages: TopUpPackage[],
  serverCode: string,
  searchQuery = "",
): TopUpPackage[] {
  const q = searchQuery.trim().toLowerCase();
  const selReg = normalizeRegion(serverCode || "global");

  const matched = gamePackages.filter((p) => {
    if (!p.active) return false;
    if (!q) return true;
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.offerId || "").toLowerCase().includes(q) ||
      String(p.diamonds || "").includes(q)
    );
  });

  const result: TopUpPackage[] = [];
  const seenTiers = new Map<string, TopUpPackage>();

  for (const p of matched) {
    const regs = Array.isArray(p.regions) && p.regions.length
      ? p.regions.map(normalizeRegion)
      : ["global"];

    const isExact = regs.includes(selReg);
    const isGlobal = regs.includes("global");

    if (!isExact && !isGlobal && selReg !== "all") {
      continue;
    }

    const key = `${p.category || "diamonds"}_${p.diamonds || 0}_${(p.name || "")
      .replace(/\s*(global|mena|brazil|br|turkey|tr|indonesia|id|malaysia|my)\s*/gi, "")
      .trim()}`;

    const existing = seenTiers.get(key);
    if (!existing) {
      seenTiers.set(key, p);
      result.push(p);
    } else {
      const existingRegs = Array.isArray(existing.regions) && existing.regions.length
        ? existing.regions.map(normalizeRegion)
        : ["global"];
      const existingIsExact = existingRegs.includes(selReg);
      if (!existingIsExact && isExact) {
        const idx = result.indexOf(existing);
        if (idx !== -1) {
          result[idx] = p;
          seenTiers.set(key, p);
        }
      }
    }
  }

  return result;
}
