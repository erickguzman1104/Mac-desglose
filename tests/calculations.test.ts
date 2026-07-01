import assert from "node:assert/strict";
import test from "node:test";
import { createQuoteItem } from "../src/application/quoteFactory";
import { optimizeCuts } from "../src/domain/calculations/cutOptimizer";
import { compareGlassSheetSizes } from "../src/domain/calculations/glassOptimizer";
import { DEFAULT_SETTINGS } from "../src/domain/defaults";
import {
  calculateSquareFootPrice,
  toInches,
} from "../src/domain/calculations/measurement";
import { calculateAutomaticAccessories } from "../src/domain/calculations/accessories";
import { SYSTEM_IDS } from "../src/domain/models";
import { mergeStoredSettings } from "../src/infrastructure/storage/settings";
import {
  SYSTEM_CATALOG,
  availableLockTypes,
  supportsRails,
} from "../src/domain/systemCatalog";

test("crea un ítem con desglose y precio positivo", () => {
  const rules = {
    ...DEFAULT_SETTINGS.prices.accessoryRules,
    "P-65": {
      ...DEFAULT_SETTINGS.prices.accessoryRules["P-65"],
      wheels: { perWindow: 0, perLeaf: 2 },
      guideKits: { perWindow: 1, perLeaf: 0 },
      locksByType: {
        ...DEFAULT_SETTINGS.prices.accessoryRules["P-65"].locksByType,
        mono: { perWindow: 1, perLeaf: 0 },
      },
    },
  };
  const item = createQuoteItem(
    {
      systemId: "P-65",
      leaves: 2,
      railPosition: "exterior",
      width: 120,
      height: 100,
      unit: "cm",
      widthInches: toInches(120, "cm"),
      heightInches: toInches(100, "cm"),
      widthMm: 1200,
      heightMm: 1000,
      quantity: 2,
      pricePerSquareFoot: 100,
      accessories: {
        rubberMeters: 0,
        wheels: 0,
        lockType: "mono",
        locks: 0,
        guideKits: 0,
        weatherstripMeters: 0,
        screws: 0,
      },
    },
    { ...DEFAULT_SETTINGS.prices, accessoryRules: rules },
  );

  assert.equal(item.breakdown.glass[0].pieces, 4);
  assert.equal(item.breakdown.glass[0].areaM2, 2.4);
  assert.equal(item.opening.accessories.wheels, 8);
  assert.equal(item.opening.accessories.guideKits, 2);
  assert.equal(item.opening.railPosition, "exterior");
  assert.ok((item.squareFoot?.total ?? 0) > 0);
  assert.ok(item.pricing.directCost > 0);
  assert.ok(item.pricing.total > item.pricing.directCost);
  assert.match(item.breakdown.warning ?? "", /demostrativo/i);
});

test("convierte las unidades admitidas a pulgadas", () => {
  assert.equal(DEFAULT_SETTINGS.unit, "in");
  assert.equal(toInches(12, "in"), 12);
  assert.equal(toInches(2.54, "cm"), 1);
});

test("migra unidades antiguas a pulgadas", () => {
  const settings = mergeStoredSettings({ unit: "mm" as never });
  assert.equal(settings.unit, "in");
});

test("calcula área y total por pie cuadrado", () => {
  assert.deepEqual(calculateSquareFootPrice(48, 36, 2, 100), {
    individualArea: 12,
    totalArea: 24,
    pricePerSquareFoot: 100,
    total: 2400,
  });
});

test("calcula accesorios por ventanas, hojas y cerradura", () => {
  const rules = {
    ...DEFAULT_SETTINGS.prices.accessoryRules["P-65"],
    screws: { perWindow: 4, perLeaf: 2 },
    locksByType: {
      ...DEFAULT_SETTINGS.prices.accessoryRules["P-65"].locksByType,
      puño: { perWindow: 1, perLeaf: 0 },
    },
  };
  const result = calculateAutomaticAccessories(rules, 3, 2, "puño");
  assert.equal(result.screws, 20);
  assert.equal(result.locks, 2);
  assert.equal(result.lockType, "puño");
});

test("solo Tradicional, P-65 y P-92 manejan posición de riel", () => {
  assert.equal(supportsRails("Tradicional"), true);
  assert.equal(supportsRails("P-65"), true);
  assert.equal(supportsRails("P-92"), true);
  assert.equal(supportsRails("C-70"), false);
  assert.equal(supportsRails("AA"), false);
});

test("restringe cerraduras Tradicional y Monopunto por sistema", () => {
  assert.deepEqual(availableLockTypes("P-65"), ["mono", "puño"]);
  assert.deepEqual(availableLockTypes("Tradicional"), [
    "mono",
    "puño",
    "tradicional",
  ]);
  assert.deepEqual(availableLockTypes("P-92"), [
    "mono",
    "puño",
    "monopunto",
  ]);
  assert.ok(DEFAULT_SETTINGS.prices.accessoryRules["P-92"].locksByType.monopunto);
});

test("elimina Protectores Aluestrong del dominio y del catálogo", () => {
  assert.equal(SYSTEM_IDS.includes("Protectores Aluestrong" as never), false);
  assert.equal(
    SYSTEM_CATALOG.some(({ id }) => id === ("Protectores Aluestrong" as never)),
    false,
  );
});

test("Ventanas AA usa cuerpos, sin hojas ni riel", () => {
  const item = createQuoteItem(
    {
      systemId: "AA",
      bodyCount: 3,
      railPosition: "exterior",
      width: 72,
      height: 48,
      unit: "in",
      widthInches: 72,
      heightInches: 48,
      widthMm: 1828.8,
      heightMm: 1219.2,
      quantity: 1,
      pricePerSquareFoot: 100,
      accessories: {
        rubberMeters: 0,
        wheels: 0,
        lockType: "tradicional",
        locks: 0,
        guideKits: 0,
        weatherstripMeters: 0,
        screws: 0,
      },
    },
    DEFAULT_SETTINGS.prices,
  );

  assert.equal(item.opening.bodyCount, 3);
  assert.equal(item.opening.leaves, undefined);
  assert.equal(item.opening.railPosition, undefined);
  assert.equal(item.opening.accessories.lockType, "mono");
  assert.equal(item.breakdown.glass[0].pieces, 3);
  assert.match(item.description, /3 cuerpos/);
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
