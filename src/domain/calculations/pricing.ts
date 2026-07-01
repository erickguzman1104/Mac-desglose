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
  squareFootCharge = 0,
  applyAdditionalMargin = false,
): PriceBreakdown {
  const profileMeters = breakdown.materials
    .filter((material) => material.category === "profile")
    .reduce((sum, material) => sum + material.quantity, 0);
  const accessoryPriceByCode: Record<string, number> = {
    GOMA: settings.accessoryPrices.rubberPerMeter,
    RUEDAS: settings.accessoryPrices.wheel,
    "CIERRE-puño": settings.accessoryPrices.centerHandle,
    "CIERRE-mono": settings.accessoryPrices.singlePointLock,
    "CIERRE-monopunto": settings.accessoryPrices.singlePointLock,
    "CIERRE-tradicional": settings.accessoryPrices.traditionalLock,
    "KIT-GUIAS": settings.accessoryPrices.guideKit,
    FELPA: settings.accessoryPrices.weatherstripPerMeter,
    "TORNILLO-INSTALACION": settings.accessoryPrices.installationScrew,
    "TORNILLO-FABRICACION": settings.accessoryPrices.fabricationScrew,
    TORNILLOS: settings.accessoryPrices.installationScrew,
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
  // El precio por pie² es el precio de venta base y normalmente ya incluye
  // costos y ganancia. Para sistemas sin precio por pie² usamos el costo directo.
  const saleBase = squareFootCharge > 0 ? squareFootCharge : directCost;
  const margin = applyAdditionalMargin
    ? saleBase * (settings.profitMargin / 100)
    : 0;
  const subtotal = saleBase + margin;
  const tax = subtotal * (settings.taxRate / 100);

  return {
    materials: money(materials),
    glass: money(glass),
    accessories: money(accessories),
    labor: money(labor),
    squareFootCharge: money(squareFootCharge),
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
  const subtotal =
    items.reduce((sum, item) => sum + item.pricing.subtotal, 0) + transport;
  const tax = subtotal * (taxRate / 100);
  return {
    directCost: money(directCost),
    margin: money(margin),
    subtotal: money(subtotal),
    tax: money(tax),
    total: money(subtotal + tax),
  };
}
