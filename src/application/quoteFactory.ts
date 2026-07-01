import { calculateMaterials } from "@/domain/calculations/systemRegistry";
import { calculatePrice, calculateQuoteTotals } from "@/domain/calculations/pricing";
import { calculateAutomaticAccessories } from "@/domain/calculations/accessories";
import { calculateSquareFootPrice } from "@/domain/calculations/measurement";
import {
  Client,
  OpeningInput,
  PriceSettings,
  Quote,
  QuoteItem,
} from "@/domain/models";
import {
  availableLockTypes,
  getSystemCatalogItem,
  supportsRails,
  supportsSquareFootPricing,
} from "@/domain/systemCatalog";

export const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export function createQuoteItem(
  opening: OpeningInput,
  prices: PriceSettings,
): QuoteItem {
  const partCount =
    opening.systemId === "AA"
      ? opening.bodyCount ?? opening.leaves ?? 1
      : opening.leaves ?? 2;
  const lockType = availableLockTypes(opening.systemId).includes(
    opening.accessories.lockType,
  )
    ? opening.accessories.lockType
    : "mono";
  const accessories = calculateAutomaticAccessories(
    prices.accessoryRules[opening.systemId],
    partCount,
    opening.quantity,
    lockType,
  );
  const normalizedOpening: OpeningInput = {
    ...opening,
    leaves: opening.systemId === "AA" ? undefined : opening.leaves ?? 2,
    bodyCount: opening.systemId === "AA" ? partCount : undefined,
    railPosition: supportsRails(opening.systemId)
      ? opening.railPosition ?? "interior"
      : undefined,
    accessories,
  };
  const breakdown = calculateMaterials(normalizedOpening);
  const squareFoot = supportsSquareFootPricing(opening.systemId)
    ? calculateSquareFootPrice(
        opening.widthInches,
        opening.heightInches,
        opening.quantity,
        opening.pricePerSquareFoot,
      )
    : undefined;
  const pricing = calculatePrice(
    breakdown,
    opening.quantity,
    prices,
    squareFoot?.total ?? 0,
  );
  return {
    id: createId(),
    description:
      opening.systemId === "AA"
        ? `${getSystemCatalogItem(opening.systemId).label} · ${partCount} cuerpos`
        : `${getSystemCatalogItem(opening.systemId).label} · ${partCount} hojas`,
    opening: normalizedOpening,
    breakdown,
    pricing,
    squareFoot,
    unitPrice: pricing.total / opening.quantity,
    lineTotal: pricing.total,
  };
}

interface QuoteDraft {
  id?: string;
  number?: string;
  client: Omit<Client, "id" | "createdAt">;
  projectName: string;
  notes: string;
  items: QuoteItem[];
}

export function createQuote(draft: QuoteDraft, prices: PriceSettings): Quote {
  const now = new Date().toISOString();
  const id = draft.id ?? createId();
  const client: Client = {
    id: createId(),
    createdAt: now,
    ...draft.client,
  };
  return {
    id,
    number: draft.number ?? `COT-${Date.now().toString().slice(-6)}`,
    client,
    projectName: draft.projectName.trim() || "Proyecto sin nombre",
    date: now.slice(0, 10),
    notes: draft.notes.trim(),
    status: "draft",
    items: draft.items,
    totals: calculateQuoteTotals(draft.items, prices.transport, prices.taxRate),
    settingsSnapshot: { ...prices },
    createdAt: now,
    updatedAt: now,
  };
}
