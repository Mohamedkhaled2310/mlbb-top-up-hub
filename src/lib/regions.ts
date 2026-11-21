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
    { code: "tr", labelAr: "تركيا (Turkey)", labelEn: "Turkey" },
    { code: "id", labelAr: "إندونيسيا (Indonesia)", labelEn: "Indonesia" },
    { code: "my", labelAr: "ماليزيا (Malaysia)", labelEn: "Malaysia" },
    { code: "ph", labelAr: "الفلبين (Philippines)", labelEn: "Philippines" },
    { code: "ru", labelAr: "روسيا (Russia)", labelEn: "Russia" },
    { code: "sg", labelAr: "سنغافورة (Singapore)", labelEn: "Singapore" },
    { code: "us", labelAr: "الولايات المتحدة (US)", labelEn: "United States" },
    { code: "mena", labelAr: "الشرق الأوسط (MENA)", labelEn: "MENA" },
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
    { code: "my_sg", labelAr: "ماليزيا وسنغافورة (MY/SG)", labelEn: "MY/SG" },
    { code: "ph", labelAr: "الفلبين (Philippines)", labelEn: "Philippines" },
    { code: "sg", labelAr: "سنغافورة (Singapore)", labelEn: "Singapore" },
    { code: "tw", labelAr: "تايوان (Taiwan)", labelEn: "Taiwan" },
    { code: "vn", labelAr: "فيتنام (Vietnam)", labelEn: "Vietnam" },
    { code: "cis", labelAr: "رابطة الدول المستقلة (CIS)", labelEn: "CIS" },
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
  const clean = (code || "").toLowerCase().trim();
  const servers = getGameServers(gameId);
  const found = servers.find((s) => s.code.toLowerCase() === clean);
  if (found) return found.labelAr;

  for (const sList of Object.values(GAME_SERVERS)) {
    const f = sList.find((s) => s.code.toLowerCase() === clean);
    if (f) return f.labelAr;
  }

  const knownLabels: Record<string, string> = {
    global: "عالمي (Global)",
    br: "البرازيل (Brazil)",
    brazil: "البرازيل (Brazil)",
    tr: "تركيا (Turkey)",
    turkey: "تركيا (Turkey)",
    id: "إندونيسيا (Indonesia)",
    indonesia: "إندونيسيا (Indonesia)",
    my: "ماليزيا (Malaysia)",
    malaysia: "ماليزيا (Malaysia)",
    ph: "الفلبين (Philippines)",
    philippines: "الفلبين (Philippines)",
    ru: "روسيا (Russia)",
    russia: "روسيا (Russia)",
    sg: "سنغافورة (Singapore)",
    singapore: "سنغافورة (Singapore)",
    us: "الولايات المتحدة (US)",
    united_states: "الولايات المتحدة (US)",
    mena: "الشرق الأوسط (MENA)",
    kr: "كوريا / اليابان (KRJP)",
    tw: "تايوان (Taiwan)",
    vn: "فيتنام (Vietnam)",
    eu: "أوروبا (Europe)",
    th: "تايلاند (Thailand)",
    my_sg: "ماليزيا وسنغافورة (MY/SG)",
    cis: "رابطة الدول المستقلة (CIS)",
    bd: "بنغلاديش (Bangladesh)",
    latam: "أمريكا اللاتينية (LATAM)",
  };

  return knownLabels[clean] || (code || "").toUpperCase();
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

export const NOISY_ODD_MLBB_TIERS = new Set<string>();

export function isNoisyOddMlbbPackage(_pkg: { gameId?: string | undefined; offerId?: string | undefined; id?: string | undefined; name?: string | undefined }): boolean {
  return false;
}

export function getExplicitServerRegion(p: { id?: string | undefined; offerId?: string | undefined; regions?: string[] | null | undefined }): string | null {
  const str = String(p.offerId || p.id || "").toLowerCase();
  if (str.startsWith("mobile_legends_philippines") || str.includes(":ph_")) return "ph";
  if (str.startsWith("mobile_legends_malaysia") || str.includes(":my_")) return "my";
  if (str.startsWith("mobile_legends_indonesia") || str.includes(":id_")) return "id";
  if (str.startsWith("mobile_legends_brazil") || str.includes(":br_")) return "br";
  if (str.startsWith("mobile_legends_turkey") || str.includes(":tr_")) return "tr";
  if (str.startsWith("mobile_legends_ru") || str.includes(":ru_")) return "ru";
  if (str.startsWith("mobile_legends_singapore") || str.includes(":sg_")) return "sg";
  if (str.startsWith("mobile_legends_united_states") || str.includes(":us_")) return "us";
  if (str.startsWith("mobile_legends_global")) return "global";
  if (str.startsWith("free_fire_br")) return "br";
  if (str.startsWith("free_fire_id")) return "id";
  if (str.startsWith("free_fire_sg")) return "sg";
  if (str.startsWith("free_fire_eu")) return "eu";
  if (str.startsWith("free_fire_my_sg")) return "my_sg";
  if (str.startsWith("free_fire_bd")) return "bd";
  if (str.startsWith("free_fire_cis")) return "cis";
  if (str.startsWith("free_fire_latam")) return "latam";
  if (str.startsWith("free_fire_th")) return "th";
  if (str.startsWith("free_fire_tw")) return "tw";
  if (str.startsWith("free_fire_vn")) return "vn";
  if (str.startsWith("free_fire_mena")) return "mena";

  if (Array.isArray(p.regions) && p.regions.length === 1) {
    const r = normalizeRegion(p.regions[0]);
    if (r && r !== "global") return r;
  }
  return null;
}

