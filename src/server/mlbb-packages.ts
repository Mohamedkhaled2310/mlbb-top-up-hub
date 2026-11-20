/**
 * Curated MLBB (Mobile Legends: Bang Bang) Base and Composite Packages.
 *
 * Provides dedicated, clean base packages and dynamically calculated composite packages
 * for both Global (mobile_legends_global) and Brazil (mobile_legends_brazil) servers.
 *
 * Base Packages (الباقات الأساسية المعتمدة):
 *  - 86 Diamonds (78 + 8)
 *  - 172 Diamonds (156 + 16)
 *  - 257 Diamonds (234 + 23)
 *  - 706 Diamonds (625 + 81)
 *  - 2195 Diamonds (1860 + 335)
 *  - 3688 Diamonds (3099 + 589)
 *  - 5532 Diamonds (4649 + 883)
 *  - 9288 Diamonds (7740 + 1548)
 *
 * Composite Packages (الباقات المتجمعة من الباقات الأساسية):
 *  - 344 Diamonds: 1 x 257 + 1 x 86 (343 Diamonds - optimized cost)
 *  - 429 Diamonds: 1 x 172 + 1 x 257
 *  - 514 Diamonds: 2 x 257
 *  - 600 Diamonds: 1 x 86 + 2 x 257
 *  - 878 Diamonds: 1 x 706 + 1 x 172
 *  - 963 Diamonds: 1 x 706 + 1 x 257
 *  - 1050 Diamonds: 1 x 706 + 1 x 257 + 1 x 86 (1049 Diamonds - optimized cost)
 *  - 1220 Diamonds: 1 x 706 + 2 x 257
 *  - 1412 Diamonds: 2 x 706
 *  - 1669 Diamonds: 2 x 706 + 1 x 257
 *  - 2539 Diamonds: 1 x 2195 + 1 x 257 + 1 x 86 (2538 Diamonds - optimized cost)
 *  - 2901 Diamonds: 1 x 2195 + 1 x 706
 *  - 4394 Diamonds: 1 x 3688 + 1 x 706
 *  - 6238 Diamonds: 1 x 5532 + 1 x 706
 *  - 7727 Diamonds: 1 x 5532 + 1 x 2195
 */

export interface BaseComponentDef {
  baseTotal: 86 | 172 | 257 | 706 | 2195 | 3688 | 5532 | 9288;
  qty: number;
}

export interface MlbbCompositeDef {
  offerId: string;
  name: string;
  totalDiamonds: number;
  components: BaseComponentDef[];
}

export interface MlbbBasePkgInfo {
  totalDiamonds: 86 | 172 | 257 | 706 | 2195 | 3688 | 5532 | 9288;
  baseOfferId: string;
  rawOfferId: string;
  name: string;
  fallbackCostUsd: number;
}

export const MLBB_GLOBAL_BASE_PACKAGES: Record<number, MlbbBasePkgInfo> = {
  86: {
    totalDiamonds: 86,
    baseOfferId: "mobile_legends_global:78_8_diamonds",
    rawOfferId: "78_8_diamonds",
    name: "86 Diamonds",
    fallbackCostUsd: 1.059,
  },
  172: {
    totalDiamonds: 172,
    baseOfferId: "mobile_legends_global:156_16_diamonds",
    rawOfferId: "156_16_diamonds",
    name: "172 Diamonds",
    fallbackCostUsd: 2.099,
  },
  257: {
    totalDiamonds: 257,
    baseOfferId: "mobile_legends_global:234_23_diamonds",
    rawOfferId: "234_23_diamonds",
    name: "257 Diamonds",
    fallbackCostUsd: 3.04,
  },
  706: {
    totalDiamonds: 706,
    baseOfferId: "mobile_legends_global:625_81_diamonds",
    rawOfferId: "625_81_diamonds",
    name: "706 Diamonds",
    fallbackCostUsd: 8.265,
  },
  2195: {
    totalDiamonds: 2195,
    baseOfferId: "mobile_legends_global:1860_335_diamonds",
    rawOfferId: "1860_335_diamonds",
    name: "2195 Diamonds",
    fallbackCostUsd: 25.019,
  },
  3688: {
    totalDiamonds: 3688,
    baseOfferId: "mobile_legends_global:3099_589_diamonds",
    rawOfferId: "3099_589_diamonds",
    name: "3688 Diamonds",
    fallbackCostUsd: 41.738,
  },
  5532: {
    totalDiamonds: 5532,
    baseOfferId: "mobile_legends_global:4649_883_diamonds",
    rawOfferId: "4649_883_diamonds",
    name: "5532 Diamonds",
    fallbackCostUsd: 63.021,
  },
  9288: {
    totalDiamonds: 9288,
    baseOfferId: "mobile_legends_global:7740_1548_diamonds",
    rawOfferId: "7740_1548_diamonds",
    name: "7740 + 1548 Diamonds",
    fallbackCostUsd: 104.67,
  },
};

