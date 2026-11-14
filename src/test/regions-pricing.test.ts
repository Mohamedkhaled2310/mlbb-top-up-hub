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
});
