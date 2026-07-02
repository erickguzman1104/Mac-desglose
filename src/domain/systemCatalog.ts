import { LockType, SystemId } from "./models";

export const SQUARE_FOOT_SYSTEMS: readonly SystemId[] = [
  "Tradicional",
  "P-65",
  "P-92",
  "AA",
  "C-70",
  "M-100 con tapa",
  "M-100 sin tapa",
];

export function supportsSquareFootPricing(id: SystemId) {
  return SQUARE_FOOT_SYSTEMS.includes(id);
}

export const RAIL_SYSTEMS: readonly SystemId[] = ["Tradicional", "P-65", "P-92"];

export function supportsRails(id: SystemId) {
  return RAIL_SYSTEMS.includes(id);
}

export const SIMPLE_MEASUREMENT_SYSTEMS: readonly SystemId[] = [
  "Puerta Comercial",
  "Puerta Abisagrada P40",
];

export function usesSimpleMeasurementFlow(id: SystemId) {
  return SIMPLE_MEASUREMENT_SYSTEMS.includes(id);
}

export function availableLockTypes(id: SystemId): readonly LockType[] {
  return ["puño"];
}

export interface SystemCatalogItem {
  id: SystemId;
  label: string;
  shortLabel: string;
  category: "Ventana" | "Puerta";
  usesRails: boolean;
  accent: "blue" | "red";
}

export const SYSTEM_CATALOG: SystemCatalogItem[] = [
  { id: "Tradicional", label: "Ventanas Tradicional", shortLabel: "Tradicional", category: "Ventana", usesRails: true, accent: "red" },
  { id: "P-65", label: "Ventanas P-65", shortLabel: "P-65", category: "Ventana", usesRails: true, accent: "blue" },
  { id: "P-92", label: "Ventanas P-92", shortLabel: "P-92", category: "Ventana", usesRails: true, accent: "blue" },
  { id: "C-70", label: "Ventanas C-70", shortLabel: "C-70", category: "Ventana", usesRails: false, accent: "red" },
  { id: "AA", label: "Ventanas AA", shortLabel: "AA", category: "Ventana", usesRails: false, accent: "red" },
  { id: "M-100 con tapa", label: "M-100 con tapa", shortLabel: "M-100 CT", category: "Ventana", usesRails: false, accent: "blue" },
  { id: "M-100 sin tapa", label: "M-100 sin tapa", shortLabel: "M-100 ST", category: "Ventana", usesRails: false, accent: "blue" },
  { id: "Puerta Comercial", label: "Puerta Comercial", shortLabel: "Comercial", category: "Puerta", usesRails: false, accent: "blue" },
  { id: "Puerta Abisagrada P40", label: "Puertas Abisagrada P40", shortLabel: "P40 puerta", category: "Puerta", usesRails: false, accent: "red" },
];

export function getSystemCatalogItem(id: SystemId) {
  return SYSTEM_CATALOG.find((system) => system.id === id) ?? SYSTEM_CATALOG[0];
}