export const MLBB_BRAZIL_BASE_PACKAGES: Record<number, MlbbBasePkgInfo> = {
  86: {
    totalDiamonds: 86,
    baseOfferId: "mobile_legends_brazil:78_8_diamonds",
    rawOfferId: "78_8_diamonds",
    name: "86 Diamonds",
    fallbackCostUsd: 0.97,
  },
  172: {
    totalDiamonds: 172,
    baseOfferId: "mobile_legends_brazil:156_16_diamonds",
    rawOfferId: "156_16_diamonds",
    name: "172 Diamonds",
    fallbackCostUsd: 1.93,
  },
  257: {
    totalDiamonds: 257,
    baseOfferId: "mobile_legends_brazil:234_23_diamonds",
    rawOfferId: "234_23_diamonds",
    name: "257 Diamonds",
    fallbackCostUsd: 2.88,
  },
  706: {
    totalDiamonds: 706,
    baseOfferId: "mobile_legends_brazil:625_81_diamonds",
    rawOfferId: "625_81_diamonds",
    name: "706 Diamonds",
    fallbackCostUsd: 7.71,
  },
  2195: {
    totalDiamonds: 2195,
    baseOfferId: "mobile_legends_brazil:1860_335_diamonds",
    rawOfferId: "1860_335_diamonds",
    name: "2195 Diamonds",
    fallbackCostUsd: 23.13,
  },
  3688: {
    totalDiamonds: 3688,
    baseOfferId: "mobile_legends_brazil:3099_589_diamonds",
    rawOfferId: "3099_589_diamonds",
    name: "3688 Diamonds",
    fallbackCostUsd: 38.55,
  },
  5532: {
    totalDiamonds: 5532,
    baseOfferId: "mobile_legends_brazil:4649_883_diamonds",
    rawOfferId: "4649_883_diamonds",
    name: "5532 Diamonds",
    fallbackCostUsd: 57.82,
  },
  9288: {
    totalDiamonds: 9288,
    baseOfferId: "mobile_legends_brazil:7740_1548_diamonds",
    rawOfferId: "7740_1548_diamonds",
    name: "7740 + 1548 Diamonds",
    fallbackCostUsd: 96.37,
  },
};

/** Default backward-compatible base packages point to Global */
export const MLBB_BASE_PACKAGES: Record<number, MlbbBasePkgInfo> = MLBB_GLOBAL_BASE_PACKAGES;

export const MLBB_BASE_TARGETS = [86, 172, 257, 706, 2195, 3688, 5532, 9288] as const;

export interface MlbbBonusPkgInfo {
  offerId: string;
  name: string;
  category: "double_diamonds" | "weekly_pass";
  region: "global" | "br";
  diamonds?: number;
  bonusDiamonds?: number;
  fallbackCostUsd: number;
}

