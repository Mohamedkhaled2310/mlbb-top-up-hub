import { describe, it, expect } from "vitest";
import {
  MLBB_BASE_TARGETS,
  MLBB_BASE_PACKAGES,
  MLBB_COMPOSITE_DEFINITIONS,
  generateCompositePackageRows,
  findBasePackageForTarget,
} from "../server/mlbb-packages";

describe("MLBB Base & Composite Packages", () => {
  it("defines the 8 exact requested base diamond counts", () => {
    expect(MLBB_BASE_TARGETS).toEqual([86, 172, 257, 706, 2195, 3688, 5532, 9288]);
    expect(Object.keys(MLBB_BASE_PACKAGES).map(Number).sort((a, b) => a - b)).toEqual([
      86, 172, 257, 706, 2195, 3688, 5532, 9288,
    ]);
  });

  it("defines the 15 exact requested composite package diamond values", () => {
    const expectedTotals = [
      344, 429, 514, 600, 878, 963, 1050, 1220, 1412, 1669, 2539, 2901, 4394, 6238, 7727,
    ];
    const actualTotals = MLBB_COMPOSITE_DEFINITIONS.map((c) => c.totalDiamonds);
    expect(actualTotals).toEqual(expectedTotals);
  });

  it("verifies every composite package decomposes into exact integer sums of base packages", () => {
    for (const compDef of MLBB_COMPOSITE_DEFINITIONS) {
      let sum = 0;
      for (const comp of compDef.components) {
        expect(MLBB_BASE_TARGETS).toContain(comp.baseTotal);
        expect(comp.qty).toBeGreaterThanOrEqual(1);
        sum += comp.baseTotal * comp.qty;
      }
      expect(sum).toBe(compDef.totalDiamonds);
    }
  });

  it("dynamically computes composite package costs and components from base packages", () => {
    const mockBasePkgs = [
      {
        offer_id: "mobile_legends_brazil:78_8_diamonds",
        game_id: "mlbb",
        cost_usd: 0.98,
        diamonds: 78,
        bonus_diamonds: 8,
        regions: ["br"],
        raw: { fazer_offer_id: "78_8_diamonds", fazer_category_id: "mobile_legends_brazil" },
      },
      {
        offer_id: "mobile_legends_brazil:156_16_diamonds",
        game_id: "mlbb",
        cost_usd: 1.96,
        diamonds: 156,
        bonus_diamonds: 16,
        regions: ["br"],
        raw: { fazer_offer_id: "156_16_diamonds", fazer_category_id: "mobile_legends_brazil" },
      },
      {
        offer_id: "mobile_legends_brazil:234_23_diamonds",
        game_id: "mlbb",
        cost_usd: 2.92,
        diamonds: 234,
        bonus_diamonds: 23,
        regions: ["br"],
        raw: { fazer_offer_id: "234_23_diamonds", fazer_category_id: "mobile_legends_brazil" },
      },
      {
        offer_id: "mobile_legends_brazil:625_81_diamonds",
        game_id: "mlbb",
        cost_usd: 7.82,
        diamonds: 625,
        bonus_diamonds: 81,
        regions: ["br"],
        raw: { fazer_offer_id: "625_81_diamonds", fazer_category_id: "mobile_legends_brazil" },
      },
    ];

    const rows = generateCompositePackageRows(mockBasePkgs);
    expect(rows).toHaveLength(15);

    // Test 344 Diamonds: 2 x 172 ($1.96 * 2 = $3.92)
    const pkg344 = rows.find((r) => r.offer_id === "mlbb_composite_344");
    expect(pkg344).toBeDefined();
    expect(pkg344.diamonds).toBe(344);
    expect(pkg344.cost_usd).toBe(3.92);
    expect(pkg344.raw.is_composite).toBe(true);
    expect(pkg344.raw.components).toHaveLength(1);
    expect(pkg344.raw.components[0].fazer_offer_id).toBe("156_16_diamonds");
    expect(pkg344.raw.components[0].qty).toBe(2);

    // Test 429 Diamonds: 1 x 172 + 1 x 257 ($1.96 + $2.92 = $4.88)
    const pkg429 = rows.find((r) => r.offer_id === "mlbb_composite_429");
    expect(pkg429).toBeDefined();
    expect(pkg429.diamonds).toBe(429);
    expect(pkg429.cost_usd).toBe(4.88);
    expect(pkg429.raw.components).toHaveLength(2);
    expect(pkg429.raw.components[0].diamonds).toBe(172);
    expect(pkg429.raw.components[1].diamonds).toBe(257);

    // Test 600 Diamonds: 1 x 86 + 2 x 257 ($0.98 + 2 * $2.92 = $6.82)
    const pkg600 = rows.find((r) => r.offer_id === "mlbb_composite_600");
    expect(pkg600).toBeDefined();
    expect(pkg600.diamonds).toBe(600);
    expect(pkg600.cost_usd).toBe(6.82);

    // Test 1412 Diamonds: 2 x 706 ($7.82 * 2 = $15.64)
    const pkg1412 = rows.find((r) => r.offer_id === "mlbb_composite_1412");
    expect(pkg1412).toBeDefined();
    expect(pkg1412.diamonds).toBe(1412);
    expect(pkg1412.cost_usd).toBe(15.64);
  });

  it("findBasePackageForTarget correctly locates preferred base offers", () => {
    const pkgs = [
      { offer_id: "mobile_legends_global:86_diamonds", diamonds: 86, bonus_diamonds: 0, cost_usd: 1.2 },
      { offer_id: "mobile_legends_brazil:78_8_diamonds", diamonds: 78, bonus_diamonds: 8, cost_usd: 0.98 },
    ];
    const found = findBasePackageForTarget(pkgs, 86);
    expect(found.offer_id).toBe("mobile_legends_brazil:78_8_diamonds");
    expect(found.cost_usd).toBe(0.98);
  });

  it("curateMlbbPackages sets global weekly pass to 1.33 USD and deactivates brazil 1.22 pass", async () => {
    const { curateMlbbPackages } = await import("../server/mlbb-packages");
    const mockPackages = [
      { offer_id: "mobile_legends_brazil:78_8_diamonds", game_id: "mlbb", diamonds: 78, bonus_diamonds: 8, cost_usd: 0.98 },
      { offer_id: "mobile_legends_brazil:weekly_pass", game_id: "mlbb", category: "weekly_pass", cost_usd: 1.22 },
      { offer_id: "mobile_legends_global:weekly_pass", game_id: "mlbb", category: "weekly_pass", cost_usd: 1.335 },
    ];

    const updates: any[] = [];
    const deactivations: any[] = [];

    const mockSb = {
      from: (table: string) => ({
        select: () => ({
          eq: () => Promise.resolve({ data: mockPackages }),
        }),
        upsert: () => Promise.resolve({ error: null }),
        update: (fields: any) => ({
          eq: (col: string, val: any) => {
            updates.push({ col, val, fields });
            return Promise.resolve({ error: null });
          },
          in: (col: string, vals: any[]) => {
            deactivations.push({ col, vals, fields });
            return Promise.resolve({ error: null });
          },
        }),
      }),
    };

    const res = await curateMlbbPackages(mockSb);
    expect(res.activeWeeklyPassId).toBe("mobile_legends_global:weekly_pass");

    const weeklyUpdate = updates.find((u) => u.val === "mobile_legends_global:weekly_pass");
    expect(weeklyUpdate).toBeDefined();
    expect(weeklyUpdate.fields.cost_usd).toBe(1.33);
    expect(weeklyUpdate.fields.active).toBe(true);

    const brazilPassDeactivated = updates.find((u) => u.val === "mobile_legends_brazil:weekly_pass" && u.fields.active === false);
    expect(brazilPassDeactivated).toBeDefined();
  });
});
