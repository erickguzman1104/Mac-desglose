import {
  MaterialBreakdown,
  PriceBreakdown,
  PriceSettings,
  QuoteItem,
  QuoteTotals,
} from "../models";

const money = (value: number) => Math.round(value * 100) / 100;

export function calculatePrice(
  breakdown: MaterialBreakdown,
  quantity: number,
  settings: PriceSettings,
): PriceBreakdown {
  const profileMeters = breakdown.materials
    .filter((material) => material.category === "profile")
    .reduce((sum, material) => sum + material.quantity, 0);
  const accessoryPriceByCode: Record<string, number> = {
    GOMA: settings.accessoryPrices.rubberPerMeter,
    RUEDAS: settings.accessoryPrices.wheel,
    "CIERRE-puño-centro": settings.accessoryPrices.centerHandle,
    "CIERRE-monopunto": settings.accessoryPrices.singlePointLock,
    "CIERRE-tradicional": settings.accessoryPrices.traditionalLock,
    "KIT-GUIAS": settings.accessoryPrices.guideKit,
    FELPA: settings.accessoryPrices.weatherstripPerMeter,
    "TORNILLO-INSTALACION": settings.accessoryPrices.installationScrew,
    "TORNILLO-FABRICACION": settings.accessoryPrices.fabricationScrew,
    TARUGOS: settings.accessoryPrices.wallPlug,
  };
  const accessories = breakdown.materials
    .filter((material) => material.category === "accessory")
    .reduce(
      (sum, material) =>
        sum +
        material.quantity *
          (accessoryPriceByCode[material.code] || settings.accessoryUnitPrice),
      0,
    );
  const glassArea = breakdown.glass.reduce((sum, glass) => sum + glass.areaM2, 0);

  const materials = profileMeters * settings.profilePricePerMeter;
  const glass = glassArea * settings.glassPricePerSquareMeter;
  const labor = quantity * settings.laborPerUnit;
  const directCost = materials + glass + accessories + labor;
  const margin = directCost * (settings.profitMargin / 100);
  const subtotal = directCost + margin;
  const tax = subtotal * (settings.taxRate / 100);

  return {
    materials: money(materials),
    glass: money(glass),
    accessories: money(accessories),
    labor: money(labor),
    directCost: money(directCost),
    margin: money(margin),
    subtotal: money(subtotal),
    tax: money(tax),
    total: money(subtotal + tax),
  };
}

export function calculateQuoteTotals(
  items: QuoteItem[],
  transport = 0,
  taxRate = 0,
): QuoteTotals {
  const directCost =
    items.reduce((sum, item) => sum + item.pricing.directCost, 0) + transport;
  const margin = items.reduce((sum, item) => sum + item.pricing.margin, 0);
  const subtotal = directCost + margin;
  const tax = subtotal * (taxRate / 100);
  return {
    directCost: money(directCost),
    margin: money(margin),
    subtotal: money(subtotal),
    tax: money(tax),
    total: money(subtotal + tax),
  };
}