/**
 * Filters and prioritizes packages for a given game and selected server so that:
 * - For any diamond tier, if an exact server package exists, it is shown.
 * - If not, the global package is shown as fallback.
 * - Duplicate diamond tiers with conflicting prices are eliminated.
 * - Regional servers never show packages belonging to other countries.
 * - Global server only shows Global packages, and never regional packages.
 * - Inactive or uncurated packages remain hidden.
 */
export function filterPackagesForServer(
  gamePackages: TopUpPackage[],
  serverCode: string,
  searchQuery = "",
): TopUpPackage[] {
  const q = searchQuery.trim().toLowerCase();
  const selReg = normalizeRegion(serverCode || "global");

  const matched = gamePackages.filter((p) => {
    if (isNoisyOddMlbbPackage(p)) return false;
    if (p.active === false) return false;
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
    if (p.active === false) continue;

    const pExplicitReg = getExplicitServerRegion(p);
    const regs = Array.isArray(p.regions) && p.regions.length
      ? p.regions.map(normalizeRegion)
      : ["global"];

    const isExact = regs.includes(selReg) || pExplicitReg === selReg;
    const isGlobal = (regs.includes("global") || pExplicitReg === "global") && !pExplicitReg;

    if (selReg === "global") {
      // In Global server, NEVER show packages belonging to specific regional countries
      if (pExplicitReg && pExplicitReg !== "global") continue;
      if (!isExact && !regs.includes("global")) continue;
    } else if (selReg !== "all") {
      // In a specific regional server, NEVER show packages belonging to a different country
      if (pExplicitReg && pExplicitReg !== selReg && pExplicitReg !== "global") continue;
      if (!isExact && !isGlobal) continue;
    }

    // Determine normalized tier key for proper deduplication
    const normName = (p.name || "").toLowerCase();
    const offerIdStr = String(p.offerId || p.id || "").toLowerCase();
    let tierKey = "";
    if (normName.includes("weekly") && (normName.includes("pass") || normName.includes("diamond"))) {
      tierKey = "pass:weekly_diamond_pass";
    } else if (normName.includes("twilight") && normName.includes("pass")) {
      tierKey = "pass:twilight_pass";
    } else if (normName.includes("monthly") && normName.includes("pass")) {
      tierKey = "pass:monthly_pass";
    } else if ((p.category || "").toLowerCase() === "weekly_pass") {
      tierKey = `weekly_pass:${p.diamonds || 0}`;
    } else {
      const cleanName = normName
        .replace(/\b(global|mena|brazil|br|turkey|tr|indonesia|id|malaysia|my|philippines|ph|singapore|sg|russia|ru|united states|us)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      tierKey = `${p.category || "diamonds"}_${p.diamonds || 0}_${cleanName}`;
    }

    // Guarantee that Global Weekly Pass is strictly mobile_legends_global:weekly_pass
    if (tierKey === "pass:weekly_diamond_pass") {
      if (selReg === "global" && !offerIdStr.includes("mobile_legends_global:weekly_pass")) {
        continue;
      }
    }

    const existing = seenTiers.get(tierKey);
    if (!existing) {
      seenTiers.set(tierKey, p);
      result.push(p);
    } else {
      const existingExplicit = getExplicitServerRegion(existing);
      const existingRegs = Array.isArray(existing.regions) && existing.regions.length
        ? existing.regions.map(normalizeRegion)
        : ["global"];
      const existingIsExact = existingRegs.includes(selReg) || existingExplicit === selReg;
      if (!existingIsExact && isExact) {
        const idx = result.indexOf(existing);
        if (idx !== -1) {
          result[idx] = p;
          seenTiers.set(tierKey, p);
        }
      }
    }
  }

  return result;
}
