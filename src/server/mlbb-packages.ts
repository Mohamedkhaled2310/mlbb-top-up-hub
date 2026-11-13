/**
 * Curated MLBB (Mobile Legends: Bang Bang) Base and Composite Packages.
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
 *  - 344 Diamonds: 2 x 172
 *  - 429 Diamonds: 1 x 172 + 1 x 257
 *  - 514 Diamonds: 2 x 257
 *  - 600 Diamonds: 1 x 86 + 2 x 257
 *  - 878 Diamonds: 1 x 706 + 1 x 172
 *  - 963 Diamonds: 1 x 706 + 1 x 257
 *  - 1050 Diamonds: 1 x 706 + 2 x 172
 *  - 1220 Diamonds: 1 x 706 + 2 x 257
 *  - 1412 Diamonds: 2 x 706
 *  - 1669 Diamonds: 2 x 706 + 1 x 257
 *  - 2539 Diamonds: 1 x 2195 + 2 x 172
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

export const MLBB_BASE_PACKAGES: Record<number, MlbbBasePkgInfo> = {
  86: {
    totalDiamonds: 86,
    baseOfferId: "mobile_legends_brazil:78_8_diamonds",
    rawOfferId: "78_8_diamonds",
    name: "86 Diamonds",
    fallbackCostUsd: 0.98,
  },
  172: {
    totalDiamonds: 172,
    baseOfferId: "mobile_legends_brazil:156_16_diamonds",
    rawOfferId: "156_16_diamonds",
    name: "172 Diamonds",
    fallbackCostUsd: 1.96,
  },
  257: {
    totalDiamonds: 257,
    baseOfferId: "mobile_legends_brazil:234_23_diamonds",
    rawOfferId: "234_23_diamonds",
    name: "257 Diamonds",
    fallbackCostUsd: 2.92,
  },
  706: {
    totalDiamonds: 706,
    baseOfferId: "mobile_legends_brazil:625_81_diamonds",
    rawOfferId: "625_81_diamonds",
    name: "706 Diamonds",
    fallbackCostUsd: 7.82,
  },
  2195: {
    totalDiamonds: 2195,
    baseOfferId: "mobile_legends_brazil:1860_335_diamonds",
    rawOfferId: "1860_335_diamonds",
    name: "2195 Diamonds",
    fallbackCostUsd: 23.47,
  },
  3688: {
    totalDiamonds: 3688,
    baseOfferId: "mobile_legends_brazil:3099_589_diamonds",
    rawOfferId: "3099_589_diamonds",
    name: "3688 Diamonds",
    fallbackCostUsd: 39.12,
  },
  5532: {
    totalDiamonds: 5532,
    baseOfferId: "mobile_legends_brazil:4649_883_diamonds",
    rawOfferId: "4649_883_diamonds",
    name: "5532 Diamonds",
    fallbackCostUsd: 58.68,
  },
  9288: {
    totalDiamonds: 9288,
    baseOfferId: "mobile_legends_brazil:7740_1548_diamonds",
    rawOfferId: "7740_1548_diamonds",
    name: "9288 Diamonds",
    fallbackCostUsd: 97.8,
  },
};

export const MLBB_BASE_TARGETS = [86, 172, 257, 706, 2195, 3688, 5532, 9288] as const;

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
 * Finds the base package for a given target diamond count.
 * Prefers brazil offer if available (best wholesale rate), otherwise global.
 */
export function findBasePackageForTarget(allPkgs: any[], targetTotal: number) {
  const baseInfo = MLBB_BASE_PACKAGES[targetTotal];
  if (baseInfo) {
    const found = allPkgs.find((p) => p.offer_id === baseInfo.baseOfferId);
    if (found) return found;
  }
  return allPkgs.find(
    (p) =>
      p.game_id === "mlbb" &&
      Number(p.diamonds || 0) + Number(p.bonus_diamonds || 0) === targetTotal &&
      !p.raw?.is_composite,
  );
}

/**
 * Generates the 15 composite package rows dynamically calculated from base package costs.
 */
