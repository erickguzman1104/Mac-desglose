import { calculateAutomaticAccessories } from "@/domain/calculations/accessories";
import { calculateMaterials } from "@/domain/calculations/systemRegistry";
import {
  Breakdown,
  BreakdownItem,
  OpeningInput,
  PriceSettings,
} from "@/domain/models";
import {
  getSystemCatalogItem,
  supportsRails,
  usesSimpleMeasurementFlow,
} from "@/domain/systemCatalog";
import { createId } from "./quoteFactory";

export function createBreakdownItem(
  opening: OpeningInput,
  prices: PriceSettings,
): BreakdownItem {
  const hasSimpleMeasurements = usesSimpleMeasurementFlow(opening.systemId);
  const partCount =
    opening.systemId === "AA"
      ? opening.bodyCount ?? opening.leaves ?? 1
      : hasSimpleMeasurements
        ? 1
        : opening.leaves ?? 2;
  const normalizedOpening: OpeningInput = {
    ...opening,
    pricePerSquareFoot: 0,
    applyAdditionalMargin: false,
    leaves:
      opening.systemId === "AA" || hasSimpleMeasurements
        ? undefined
        : opening.leaves ?? 2,
    bodyCount: opening.systemId === "AA" ? partCount : undefined,
    railPosition: supportsRails(opening.systemId)
      ? opening.railPosition ?? "interior"
      : undefined,
    accessories: calculateAutomaticAccessories(
      prices.accessoryRules[opening.systemId],
      partCount,
      opening.quantity,
    ),
  };

  return {
    id: createId(),
    description:
      opening.systemId === "AA"
        ? `${getSystemCatalogItem(opening.systemId).label} · ${partCount} cuerpos`
        : hasSimpleMeasurements
          ? getSystemCatalogItem(opening.systemId).label
          : `${getSystemCatalogItem(opening.systemId).label} · ${partCount} hojas`,
    opening: normalizedOpening,
    breakdown: calculateMaterials(normalizedOpening),
  };
}

export function createBreakdown(
  name: string,
  notes: string,
  items: BreakdownItem[],
): Breakdown {
  const now = new Date().toISOString();
  return {
    id: createId(),
    number: `DES-${Date.now().toString().slice(-6)}`,
    name: name.trim() || "Desglose sin nombre",
    notes: notes.trim(),
    items,
    createdAt: now,
    updatedAt: now,
  };
}
