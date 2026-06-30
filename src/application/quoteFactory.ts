import { calculateMaterials } from "@/domain/calculations/systemRegistry";
import { calculatePrice, calculateQuoteTotals } from "@/domain/calculations/pricing";
import {
  Client,
  OpeningInput,
  PriceSettings,
  Quote,
  QuoteItem,
} from "@/domain/models";
import { getSystemCatalogItem } from "@/domain/systemCatalog";

export const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export function createQuoteItem(
  opening: OpeningInput,
  prices: PriceSettings,
): QuoteItem {
  const breakdown = calculateMaterials(opening);
  const pricing = calculatePrice(breakdown, opening.quantity, prices);
  return {
    id: createId(),
    description: `${getSystemCatalogItem(opening.systemId).label} · ${opening.leaves} hojas`,
    opening,
    breakdown,
    pricing,
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
