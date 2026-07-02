export const SYSTEM_IDS = [
  "P-65",
  "AA",
  "M-100 sin tapa",
  "Puerta Abisagrada P40",
  "Puerta Comercial",
  "Tradicional",
  "P-92",
  "C-70",
  "M-100 con tapa",
  "Ventana Abisagrada P40",
] as const;

export type SystemId = (typeof SYSTEM_IDS)[number];
export type LeafCount = 2 | 3 | 4;
export type RailPosition = "interior" | "exterior";
export type QuoteStatus = "draft" | "approved" | "cancelled";
export type LockType = "mono" | "puño" | "tradicional" | "monopunto";
export type MeasurementUnit = "in" | "cm";

export interface AccessoryQuantityRule {
  perWindow: number;
  perLeaf: number;
}

export interface SystemAccessoryRules {
  rubberMeters: AccessoryQuantityRule;
  wheels: AccessoryQuantityRule;
  guideKits: AccessoryQuantityRule;
  weatherstripMeters: AccessoryQuantityRule;
  screws: AccessoryQuantityRule;
  locksByType: Record<LockType, AccessoryQuantityRule>;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  name: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  logoUri?: string;
}

export interface PriceSettings {
  currency: string;
  taxRate: number;
  profitMargin: number;
  barLengthMm: number;
  profilePricePerMeter: number;
  glassPricePerSquareMeter: number;
  accessoryUnitPrice: number;
  squareFootPrices: Record<SystemId, number>;
  accessoryRules: Record<SystemId, SystemAccessoryRules>;
  accessoryPrices: {
    rubberPerMeter: number;
    wheel: number;
    centerHandle: number;
    singlePointLock: number;
    traditionalLock: number;
    guideKit: number;
    weatherstripPerMeter: number;
    installationScrew: number;
    fabricationScrew: number;
    wallPlug: number;
  };
  laborPerUnit: number;
  transport: number;
}

export interface AppSettings {
  company: Company;
  prices: PriceSettings;
  unit: MeasurementUnit;
  colorScheme: "system" | "light" | "dark";
}

export interface OpeningInput {
  systemId: SystemId;
  leaves?: LeafCount;
  bodyCount?: number;
  railPosition?: RailPosition;
  width: number;
  height: number;
  unit: MeasurementUnit;
  widthInches: number;
  heightInches: number;
  widthMm: number;
  heightMm: number;
  quantity: number;
  pricePerSquareFoot: number;
  applyAdditionalMargin?: boolean;
  accessories: AccessoryInput;
}

export interface AccessoryInput {
  rubberMeters: number;
  wheels: number;
  lockType: LockType;
  locks: number;
  guideKits: number;
  weatherstripMeters: number;
  screws: number;
}

export interface SquareFootBreakdown {
  individualArea: number;
  totalArea: number;
  pricePerSquareFoot: number;
  total: number;
}

export interface MaterialCut {
  id: string;
  materialCode: string;
  materialName: string;
  lengthMm: number;
  pieces: number;
  purpose: string;
}

export interface MaterialSummary {
  code: string;
  name: string;
  unit: "m" | "m²" | "ud";
  quantity: number;
  category: "profile" | "accessory";
}

export interface GlassPiece {
  widthMm: number;
  heightMm: number;
  pieces: number;
  areaM2: number;
}

export interface MaterialBreakdown {
  cuts: MaterialCut[];
  materials: MaterialSummary[];
  glass: GlassPiece[];
  estimatedWastePercent: number;
  warning?: string;
}

export interface PriceBreakdown {
  materials: number;
  glass: number;
  accessories: number;
  labor: number;
  squareFootCharge: number;
  directCost: number;
  margin: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface QuoteItem {
  id: string;
  description: string;
  opening: OpeningInput;
  breakdown: MaterialBreakdown;
  pricing: PriceBreakdown;
  squareFoot?: SquareFootBreakdown;
  unitPrice: number;
  lineTotal: number;
}

export interface QuoteTotals {
  directCost: number;
  margin: number;
  subtotal: number;
  discount?: number;
  tax: number;
  total: number;
}

export interface BreakdownItem {
  id: string;
  description: string;
  opening: OpeningInput;
  breakdown: MaterialBreakdown;
}

export interface Breakdown {
  id: string;
  number: string;
  name: string;
  notes: string;
  items: BreakdownItem[];
  createdAt: string;
  updatedAt: string;
}

export interface QuoteCommercialTerms {
  pricePerSquareFoot: number;
  transport: number;
  installation: number;
  taxRate: number;
  applyTax: boolean;
  applyAdditionalMargin: boolean;
  discountPercent: number;
}

export interface Quote {
  id: string;
  number: string;
  client: Client;
  projectName: string;
  date: string;
  notes: string;
  status: QuoteStatus;
  breakdownId?: string;
  commercial?: QuoteCommercialTerms;
  items: QuoteItem[];
  totals: QuoteTotals;
  settingsSnapshot: PriceSettings;
  createdAt: string;
  updatedAt: string;
}

export interface OptimizedBar {
  id: number;
  cuts: Array<{ lengthMm: number; label: string }>;
  remainderMm: number;
}

export type GlassSheetSizeId = "130x84" | "96x72";

export interface PositionedGlassCut {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  originalWidthMm: number;
  originalHeightMm: number;
  rotated: boolean;
}

export interface GlassSheetPlan {
  id: number;
  widthMm: number;
  heightMm: number;
  cuts: PositionedGlassCut[];
  usedAreaM2: number;
  wasteAreaM2: number;
  wastePercent: number;
}

export interface GlassOptimization {
  sizeId: GlassSheetSizeId;
  label: string;
  sheets: GlassSheetPlan[];
  requiredPieces: number;
  placedPieces: number;
  totalWasteAreaM2: number;
  wastePercent: number;
  error?: string;
}

export interface WindowSystemDefinition {
  id: SystemId;
  name: string;
  formulaVersion: string;
  configured: boolean;
  calculate(input: OpeningInput): MaterialBreakdown;
}
