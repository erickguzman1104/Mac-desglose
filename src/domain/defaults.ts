import { AppSettings, QuoteTotals } from "./models";

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
  unit: "mm",
  colorScheme: "system",
};

export const EMPTY_TOTALS: QuoteTotals = {
  directCost: 0,
  margin: 0,
  subtotal: 0,
  tax: 0,
  total: 0,
};
