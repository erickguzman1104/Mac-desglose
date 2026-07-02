import { calculateMaterials } from "@/domain/calculations/systemRegistry";
import { calculatePrice, calculateQuoteTotals } from "@/domain/calculations/pricing";
import { calculateAutomaticAccessories } from "@/domain/calculations/accessories";
import { calculateSquareFootPrice } from "@/domain/calculations/measurement";
import {
  Client,
  Breakdown,
  OpeningInput,
  PriceSettings,
  Quote,
  QuoteItem,
  QuoteCommercialTerms,
} from "@/domain/models";
import {
  getSystemCatalogItem,
  supportsRails,
  supportsSquareFootPricing,
  usesSimpleMeasurementFlow,
} from "@/domain/systemCatalog";

export const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export function createQuoteItem(
  opening: OpeningInput,
  prices: PriceSettings,
): QuoteItem {
  const hasSimpleMeasurements = usesSimpleMeasurementFlow(opening.systemId);
  const partCount =
    opening.systemId === "AA"
      ? opening.bodyCount ?? opening.leaves ?? 1
      : hasSimpleMeasurements
        ? 1
        : opening.leaves ?? 2;
  const accessories = calculateAutomaticAccessories(
    prices.accessoryRules[opening.systemId],
    partCount,
    opening.quantity,
  );
  const normalizedOpening: OpeningInput = {
    ...opening,
    leaves:
      opening.systemId === "AA" || hasSimpleMeasurements
        ? undefined
        : opening.leaves ?? 2,
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
    opening.applyAdditionalMargin ?? false,
  );
  return {
    id: createId(),
    description:
      opening.systemId === "AA"
        ? `${getSystemCatalogItem(opening.systemId).label} · ${partCount} cuerpos`
        : hasSimpleMeasurements
          ? getSystemCatalogItem(opening.systemId).label
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

export function createQuoteFromBreakdown(
  breakdown: Breakdown,
  clientDraft: Omit<Client, "id" | "createdAt">,
  projectName: string,
  notes: string,
  terms: QuoteCommercialTerms,
  prices: PriceSettings,
): Quote {
  const items = breakdown.items.map((item) => {
    const quoteItem = createQuoteItem(
      {
        ...item.opening,
        pricePerSquareFoot: terms.pricePerSquareFoot,
        applyAdditionalMargin: false,
      },
      { ...prices, taxRate: 0, laborPerUnit: 0 },
    );
    const squareFoot = calculateSquareFootPrice(
      item.opening.widthInches,
      item.opening.heightInches,
      item.opening.quantity,
      terms.pricePerSquareFoot,
    );
    return {
      ...quoteItem,
      squareFoot,
      unitPrice: squareFoot.total / item.opening.quantity,
      lineTotal: squareFoot.total,
    };
  });
  const now = new Date().toISOString();
  const sales = items.reduce(
    (sum, item) => sum + (item.squareFoot?.total ?? 0),
    0,
  );
  const marginBase = sales + terms.installation;
  const margin = terms.applyAdditionalMargin
    ? marginBase * (prices.profitMargin / 100)
    : 0;
  const beforeDiscount =
    sales + terms.installation + terms.transport + margin;
  const discount = beforeDiscount * (terms.discountPercent / 100);
  const subtotal = beforeDiscount - discount;
  const tax = terms.applyTax ? subtotal * (terms.taxRate / 100) : 0;
  const money = (value: number) => Math.round(value * 100) / 100;

  return {
    id: createId(),
    number: `COT-${Date.now().toString().slice(-6)}`,
    client: {
      id: createId(),
      createdAt: now,
      ...clientDraft,
    },
    projectName: projectName.trim() || breakdown.name,
    date: now.slice(0, 10),
    notes: notes.trim(),
    status: "draft",
    breakdownId: breakdown.id,
    commercial: terms,
    items,
    totals: {
      directCost: money(items.reduce((sum, item) => sum + item.pricing.directCost, 0)),
      margin: money(margin),
      subtotal: money(subtotal),
      discount: money(discount),
      tax: money(tax),
      total: money(subtotal + tax),
    },
    settingsSnapshot: { ...prices },
    createdAt: now,
    updatedAt: now,
  };
}

export function recalculateQuoteCommercial(
  quote: Quote,
  terms: QuoteCommercialTerms,
): Quote {
  const items = quote.items.map((item) => {
    const squareFoot = calculateSquareFootPrice(
      item.opening.widthInches,
      item.opening.heightInches,
      item.opening.quantity,
      terms.pricePerSquareFoot,
    );
    return {
      ...item,
      opening: { ...item.opening, pricePerSquareFoot: terms.pricePerSquareFoot },
      squareFoot,
      unitPrice: squareFoot.total / item.opening.quantity,
      lineTotal: squareFoot.total,
    };
  });
  const sales = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const margin = terms.applyAdditionalMargin
    ? (sales + terms.installation) *
      (quote.settingsSnapshot.profitMargin / 100)
    : 0;
  const beforeDiscount =
    sales + terms.installation + terms.transport + margin;
  const discount = beforeDiscount * (terms.discountPercent / 100);
  const subtotal = beforeDiscount - discount;
  const tax = terms.applyTax ? subtotal * (terms.taxRate / 100) : 0;
  const money = (value: number) => Math.round(value * 100) / 100;

  return {
    ...quote,
    items,
    commercial: terms,
    totals: {
      ...quote.totals,
      margin: money(margin),
      subtotal: money(subtotal),
      discount: money(discount),
      tax: money(tax),
      total: money(subtotal + tax),
    },
  };
}
