import { describe, it, expect } from "vitest";
import { filterPackagesForServer, findMatchingPackageForServer } from "../lib/regions";
import type { TopUpPackage } from "../types/store";

describe("Server-Specific Package Filtering & Matching", () => {
  const samplePackages: TopUpPackage[] = [
    {
      id: "ff_100_mena",
      offerId: "free_fire_mena:100_diamonds",
      gameId: "freefire",
      name: "100 Diamonds (MENA)",
      category: "diamonds",
      diamonds: 100,
      costUsd: 0.9,
      retailPriceEgp: 50,
      merchantBasePriceEgp: 47,
      regions: ["mena"],
      active: true,
    },
    {
      id: "ff_100_global",
      offerId: "free_fire_global:100_diamonds",
      gameId: "freefire",
      name: "100 Diamonds (Global)",
      category: "diamonds",
      diamonds: 100,
      costUsd: 1.2,
      retailPriceEgp: 70,
      merchantBasePriceEgp: 63,
      regions: ["global"],
      active: true,
    },
    {
      id: "ff_520_global",
      offerId: "free_fire_global:520_diamonds",
      gameId: "freefire",
      name: "520 Diamonds",
      category: "diamonds",
      diamonds: 520,
      costUsd: 5.0,
      retailPriceEgp: 290,
      merchantBasePriceEgp: 260,
      regions: ["global"],
      active: true,
    },
  ];

  it("prioritizes exact server package and does not duplicate with global package for same tier", () => {
    const forMena = filterPackagesForServer(samplePackages, "mena");
    // Should show 100 diamonds (MENA) and 520 diamonds (Global fallback)
    expect(forMena).toHaveLength(2);

    const p100 = forMena.find((p) => p.diamonds === 100);
    expect(p100?.id).toBe("ff_100_mena");
    expect(p100?.costUsd).toBe(0.9);
    expect(p100?.retailPriceEgp).toBe(50);

    const p520 = forMena.find((p) => p.diamonds === 520);
    expect(p520?.id).toBe("ff_520_global");
  });

  it("shows global package when global server is selected", () => {
    const forGlobal = filterPackagesForServer(samplePackages, "global");
    expect(forGlobal).toHaveLength(2);

    const p100 = forGlobal.find((p) => p.diamonds === 100);
    expect(p100?.id).toBe("ff_100_global");
    expect(p100?.costUsd).toBe(1.2);
    expect(p100?.retailPriceEgp).toBe(70);
  });

  it("findMatchingPackageForServer switches from Global to MENA package", () => {
    const globalPkg = samplePackages.find((p) => p.id === "ff_100_global")!;
    const matched = findMatchingPackageForServer(globalPkg, "mena", samplePackages);
    expect(matched.id).toBe("ff_100_mena");
    expect(matched.costUsd).toBe(0.9);
  });

  it("findMatchingPackageForServer switches from MENA to Global package", () => {
    const menaPkg = samplePackages.find((p) => p.id === "ff_100_mena")!;
    const matched = findMatchingPackageForServer(menaPkg, "global", samplePackages);
    expect(matched.id).toBe("ff_100_global");
    expect(matched.costUsd).toBe(1.2);
  });

  it("retains package if target server has no specific package and global fallback applies", () => {
    const p520 = samplePackages.find((p) => p.id === "ff_520_global")!;
    const matched = findMatchingPackageForServer(p520, "mena", samplePackages);
    expect(matched.id).toBe("ff_520_global");
  });

  it("strictly pins Global Weekly Pass to Global server and isolates regional Weekly Passes", () => {
    const mlbbWeeklyAndRegional: TopUpPackage[] = [
      {
        id: "mobile_legends_global:weekly_pass",
        offerId: "mobile_legends_global:weekly_pass",
        gameId: "mlbb",
        name: "Weekly Diamond Pass",
        category: "weekly_pass",
        costUsd: 1.478,
        regions: ["global"],
        active: true,
      },
      {
        id: "mobile_legends_brazil:weekly_pass",
        offerId: "mobile_legends_brazil:weekly_pass",
        gameId: "mlbb",
        name: "Weekly Diamond Pass",
        category: "weekly_pass",
        costUsd: 1.21,
        regions: ["br"],
        active: true,
      },
      {
        id: "mobile_legends_philippines:weekly_diamond_pass",
        offerId: "mobile_legends_philippines:weekly_diamond_pass",
        gameId: "mlbb",
        name: "Weekly Diamond Pass",
        category: "weekly_pass",
        costUsd: 1.68,
        regions: ["ph"],
        active: true,
      },
      {
        id: "mobile_legends_malaysia:weekly_pass",
        offerId: "mobile_legends_malaysia:weekly_pass",
        gameId: "mlbb",
        name: "Weekly Pass",
        category: "weekly_pass",
        costUsd: 1.97,
        regions: ["my"],
        active: true,
      },
      {
        id: "mobile_legends_malaysia:86_diamonds",
        offerId: "mobile_legends_malaysia:86_diamonds",
        gameId: "mlbb",
        name: "86 Diamonds",
        category: "diamonds",
        diamonds: 86,
        costUsd: 1.15,
        regions: ["my"],
        active: true,
      },
      {
        id: "mobile_legends_philippines:86_diamonds",
        offerId: "mobile_legends_philippines:86_diamonds",
        gameId: "mlbb",
        name: "86 Diamonds",
        category: "diamonds",
        diamonds: 86,
        costUsd: 1.12,
        regions: ["ph"],
        active: true,
      },
      {
        id: "mobile_legends_global:inactive_tier",
        offerId: "mobile_legends_global:inactive_tier",
        gameId: "mlbb",
        name: "Odd Tier",
        category: "diamonds",
        diamonds: 99,
        costUsd: 2.0,
        regions: ["global"],
        active: false,
      },
    ];

    // 1. Global server MUST only show the Global Weekly Pass
    const forGlobal = filterPackagesForServer(mlbbWeeklyAndRegional, "global");
    const globalWeekly = forGlobal.find((p) => p.category === "weekly_pass");
    expect(globalWeekly).toBeDefined();
    expect(globalWeekly?.offerId).toBe("mobile_legends_global:weekly_pass");
    expect(globalWeekly?.costUsd).toBe(1.478);
    // Regional packages must NEVER appear in Global
    expect(forGlobal.some((p) => p.offerId === "mobile_legends_malaysia:86_diamonds")).toBe(false);
    expect(forGlobal.some((p) => p.offerId === "mobile_legends_philippines:86_diamonds")).toBe(false);
    // Inactive packages must NEVER be displayed
    expect(forGlobal.some((p) => p.active === false)).toBe(false);

    // 2. Philippines server MUST only show Philippines Weekly Pass and Packages
    const forPh = filterPackagesForServer(mlbbWeeklyAndRegional, "ph");
    const phWeekly = forPh.find((p) => p.category === "weekly_pass");
    expect(phWeekly).toBeDefined();
    expect(phWeekly?.offerId).toBe("mobile_legends_philippines:weekly_diamond_pass");
    expect(phWeekly?.costUsd).toBe(1.68);
    // Malaysian package must NEVER appear in Philippines!
    expect(forPh.some((p) => p.offerId === "mobile_legends_malaysia:86_diamonds")).toBe(false);
    expect(forPh.some((p) => p.offerId === "mobile_legends_philippines:86_diamonds")).toBe(true);

    // 3. Malaysia server MUST only show Malaysian Weekly Pass and Packages
    const forMy = filterPackagesForServer(mlbbWeeklyAndRegional, "my");
    const myWeekly = forMy.find((p) => p.category === "weekly_pass");
    expect(myWeekly).toBeDefined();
    expect(myWeekly?.offerId).toBe("mobile_legends_malaysia:weekly_pass");
    expect(myWeekly?.costUsd).toBe(1.97);
    // Philippines package must NEVER appear in Malaysia!
    expect(forMy.some((p) => p.offerId === "mobile_legends_philippines:86_diamonds")).toBe(false);
    expect(forMy.some((p) => p.offerId === "mobile_legends_malaysia:86_diamonds")).toBe(true);

    // 4. Brazil server MUST only show Brazil Weekly Pass
    const forBr = filterPackagesForServer(mlbbWeeklyAndRegional, "br");
    const brWeekly = forBr.find((p) => p.category === "weekly_pass");
    expect(brWeekly).toBeDefined();
    expect(brWeekly?.offerId).toBe("mobile_legends_brazil:weekly_pass");
    expect(brWeekly?.costUsd).toBe(1.21);
  });
});
