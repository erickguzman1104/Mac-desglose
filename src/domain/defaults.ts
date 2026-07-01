import {
  AppSettings,
  LockType,
  QuoteTotals,
  SYSTEM_IDS,
  SystemAccessoryRules,
  SystemId,
} from "./models";

const emptyQuantityRule = () => ({ perWindow: 0, perLeaf: 0 });

const emptyAccessoryRules = (): SystemAccessoryRules => ({
  rubberMeters: emptyQuantityRule(),
  wheels: emptyQuantityRule(),
  guideKits: emptyQuantityRule(),
  weatherstripMeters: emptyQuantityRule(),
  screws: emptyQuantityRule(),
  locksByType: Object.fromEntries(
    (["mono", "puño", "tradicional", "monopunto"] as LockType[]).map((type) => [
      type,
      emptyQuantityRule(),
    ]),
  ) as SystemAccessoryRules["locksByType"],
});

export const DEFAULT_SQUARE_FOOT_PRICES = Object.fromEntries(
  SYSTEM_IDS.map((id) => [id, 0]),
) as Record<SystemId, number>;

export const DEFAULT_ACCESSORY_RULES = Object.fromEntries(
  SYSTEM_IDS.map((id) => [id, emptyAccessoryRules()]),
) as Record<SystemId, SystemAccessoryRules>;

export const DEFAULT_SETTINGS: AppSettings = {
  company: {
    name: "Mi empresa",
    taxId: "",
    phone: "",
    email: "",
    address: "",
  },
  prices: {
    currency: "DOP",
    taxRate: 18,
    profitMargin: 25,
    barLengthMm: 6000,
    profilePricePerMeter: 350,
    glassPricePerSquareMeter: 1800,
    accessoryUnitPrice: 150,
    squareFootPrices: DEFAULT_SQUARE_FOOT_PRICES,
    accessoryRules: DEFAULT_ACCESSORY_RULES,
    accessoryPrices: {
      rubberPerMeter: 0,
      wheel: 0,
      centerHandle: 0,
      singlePointLock: 0,
      traditionalLock: 0,
      guideKit: 0,
      weatherstripPerMeter: 0,
      installationScrew: 0,
      fabricationScrew: 0,
      wallPlug: 0,
    },
    laborPerUnit: 1200,
    transport: 0,
  },
  unit: "in",
  colorScheme: "system",
};

export const EMPTY_TOTALS: QuoteTotals = {
  directCost: 0,
  margin: 0,
  subtotal: 0,
  tax: 0,
  total: 0,
};
