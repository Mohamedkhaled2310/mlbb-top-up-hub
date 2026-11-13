import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Composite Order Fulfillment Logic", () => {
  it("decomposes 429 diamonds into 1x172 and 1x257 with accurate price shares", () => {
    const compositeDef = {
      offerId: "mlbb_composite_429",
      totalDiamonds: 429,
      unitPriceEgp: 275.5,
      components: [
        { offer_id: "mobile_legends_brazil:156_16_diamonds", diamonds: 172, qty: 1, cost_usd: 1.96 },
        { offer_id: "mobile_legends_brazil:234_23_diamonds", diamonds: 257, qty: 1, cost_usd: 2.92 },
      ],
    };

    const totalCompCost = compositeDef.components.reduce(
      (s, c) => s + c.cost_usd * c.qty,
      0,
    );
    expect(totalCompCost).toBeCloseTo(4.88, 2);

    let remainingUnitEgp = compositeDef.unitPriceEgp;
    const shares: number[] = [];

    for (let cIdx = 0; cIdx < compositeDef.components.length; cIdx++) {
      const comp = compositeDef.components[cIdx]!;
      const isLastComp = cIdx === compositeDef.components.length - 1;
      const compShareEgp = isLastComp
        ? Math.round(remainingUnitEgp * 100) / 100
        : Math.min(
            remainingUnitEgp,
            Math.round(((comp.cost_usd || 1) / totalCompCost) * compositeDef.unitPriceEgp * 100) / 100,
          );
      remainingUnitEgp = Math.max(0, remainingUnitEgp - compShareEgp);
      shares.push(compShareEgp);
    }

    expect(shares).toHaveLength(2);
    // 1.96 / 4.88 = ~40.16% => ~110.65 EGP
    expect(shares[0]!).toBeCloseTo(110.65, 1);
    // Total must exactly sum to unitPriceEgp (275.50)
    expect(shares[0]! + shares[1]!).toBe(275.5);
  });

  it("handles 3 components (600 Diamonds: 1x86 + 2x257) with exact penny reconciliation", () => {
    const unitPriceEgp = 385.25;
    const components = [
      { offer_id: "mobile_legends_brazil:78_8_diamonds", diamonds: 86, qty: 1, cost_usd: 0.98 },
      { offer_id: "mobile_legends_brazil:234_23_diamonds", diamonds: 257, qty: 2, cost_usd: 2.92 },
    ];

    const flattenedComps: Array<{ diamonds: number; costUsd: number }> = [];
    for (const comp of components) {
      for (let cq = 0; cq < comp.qty; cq++) {
        flattenedComps.push({ diamonds: comp.diamonds, costUsd: comp.cost_usd });
      }
    }
    expect(flattenedComps).toHaveLength(3);

    const totalCompCost = flattenedComps.reduce((s, c) => s + c.costUsd, 0);
    expect(totalCompCost).toBeCloseTo(6.82, 2);

    let remainingUnitEgp = unitPriceEgp;
    const shares: number[] = [];

    for (let cIdx = 0; cIdx < flattenedComps.length; cIdx++) {
      const comp = flattenedComps[cIdx]!;
      const isLastComp = cIdx === flattenedComps.length - 1;
      const compShareEgp = isLastComp
        ? Math.round(remainingUnitEgp * 100) / 100
        : Math.min(
            remainingUnitEgp,
            Math.round(((comp.costUsd || 1) / totalCompCost) * unitPriceEgp * 100) / 100,
          );
      remainingUnitEgp = Math.max(0, remainingUnitEgp - compShareEgp);
      shares.push(compShareEgp);
    }

    const totalCalculated = shares.reduce((s, a) => s + a, 0);
    expect(Math.round(totalCalculated * 100) / 100).toBe(unitPriceEgp);
  });
});