export const MLBB_REQUESTED_PACKAGES: MlbbBonusPkgInfo[] = [
  // Global First Top-Up Bonus
  {
    offerId: "mobile_legends_global:50_5_diamonds_first_top_up_bonus",
    name: "50 + 5 Diamonds (First Top-Up Bonus)",
    category: "double_diamonds",
    region: "global",
    diamonds: 50,
    bonusDiamonds: 5,
    fallbackCostUsd: 0.68,
  },
  {
    offerId: "mobile_legends_global:150_15_diamonds_first_top_up_bonus",
    name: "150 + 15 Diamonds (First Top-Up Bonus)",
    category: "double_diamonds",
    region: "global",
    diamonds: 150,
    bonusDiamonds: 15,
    fallbackCostUsd: 2.03,
  },
  {
    offerId: "mobile_legends_global:250_25_diamonds_first_top_up_bonus",
    name: "250 + 25 Diamonds (First Top-Up Bonus)",
    category: "double_diamonds",
    region: "global",
    diamonds: 250,
    bonusDiamonds: 25,
    fallbackCostUsd: 3.26,
  },
  {
    offerId: "mobile_legends_global:500_65_diamonds_first_top_up_bonus",
    name: "500 + 65 Diamonds (First Top-Up Bonus)",
    category: "double_diamonds",
    region: "global",
    diamonds: 500,
    bonusDiamonds: 65,
    fallbackCostUsd: 6.70,
  },
  // Global Elite Packs
  {
    offerId: "mobile_legends_global:weekly_elite_pack",
    name: "Weekly Elite Pack",
    category: "weekly_pass",
    region: "global",
    diamonds: 0,
    bonusDiamonds: 0,
    fallbackCostUsd: 0.69,
  },
  {
    offerId: "mobile_legends_global:monthly_elite_pack",
    name: "Monthly Elite Pack",
    category: "weekly_pass",
    region: "global",
    diamonds: 0,
    bonusDiamonds: 0,
    fallbackCostUsd: 3.43,
  },
  // Brazil First Top-Up Bonus
  {
    offerId: "mobile_legends_brazil:50_5_diamonds_first_top_up_bonus",
    name: "50 + 5 Diamonds (First Top-Up Bonus)",
    category: "double_diamonds",
    region: "br",
    diamonds: 50,
    bonusDiamonds: 5,
    fallbackCostUsd: 0.65,
  },
  {
    offerId: "mobile_legends_brazil:150_15_diamonds_first_top_up_bonus",
    name: "150 + 15 Diamonds (First Top-Up Bonus)",
    category: "double_diamonds",
    region: "br",
    diamonds: 150,
    bonusDiamonds: 15,
    fallbackCostUsd: 1.92,
  },
  {
    offerId: "mobile_legends_brazil:250_25_diamonds_first_top_up_bonus",
    name: "250 + 25 Diamonds (First Top-Up Bonus)",
    category: "double_diamonds",
    region: "br",
    diamonds: 250,
    bonusDiamonds: 25,
    fallbackCostUsd: 3.17,
  },
  {
    offerId: "mobile_legends_brazil:500_65_diamonds_first_top_up_bonus",
    name: "500 + 65 Diamonds (First Top-Up Bonus)",
    category: "double_diamonds",
    region: "br",
    diamonds: 500,
    bonusDiamonds: 65,
    fallbackCostUsd: 6.5,
  },
];