export function generateCompositePackageRows(allPkgs: any[]) {
  const nowIso = new Date().toISOString();
  const rows: any[] = [];

  for (const def of MLBB_COMPOSITE_DEFINITIONS) {
    let totalCostUsd = 0;
    const resolvedComponents: any[] = [];

    for (const comp of def.components) {
      const baseInfo = MLBB_BASE_PACKAGES[comp.baseTotal];
      const basePkg = findBasePackageForTarget(allPkgs, comp.baseTotal);
      const unitCost = Number(basePkg?.cost_usd || baseInfo?.fallbackCostUsd || 1);
      const offerId = basePkg?.offer_id || baseInfo?.baseOfferId || `mlbb_base_${comp.baseTotal}`;
      const rawOfferId =
        basePkg?.raw?.fazer_offer_id || baseInfo?.rawOfferId || (offerId.includes(":") ? offerId.split(":").pop()! : offerId);
      const catId = basePkg?.raw?.fazer_category_id || "mobile_legends_brazil";

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

    rows.push({
      offer_id: def.offerId,
      game_id: "mlbb",
      category: "diamonds",
      name: def.name,
      diamonds: def.totalDiamonds,
      bonus_diamonds: 0,
      currency_name: "Diamonds",
      cost_usd: totalCostUsd,
      regions: ["global", "br"],
      active: true,
      raw: {
        is_composite: true,
        total_diamonds: def.totalDiamonds,
        fazer_category_id: "mobile_legends_brazil",
        components: resolvedComponents,
      },
      updated_at: nowIso,
    });
  }

  return rows;
}

/**
 * Curates MLBB packages in Supabase:
 *  - Activates the 8 base packages (+ weekly pass) with clean names & regions: ["global", "br"]
 *  - Upserts & activates the 15 composite packages with regions: ["global", "br"]
 *  - Deactivates all other noisy MLBB packages
 */
export async function curateMlbbPackages(sb: any) {
  const { data: allPkgs } = await sb.from("fazer_packages").select("*").eq("game_id", "mlbb");
  const pkgs = allPkgs || [];
  const nowIso = new Date().toISOString();

  // 1. Generate and upsert the 15 composite packages
  const compositeRows = generateCompositePackageRows(pkgs);
  const { error: upsertErr } = await sb.from("fazer_packages").upsert(compositeRows, { onConflict: "offer_id" });
  if (upsertErr) {
    console.error("Failed to upsert composite MLBB packages:", upsertErr);
  }

  // 2. Identify active MLBB offer IDs
  const activeBaseOfferIds = new Set(Object.values(MLBB_BASE_PACKAGES).map((b) => b.baseOfferId));
  const activeCompositeOfferIds = new Set(MLBB_COMPOSITE_DEFINITIONS.map((c) => c.offerId));

  // Find weekly pass: prioritize global weekly pass (1.33 USD) over brazil (1.22 USD)
  const weeklyPassRow =
    pkgs.find((p: any) => p.offer_id === "mobile_legends_global:weekly_pass") ||
    pkgs.find((p: any) => p.category === "weekly_pass" && p.offer_id.includes("global")) ||
    pkgs.find((p: any) => p.category === "weekly_pass");
  const activeWeeklyPassId = weeklyPassRow?.offer_id || "mobile_legends_global:weekly_pass";

  const allActiveOfferIds = new Set([
    ...Array.from(activeBaseOfferIds),
    ...Array.from(activeCompositeOfferIds),
    activeWeeklyPassId,
  ]);

  // 3. Update base packages with clean names & regions: ["global", "br"]
  for (const b of Object.values(MLBB_BASE_PACKAGES)) {
    await sb
      .from("fazer_packages")
      .update({
        name: b.name,
        regions: ["global", "br"],
        active: true,
        updated_at: nowIso,
      })
      .eq("offer_id", b.baseOfferId);
  }

  // 4. Update weekly pass: ensure cost is 1.33 USD and active for global
  const rawWeeklyCost = Number(weeklyPassRow?.cost_usd || 1.33);
  const effectiveWeeklyCost =
    weeklyPassRow?.raw?.cost_edited_by_admin && typeof weeklyPassRow.raw.custom_cost_usd === "number"
      ? weeklyPassRow.raw.custom_cost_usd
      : rawWeeklyCost === 1.22 || rawWeeklyCost === 1.335
        ? 1.33
        : rawWeeklyCost || 1.33;

  await sb
    .from("fazer_packages")
    .update({
      name: "Weekly Diamond Pass",
      category: "weekly_pass",
      cost_usd: effectiveWeeklyCost,
      regions: ["global", "all"],
      active: true,
      updated_at: nowIso,
    })
    .eq("offer_id", activeWeeklyPassId);

  // If mobile_legends_brazil:weekly_pass was previously active, deactivate it
  if (activeWeeklyPassId !== "mobile_legends_brazil:weekly_pass") {
    await sb
      .from("fazer_packages")
      .update({ active: false, updated_at: nowIso })
      .eq("offer_id", "mobile_legends_brazil:weekly_pass");
  }

  // 5. Deactivate all other MLBB packages
  const toDeactivate = pkgs
    .map((p: any) => p.offer_id)
    .filter((id: string) => id && !allActiveOfferIds.has(id));

  if (toDeactivate.length) {
    await sb
      .from("fazer_packages")
      .update({ active: false, updated_at: nowIso })
      .in("offer_id", toDeactivate);
  }

  return {
    baseCount: activeBaseOfferIds.size,
    compositeCount: activeCompositeOfferIds.size,
    deactivatedCount: toDeactivate.length,
    activeWeeklyPassId,
  };
}
