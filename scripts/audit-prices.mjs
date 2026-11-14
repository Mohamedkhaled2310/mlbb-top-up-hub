import { createClient } from "@supabase/supabase-js";

const baseUrl = (process.env.FAZER_API_BASE_URL || "https://api.fzr.cards/api/v2").replace(/\/+$/, "");
const apiKey = (process.env.FAZER_API_KEY || "").trim();

const url = process.env.M_TOO_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.M_TOO_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.M_TOO_SUPABASE_ANON_KEY;
const sb = createClient(url, key);

async function run() {
  console.log("Connecting to Fazer API and Supabase...");
  const { data: dbPkgs, error } = await sb.from("fazer_packages").select("*").eq("active", true);
  if (error) {
    console.error("Supabase error:", error);
    return;
  }
  console.log("Active packages in DB:", dbPkgs.length);

  const gameCategories = {
    mlbb: ["mobile_legends_global", "mobile_legends_brazil"],
    pubg: ["pubg_mobile_auto"],
    freefire: ["free_fire_mena"],
    hok: ["honor_of_kings"]
  };

  const fazerOffers = new Map();

  for (const [game, cats] of Object.entries(gameCategories)) {
    for (const cat of cats) {
      try {
        const res = await fetch(baseUrl + "/topups/offers?category_id=" + cat, {
          headers: { "X-API-Key": apiKey, "Content-Type": "application/json" }
        });
        const data = await res.json();
        const items = data.offers || data.items || data.data || data;
        if (Array.isArray(items)) {
          console.log(`Fazer ${cat}: ${items.length} offers`);
          for (const item of items) {
            const rawId = String(item.offer_id || item.id).trim();
            const cost = Number(item.cost_usd || item.price_usd || item.cost || item.price || 0);
            const compositeKey = `${cat}:${rawId}`;
            fazerOffers.set(compositeKey, { cost, name: item.name || item.title, cat, rawId });
            fazerOffers.set(rawId, { cost, name: item.name || item.title, cat, rawId });
          }
        } else {
          console.log(`Fazer ${cat}: failed or not array`, data);
        }
      } catch (err) {
        console.error(`Error fetching Fazer ${cat}:`, err.message);
      }
    }
  }

  console.log(`Total indexed Fazer offers: ${fazerOffers.size}`);

  console.log("\n=== COMPARING DB PACKAGES WITH FAZER LIVE CATALOG ===");
  let matched = 0;
  let mismatched = 0;
  let compositeCount = 0;
  const mismatches = [];
  const notFoundInFazer = [];

  for (const pkg of dbPkgs) {
    if (pkg.raw?.is_composite) {
      compositeCount++;
      const comps = pkg.raw?.components || [];
      let expectedCompositeCost = 0;
      let compMissing = false;
      for (const c of comps) {
        const fComp = fazerOffers.get(c.offer_id) || fazerOffers.get(`${c.fazer_category_id}:${c.fazer_offer_id}`);
        if (fComp) {
          expectedCompositeCost += fComp.cost * c.qty;
        } else {
          compMissing = true;
        }
      }
      expectedCompositeCost = Math.round(expectedCompositeCost * 10000) / 10000;
      const compDiff = Math.abs(Number(pkg.cost_usd || 0) - expectedCompositeCost);
      if (compDiff > 0.005) {
        mismatched++;
        mismatches.push({
          game: pkg.game_id,
          offer_id: pkg.offer_id,
          name: pkg.name,
          regions: pkg.regions?.join(","),
          dbCost: pkg.cost_usd,
          fazerCost: expectedCompositeCost,
          diff: compDiff,
          type: "COMPOSITE_SUM_MISMATCH"
        });
      } else {
        matched++;
      }
      continue;
    }

    const directMatch = fazerOffers.get(pkg.offer_id) || (pkg.raw?.fazer_offer_id ? fazerOffers.get(pkg.raw.fazer_offer_id) : null);
    if (directMatch) {
      const diff = Math.abs(Number(pkg.cost_usd || 0) - directMatch.cost);
      if (diff > 0.005) {
        mismatched++;
        mismatches.push({
          game: pkg.game_id,
          offer_id: pkg.offer_id,
          name: pkg.name,
          regions: pkg.regions?.join(","),
          dbCost: pkg.cost_usd,
          fazerCost: directMatch.cost,
          diff,
          type: "DIRECT_COST_MISMATCH"
        });
      } else {
        matched++;
      }
    } else {
      notFoundInFazer.push({
        game: pkg.game_id,
        offer_id: pkg.offer_id,
        name: pkg.name,
        cost: pkg.cost_usd,
        regions: pkg.regions?.join(",")
      });
    }
  }

  console.log(`\nResults: ${matched} exact matches, ${mismatched} mismatches, ${notFoundInFazer.length} not found in Fazer`);
  if (mismatches.length > 0) {
    console.log("\nMISMATCHES FOUND:");
    console.table(mismatches);
  } else {
    console.log("\n>>> SUCCESS: ALL ACTIVE DB PACKAGES EXACTLY MATCH FAZER LIVE PRICES! <<<");
  }

  if (notFoundInFazer.length > 0) {
    console.log("\nActive packages not found in standard Fazer categories:");
    console.table(notFoundInFazer);
  }

  console.log("\n=== FULL BREAKDOWN BY GAME ===");
  for (const game of ["mlbb", "pubg", "freefire", "hok"]) {
    const list = dbPkgs.filter(p => p.game_id === game);
    console.log(`\nGame: ${game.toUpperCase()} (${list.length} packages):`);
    list.sort((a, b) => Number(a.diamonds || 0) - Number(b.diamonds || 0)).forEach(p => {
      console.log(`  [${p.regions?.[0] || 'all'}] ${p.name.padEnd(25)} | $${p.cost_usd} | ${p.offer_id}`);
    });
  }
}

run();