export const MLBB_COMPOSITE_DEFINITIONS: MlbbCompositeDef[] = [
  {
    offerId: "mlbb_composite_344",
    name: "344 Diamonds",
    totalDiamonds: 344,
    components: [{ baseTotal: 172, qty: 2 }],
  },
  {
    offerId: "mlbb_composite_429",
    name: "429 Diamonds",
    totalDiamonds: 429,
    components: [
      { baseTotal: 172, qty: 1 },
      { baseTotal: 257, qty: 1 },
    ],
  },
  {
    offerId: "mlbb_composite_514",
    name: "514 Diamonds",
    totalDiamonds: 514,
    components: [{ baseTotal: 257, qty: 2 }],
  },
  {
    offerId: "mlbb_composite_600",
    name: "600 Diamonds",
    totalDiamonds: 600,
    components: [
      { baseTotal: 86, qty: 1 },
      { baseTotal: 257, qty: 2 },
    ],
  },
  {
    offerId: "mlbb_composite_878",
    name: "878 Diamonds",
    totalDiamonds: 878,
    components: [
      { baseTotal: 706, qty: 1 },
      { baseTotal: 172, qty: 1 },
    ],
  },
  {
    offerId: "mlbb_composite_963",
    name: "963 Diamonds",
    totalDiamonds: 963,
    components: [
      { baseTotal: 706, qty: 1 },
      { baseTotal: 257, qty: 1 },
    ],
  },
  {
    offerId: "mlbb_composite_1050",
    name: "1050 Diamonds",
    totalDiamonds: 1050,
    components: [
      { baseTotal: 706, qty: 1 },
      { baseTotal: 172, qty: 2 },
    ],
  },
  {
    offerId: "mlbb_composite_1220",
    name: "1220 Diamonds",
    totalDiamonds: 1220,
    components: [
      { baseTotal: 706, qty: 1 },
      { baseTotal: 257, qty: 2 },
    ],
  },
  {
    offerId: "mlbb_composite_1412",
    name: "1412 Diamonds",
    totalDiamonds: 1412,
    components: [{ baseTotal: 706, qty: 2 }],
  },
  {
    offerId: "mlbb_composite_1669",
    name: "1669 Diamonds",
    totalDiamonds: 1669,
    components: [
      { baseTotal: 706, qty: 2 },
      { baseTotal: 257, qty: 1 },
    ],
  },
  {
    offerId: "mlbb_composite_2539",
    name: "2539 Diamonds",
    totalDiamonds: 2539,
    components: [
      { baseTotal: 2195, qty: 1 },
      { baseTotal: 172, qty: 2 },
    ],
  },
  {
    offerId: "mlbb_composite_2901",
    name: "2901 Diamonds",
    totalDiamonds: 2901,
    components: [
      { baseTotal: 2195, qty: 1 },
      { baseTotal: 706, qty: 1 },
    ],
  },
  {
    offerId: "mlbb_composite_4394",
    name: "4394 Diamonds",
    totalDiamonds: 4394,
    components: [
      { baseTotal: 3688, qty: 1 },
      { baseTotal: 706, qty: 1 },
    ],
  },
  {
    offerId: "mlbb_composite_6238",
    name: "6238 Diamonds",
    totalDiamonds: 6238,
    components: [
      { baseTotal: 5532, qty: 1 },
      { baseTotal: 706, qty: 1 },
    ],
  },
  {
    offerId: "mlbb_composite_7727",
    name: "7727 Diamonds",
    totalDiamonds: 7727,
    components: [
      { baseTotal: 5532, qty: 1 },
      { baseTotal: 2195, qty: 1 },
    ],
  },
];

/**
 * Finds the base package for a given target diamond count and region.
 * Defaults to Global base packages. If region is "br", selects Brazil base package.
 */
export function findBasePackageForTarget(allPkgs: any[], targetTotal: number, preferredRegion = "global") {
  const norm = (preferredRegion || "global").toLowerCase();
  const baseMap = norm === "br" || norm === "brazil" ? MLBB_BRAZIL_BASE_PACKAGES : MLBB_GLOBAL_BASE_PACKAGES;
  const baseInfo = baseMap[targetTotal] || MLBB_GLOBAL_BASE_PACKAGES[targetTotal];

  if (baseInfo) {
    const found = allPkgs.find((p) => p.offer_id === baseInfo.baseOfferId);
    if (found) return found;
  }

  // Fallback: match by diamonds count and preferred region
  const regionalMatch = allPkgs.find(
    (p) =>
      p.game_id === "mlbb" &&
      Number(p.diamonds || 0) + Number(p.bonus_diamonds || 0) === targetTotal &&
      !p.raw?.is_composite &&
      ((Array.isArray(p.regions) && p.regions.includes(norm)) || (p.offer_id && p.offer_id.includes(norm))),
  );
  if (regionalMatch) return regionalMatch;

  // Generic fallback: match by diamonds count
  return allPkgs.find(
    (p) =>
      p.game_id === "mlbb" &&
      Number(p.diamonds || 0) + Number(p.bonus_diamonds || 0) === targetTotal &&
      !p.raw?.is_composite,
  );
}

/**
 * Generates the 15 composite package rows dynamically calculated from base package costs for a given region.
 * - region="global": generates "mlbb_composite_X" with components mapped to mobile_legends_global
 * - region="br": generates "mlbb_composite_br_X" with components mapped to mobile_legends_brazil
 */
