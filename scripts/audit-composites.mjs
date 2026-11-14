import { createClient } from "@supabase/supabase-js";
import { MLBB_COMPOSITE_DEFINITIONS, MLBB_GLOBAL_BASE_PACKAGES, MLBB_BRAZIL_BASE_PACKAGES } from "../src/server/mlbb-packages.ts";

const url = process.env.M_TOO_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.M_TOO_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.M_TOO_SUPABASE_ANON_KEY;
const sb = createClient(url, key);

async function checkComposites() {
  const { data: pkgs } = await sb.from("fazer_packages").select("*").eq("game_id", "mlbb").eq("active", true);
  console.log("Total active MLBB packages in DB:", pkgs.length);

  const basePkgs = pkgs.filter(p => !p.raw?.is_composite);
  const compositePkgs = pkgs.filter(p => p.raw?.is_composite);
  console.log("Base packages in DB:", basePkgs.length);
  console.log("Composite packages in DB:", compositePkgs.length);

  console.log("\n================== GLOBAL COMPOSITE PACKAGES (15) ==================");
  const globalComposites = compositePkgs.filter(p => p.regions?.includes("global"));
  console.log("Global composite count:", globalComposites.length);

  const globalRows = [];
  for (const def of MLBB_COMPOSITE_DEFINITIONS) {
    const p = globalComposites.find(c => c.diamonds === def.totalDiamonds);
    if (!p) {
      console.error("MISSING GLOBAL COMPOSITE FOR:", def.totalDiamonds);
      continue;
    }
    let expectedCost = 0;
    const formulaParts = [];
    const componentsDetail = [];
    for (const comp of def.components) {
      const baseInfo = MLBB_GLOBAL_BASE_PACKAGES[comp.baseTotal];
      const basePkgInDb = basePkgs.find(b => b.offer_id === baseInfo.baseOfferId);
      const unitCost = Number(basePkgInDb?.cost_usd || baseInfo.fallbackCostUsd);
      expectedCost += unitCost * comp.qty;
      formulaParts.push(`${comp.qty}x (${comp.baseTotal} dia @ $${unitCost})`);
      componentsDetail.push({
        baseTotal: comp.baseTotal,
        qty: comp.qty,
        unitCost,
        offer_id: baseInfo.baseOfferId
      });
    }
    expectedCost = Math.round(expectedCost * 10000) / 10000;
    const dbCost = Number(p.cost_usd);
    const diff = Math.abs(dbCost - expectedCost);
    const ok = diff < 0.005;

    globalRows.push({
      status: ok ? "VERIFIED" : "MISMATCH",
      diamonds: def.totalDiamonds,
      dbCost: `$${dbCost.toFixed(2)}`,
      calcCost: `$${expectedCost.toFixed(2)}`,
      formula: formulaParts.join(" + "),
      category: p.raw?.fazer_category_id,
      componentsCount: p.raw?.components?.length
    });
  }
  console.table(globalRows);

  console.log("\n================== BRAZIL COMPOSITE PACKAGES (15) ==================");
  const brazilComposites = compositePkgs.filter(p => p.regions?.includes("br"));
  console.log("Brazil composite count:", brazilComposites.length);

  const brazilRows = [];
  for (const def of MLBB_COMPOSITE_DEFINITIONS) {
    const p = brazilComposites.find(c => c.diamonds === def.totalDiamonds);
    if (!p) {
      console.error("MISSING BRAZIL COMPOSITE FOR:", def.totalDiamonds);
      continue;
    }
    let expectedCost = 0;
    const formulaParts = [];
    for (const comp of def.components) {
      const baseInfo = MLBB_BRAZIL_BASE_PACKAGES[comp.baseTotal];
      const basePkgInDb = basePkgs.find(b => b.offer_id === baseInfo.baseOfferId);
      const unitCost = Number(basePkgInDb?.cost_usd || baseInfo.fallbackCostUsd);
      expectedCost += unitCost * comp.qty;
      formulaParts.push(`${comp.qty}x (${comp.baseTotal} dia @ $${unitCost})`);
    }
    expectedCost = Math.round(expectedCost * 10000) / 10000;
    const dbCost = Number(p.cost_usd);
    const diff = Math.abs(dbCost - expectedCost);
    const ok = diff < 0.005;

    brazilRows.push({
      status: ok ? "VERIFIED" : "MISMATCH",
      diamonds: def.totalDiamonds,
      dbCost: `$${dbCost.toFixed(2)}`,
      calcCost: `$${expectedCost.toFixed(2)}`,
      formula: formulaParts.join(" + "),
      category: p.raw?.fazer_category_id,
      componentsCount: p.raw?.components?.length
    });
  }
  console.table(brazilRows);

  console.log("\n=== COMPOSITE EXECUTION & DISPATCH TEST ===");
  // Let's test the fulfillment breakdown in store.service
  console.log("Sample 344 Diamonds Global components for Fazer dispatch:");
  const sample344Global = globalComposites.find(c => c.diamonds === 344);
  console.log(JSON.stringify(sample344Global?.raw?.components, null, 2));

  console.log("Sample 344 Diamonds Brazil components for Fazer dispatch:");
  const sample344Brazil = brazilComposites.find(c => c.diamonds === 344);
  console.log(JSON.stringify(sample344Brazil?.raw?.components, null, 2));
}

checkComposites();
