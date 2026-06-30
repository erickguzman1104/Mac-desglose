import assert from "node:assert/strict";
import test from "node:test";
import { createQuoteItem } from "../src/application/quoteFactory";
import { optimizeCuts } from "../src/domain/calculations/cutOptimizer";
import { compareGlassSheetSizes } from "../src/domain/calculations/glassOptimizer";
import { DEFAULT_SETTINGS } from "../src/domain/defaults";

test("crea un ítem con desglose y precio positivo", () => {
  const item = createQuoteItem(
    {
      systemId: "P-65",
      leaves: 2,
      widthMm: 1200,
      heightMm: 1000,
      quantity: 2,
      accessories: {
        rubberMeters: 0,
        wheels: 4,
        lockType: "monopunto",
        locks: 2,
        guideKits: 2,
        weatherstripMeters: 0,
        installationScrews: 8,
        fabricationScrews: 8,
        wallPlugs: 8,
      },
    },
    DEFAULT_SETTINGS.prices,
  );

  assert.equal(item.breakdown.glass[0].pieces, 4);
  assert.equal(item.breakdown.glass[0].areaM2, 2.4);
  assert.ok(item.pricing.directCost > 0);
  assert.ok(item.pricing.total > item.pricing.directCost);
  assert.match(item.breakdown.warning ?? "", /demostrativo/i);
});

test("optimiza cortes sin exceder el largo de barra", () => {
  const bars = optimizeCuts(
    [
      {
        id: "a",
        materialCode: "P-65-A",
        materialName: "Perfil A",
        lengthMm: 2000,
        pieces: 3,
        purpose: "Marco",
      },
    ],
    6000,
  );

  assert.equal(bars.length, 1);
  assert.equal(bars[0].remainderMm, 0);
});

test("rechaza un corte mayor que la barra", () => {
  assert.throws(
    () =>
      optimizeCuts(
        [
          {
            id: "a",
            materialCode: "P-65-A",
            materialName: "Perfil A",
            lengthMm: 6100,
            pieces: 1,
            purpose: "Marco",
          },
        ],
        6000,
      ),
    /mayor/i,
  );
});

test("compara los dos tamaños y posiciona todos los cristales", () => {
  const result = compareGlassSheetSizes([
    { widthMm: 600, heightMm: 1000, pieces: 4, areaM2: 2.4 },
  ]);
  assert.equal(result.options.length, 2);
  for (const option of result.options) {
    assert.equal(
      option.sheets.reduce((sum, sheet) => sum + sheet.cuts.length, 0),
      4,
    );
    assert.ok(option.wastePercent >= 0);
  }
});