export function generateCompositePackageRows(allPkgs: any[], region: "global" | "br" = "global") {
  const nowIso = new Date().toISOString();
  const rows: any[] = [];
  const isBr = region === "br";
  const catId = isBr ? "mobile_legends_brazil" : "mobile_legends_global";
  const baseMap = isBr ? MLBB_BRAZIL_BASE_PACKAGES : MLBB_GLOBAL_BASE_PACKAGES;

  for (const def of MLBB_COMPOSITE_DEFINITIONS) {
    let totalCostUsd = 0;
    const resolvedComponents: any[] = [];

    for (const comp of def.components) {
      const baseInfo = baseMap[comp.baseTotal];
      const basePkg = findBasePackageForTarget(allPkgs, comp.baseTotal, region);
      const unitCost = Number(basePkg?.cost_usd ?? baseInfo?.fallbackCostUsd ?? 1);
      const offerId = basePkg?.offer_id || baseInfo?.baseOfferId || `${catId}:${comp.baseTotal}_diamonds`;
      const rawOfferId =
        basePkg?.raw?.fazer_offer_id || baseInfo?.rawOfferId || (offerId.includes(":") ? offerId.split(":").pop()! : offerId);

      totalCostUsd += unitCost * comp.qty;
      resolvedComponents.push({
        offer_id: offerId,
        fazer_offer_id: rawOfferId,
        fazer_category_id: catId,
        diamonds: comp.baseTotal,
        qty: comp.qty,
        cost_usd: unitCost,
      });
    }

    totalCostUsd = Math.round(totalCostUsd * 10000) / 10000;
    const compositeOfferId = isBr ? `mlbb_composite_br_${def.totalDiamonds}` : def.offerId;

    rows.push({
      offer_id: compositeOfferId,
      game_id: "mlbb",
      category: "diamonds",
      name: def.name,
      diamonds: def.totalDiamonds,
      bonus_diamonds: 0,
      currency_name: "Diamonds",
      cost_usd: totalCostUsd,
      regions: isBr ? ["br"] : ["global"],
      active: true,
      raw: {
        is_composite: true,
        total_diamonds: def.totalDiamonds,
        fazer_category_id: catId,
        components: resolvedComponents,
      },
      updated_at: nowIso,
    });
  }

  return rows;
}

/**
 * Curates MLBB packages in Supabase:
 *  - Activates the 8 Global base packages with clean names, regions: ["global"], and exact Global wholesale costs
 *  - Activates the 8 Brazil base packages with clean names, regions: ["br"], and exact Brazil wholesale costs
 *  - Upserts & activates the 15 Global composite packages (regions: ["global"])
 *  - Upserts & activates the 15 Brazil composite packages (regions: ["br"])
 *  - Activates Weekly Diamond Pass for Global (mobile_legends_global:weekly_pass) with exact Global wholesale cost
 *  - Activates Weekly Diamond Pass for Brazil (mobile_legends_brazil:weekly_pass) with exact Brazil wholesale cost
 *  - Activates Twilight Pass for Global & Brazil with their respective server costs
 *  - Preserves any custom wholesale prices configured by admin
 *  - Deactivates legacy or noisy uncurated MLBB packages
 */
