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