export async function curateMlbbPackages(sb: any) {
  const { data: allPkgs } = await sb.from("fazer_packages").select("*").eq("game_id", "mlbb");
  const pkgs = allPkgs || [];
  const nowIso = new Date().toISOString();
  const rowsToUpsert: any[] = [];

  // 1. Curate Global base packages
  for (const b of Object.values(MLBB_GLOBAL_BASE_PACKAGES)) {
    const existing = pkgs.find((p: any) => p.offer_id === b.baseOfferId);
    const hasAdminCustom = existing?.raw?.cost_edited_by_admin && typeof existing.raw.custom_cost_usd === "number" && b.baseOfferId !== "mobile_legends_global:78_8_diamonds";
    const rawFazerCost = Number(existing?.raw?.price_usd ?? existing?.raw?.cost_usd ?? 0);
    const effectiveCost = hasAdminCustom
      ? existing.raw.custom_cost_usd
      : rawFazerCost > 0
        ? rawFazerCost
        : Number.isFinite(Number(existing?.cost_usd)) && Number(existing.cost_usd) > 0
          ? Number(existing.cost_usd)
          : b.fallbackCostUsd;

    if (existing) {
      existing.cost_usd = effectiveCost;
    }

    rowsToUpsert.push({
      offer_id: b.baseOfferId,
      game_id: "mlbb",
      name: b.name,
      category: "diamonds",
      diamonds: b.totalDiamonds === 9288 ? 7740 : b.totalDiamonds,
      bonus_diamonds: b.totalDiamonds === 9288 ? 1548 : 0,
      regions: ["global"],
      cost_usd: effectiveCost,
      active: true,
      raw: existing?.raw ?? null,
      updated_at: nowIso,
    });
  }

  // 2. Curate Brazil base packages
  for (const b of Object.values(MLBB_BRAZIL_BASE_PACKAGES)) {
    const existing = pkgs.find((p: any) => p.offer_id === b.baseOfferId);
    const hasAdminCustom = existing?.raw?.cost_edited_by_admin && typeof existing.raw.custom_cost_usd === "number" && b.baseOfferId !== "mobile_legends_global:78_8_diamonds";
    const rawFazerCost = Number(existing?.raw?.price_usd ?? existing?.raw?.cost_usd ?? 0);
    const effectiveCost = hasAdminCustom
      ? existing.raw.custom_cost_usd
      : rawFazerCost > 0
        ? rawFazerCost
        : Number.isFinite(Number(existing?.cost_usd)) && Number(existing.cost_usd) > 0
          ? Number(existing.cost_usd)
          : b.fallbackCostUsd;

    if (existing) {
      existing.cost_usd = effectiveCost;
    }

    rowsToUpsert.push({
      offer_id: b.baseOfferId,
      game_id: "mlbb",
      name: b.name,
      category: "diamonds",
      diamonds: b.totalDiamonds === 9288 ? 7740 : b.totalDiamonds,
      bonus_diamonds: b.totalDiamonds === 9288 ? 1548 : 0,
      regions: ["br"],
      cost_usd: effectiveCost,
      active: true,
      raw: existing?.raw ?? null,
      updated_at: nowIso,
    });
  }

  // 3. Curate Weekly Passes for Global and Brazil (Always pick up live Fazer wholesale cost)
  const globalWp = pkgs.find((p: any) => p.offer_id === "mobile_legends_global:weekly_pass");
  const hasGlobalWpCustom = globalWp?.raw?.cost_edited_by_admin && typeof globalWp.raw.custom_cost_usd === "number";
  const rawGlobalWpCost = Number(globalWp?.raw?.price_usd ?? globalWp?.raw?.cost_usd ?? 0);
  const globalWpCost = hasGlobalWpCustom
    ? globalWp.raw.custom_cost_usd
    : rawGlobalWpCost > 0
      ? rawGlobalWpCost
      : Number.isFinite(Number(globalWp?.cost_usd)) && Number(globalWp.cost_usd) > 0
        ? Number(globalWp.cost_usd)
        : 1.319;

  rowsToUpsert.push({
    offer_id: "mobile_legends_global:weekly_pass",
    game_id: "mlbb",
    name: "Weekly Diamond Pass",
    category: "weekly_pass",
    cost_usd: globalWpCost,
    regions: ["global"],
    active: true,
    raw: globalWp?.raw ?? null,
    updated_at: nowIso,
  });

  const brazilWp = pkgs.find((p: any) => p.offer_id === "mobile_legends_brazil:weekly_pass");
  const hasBrazilWpCustom = brazilWp?.raw?.cost_edited_by_admin && typeof brazilWp.raw.custom_cost_usd === "number";
  const rawBrazilWpCost = Number(brazilWp?.raw?.price_usd ?? brazilWp?.raw?.cost_usd ?? 0);
  const brazilWpCost = hasBrazilWpCustom
    ? brazilWp.raw.custom_cost_usd
    : rawBrazilWpCost > 0
      ? rawBrazilWpCost
      : Number.isFinite(Number(brazilWp?.cost_usd)) && Number(brazilWp.cost_usd) > 0
        ? Number(brazilWp.cost_usd)
        : 1.21;

  rowsToUpsert.push({
    offer_id: "mobile_legends_brazil:weekly_pass",
    game_id: "mlbb",
    name: "Weekly Diamond Pass",
    category: "weekly_pass",
    cost_usd: brazilWpCost,
    regions: ["br"],
    active: true,
    raw: brazilWp?.raw ?? null,
    updated_at: nowIso,
  });

  // 4. Curate Twilight Passes
  const globalTp = pkgs.find((p: any) => p.offer_id === "mobile_legends_global:twilight_pass");
  if (globalTp) {
    const rawGlobalTpCost = Number(globalTp?.raw?.price_usd ?? globalTp?.raw?.cost_usd ?? 0);
    const globalTpCost = rawGlobalTpCost > 0 ? rawGlobalTpCost : (Number(globalTp.cost_usd) || 7.5);
    rowsToUpsert.push({
      offer_id: "mobile_legends_global:twilight_pass",
      game_id: "mlbb",
      name: "Twilight Pass",
      category: "bundles",
      cost_usd: globalTpCost,
      regions: ["global"],
      active: true,
      raw: globalTp?.raw ?? null,
      updated_at: nowIso,
    });
  }

  const brazilTp = pkgs.find((p: any) => p.offer_id === "mobile_legends_brazil:twilight_pass");
  if (brTpExists(brazilTp)) {
    const rawBrazilTpCost = Number(brazilTp?.raw?.price_usd ?? brazilTp?.raw?.cost_usd ?? 0);
    const brazilTpCost = rawBrazilTpCost > 0 ? rawBrazilTpCost : (Number(brazilTp.cost_usd) || 7.5);
    rowsToUpsert.push({
      offer_id: "mobile_legends_brazil:twilight_pass",
      game_id: "mlbb",
      name: "Twilight Pass",
      category: "bundles",
      cost_usd: brazilTpCost,
      regions: ["br"],
      active: true,
      raw: brazilTp?.raw ?? null,
      updated_at: nowIso,
    });
  }

  // 5. Curate Requested First Top-Up Bonus and Elite Pack packages
  for (const r of MLBB_REQUESTED_PACKAGES) {
    const existing = pkgs.find((p: any) => p.offer_id === r.offerId);
    const hasAdminCustom = existing?.raw?.cost_edited_by_admin && typeof existing.raw.custom_cost_usd === "number";
    const rawFazerCost = Number(existing?.raw?.price_usd ?? existing?.raw?.cost_usd ?? 0);
    const effectiveCost = hasAdminCustom
      ? existing.raw.custom_cost_usd
      : rawFazerCost > 0
        ? rawFazerCost
        : Number.isFinite(Number(existing?.cost_usd)) && Number(existing.cost_usd) > 0
          ? Number(existing.cost_usd)
          : r.fallbackCostUsd;

    rowsToUpsert.push({
      offer_id: r.offerId,
      game_id: "mlbb",
      name: r.name,
      category: r.category,
      regions: [r.region],
      cost_usd: effectiveCost,
      diamonds: r.diamonds ?? 0,
      bonus_diamonds: r.bonusDiamonds ?? 0,
      active: true,
      raw: existing?.raw ?? null,
      updated_at: nowIso,
    });
  }

  // 6. Generate composite packages using the fresh base costs
  const globalCompositeRows = generateCompositePackageRows(pkgs, "global");
  const brazilCompositeRows = generateCompositePackageRows(pkgs, "br");
  const allCompositeRows = [...globalCompositeRows, ...brazilCompositeRows];

  // Perform single fast batch upsert of all curated packages
  const allRows = [...rowsToUpsert, ...allCompositeRows];
  const { error: upsertErr } = await sb.from("fazer_packages").upsert(allRows, { onConflict: "offer_id" });
  if (upsertErr) {
    console.error("Failed to upsert curated MLBB packages:", upsertErr);
  }

  // 7. Identify all active curated MLBB offer IDs and deactivate noisy uncurated duplicates
  const allActiveIds = new Set<string>([
    ...Object.values(MLBB_GLOBAL_BASE_PACKAGES).map((b) => b.baseOfferId),
    ...Object.values(MLBB_BRAZIL_BASE_PACKAGES).map((b) => b.baseOfferId),
    ...globalCompositeRows.map((c) => c.offer_id),
    ...brazilCompositeRows.map((c) => c.offer_id),
    ...MLBB_REQUESTED_PACKAGES.map((r) => r.offerId),
    "mobile_legends_global:weekly_pass",
    "mobile_legends_brazil:weekly_pass",
    "mobile_legends_global:twilight_pass",
    "mobile_legends_brazil:twilight_pass",
  ]);

  // 7. Canonical MLBB server categories
  const MLBB_CANONICAL_CATEGORIES = new Set([
    "mobile_legends_global",
    "mobile_legends_brazil",
    "mobile_legends_turkey",
    "mobile_legends_indonesia",
    "mobile_legends_malaysia",
    "mobile_legends_philippines",
    "mobile_legends_ru",
    "mobile_legends_singapore",
    "mobile_legends_united_states",
  ]);

  const NOISY_ODD_MLBB_TIERS_SET = new Set<string>();

  // Activate regional packages for supported canonical servers (Turkey, Indonesia, Malaysia, Philippines, etc.)
  const MLBB_CAT_TO_REGION: Record<string, string> = {
    mobile_legends_philippines: "ph",
    mobile_legends_malaysia: "my",
    mobile_legends_indonesia: "id",
    mobile_legends_turkey: "tr",
    mobile_legends_ru: "ru",
    mobile_legends_singapore: "sg",
    mobile_legends_united_states: "us",
  };

  const regionalCanonicalOffers = pkgs.filter((p: any) => {
    const cat = (p.raw && typeof p.raw === "object" && typeof p.raw.fazer_category_id === "string")
      ? p.raw.fazer_category_id
      : String(p.offer_id || "").split(":")[0];
    return cat !== "mobile_legends_global" && cat !== "mobile_legends_brazil" && MLBB_CANONICAL_CATEGORIES.has(cat);
  });

  await Promise.all(
    Object.entries(MLBB_CAT_TO_REGION).map(async ([catId, regCode]) => {
      const offersInCat = regionalCanonicalOffers
        .filter((p: any) => {
          const cat = (p.raw && typeof p.raw === "object" && typeof p.raw.fazer_category_id === "string")
            ? p.raw.fazer_category_id
            : String(p.offer_id || "").split(":")[0];
          return cat === catId && p.cost_usd != null && Number(p.cost_usd) > 0;
        })
        .map((p: any) => p.offer_id);

      if (offersInCat.length) {
        await sb
          .from("fazer_packages")
          .update({ active: true, regions: [regCode], updated_at: nowIso })
          .in("offer_id", offersInCat);
      }
    }),
  );

  // Deactivate uncurated, non-canonical, or noisy odd tiers across all servers
  const toDeactivate = pkgs
    .filter((p: any) => {
      const off = String(p.offer_id || "");
      const rawId = (off.includes(":") ? off.split(":")[1] : off) || "";
      if (rawId && NOISY_ODD_MLBB_TIERS_SET.has(rawId.toLowerCase())) return true;

      const cat = (p.raw && typeof p.raw === "object" && typeof p.raw.fazer_category_id === "string")
        ? p.raw.fazer_category_id
        : off.split(":")[0];
      if (cat !== "mobile_legends_global" && cat !== "mobile_legends_brazil" && MLBB_CANONICAL_CATEGORIES.has(cat)) {
        return false; // keep clean regional server packages active!
      }
      return !allActiveIds.has(p.offer_id);
    })
    .map((p: any) => p.offer_id);

  if (toDeactivate.length) {
    await sb
      .from("fazer_packages")
      .update({ active: false, updated_at: nowIso })
      .in("offer_id", toDeactivate);
  }

  return {
    globalBaseCount: Object.keys(MLBB_GLOBAL_BASE_PACKAGES).length,
    brazilBaseCount: Object.keys(MLBB_BRAZIL_BASE_PACKAGES).length,
    compositeCount: allCompositeRows.length,
    deactivatedCount: toDeactivate.length,
  };
}

function brTpExists(tp: any): boolean {
  return Boolean(tp && tp.offer_id);
}
