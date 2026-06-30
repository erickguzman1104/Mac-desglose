import { SystemId } from "./models";

export interface SystemCatalogItem {
  id: SystemId;
  label: string;
  shortLabel: string;
  category: "Ventana" | "Puerta" | "Protector";
  usesRails: boolean;
  accent: "blue" | "red";
}

export const SYSTEM_CATALOG: SystemCatalogItem[] = [
  { id: "Protectores Aluestrong", label: "Protectores Aluestrong", shortLabel: "Aluestrong", category: "Protector", usesRails: false, accent: "red" },
  { id: "P-65", label: "Ventanas P-65", shortLabel: "P-65", category: "Ventana", usesRails: true, accent: "blue" },
  { id: "AA", label: "Ventanas AA", shortLabel: "AA", category: "Ventana", usesRails: true, accent: "red" },
  { id: "M-100 sin tapa", label: "Ventanas M-100 sin tapa", shortLabel: "M-100 ST", category: "Ventana", usesRails: true, accent: "blue" },
  { id: "Puerta Abisagrada P40", label: "Puertas Abisagrada P40", shortLabel: "P40 puerta", category: "Puerta", usesRails: false, accent: "red" },
  { id: "Puerta Comercial", label: "Puerta Comercial", shortLabel: "Comercial", category: "Puerta", usesRails: false, accent: "blue" },
  { id: "Tradicional", label: "Ventanas Tradicional", shortLabel: "Tradicional", category: "Ventana", usesRails: true, accent: "red" },
  { id: "P-92", label: "Ventanas P-92", shortLabel: "P-92", category: "Ventana", usesRails: true, accent: "blue" },
  { id: "C-70", label: "Ventanas C-70", shortLabel: "C-70", category: "Ventana", usesRails: true, accent: "red" },
  { id: "M-100 con tapa", label: "Ventanas M-100 con tapa", shortLabel: "M-100 CT", category: "Ventana", usesRails: true, accent: "blue" },
  { id: "Ventana Abisagrada P40", label: "Ventanas Abisagrada P40", shortLabel: "P40 ventana", category: "Ventana", usesRails: false, accent: "red" },
];

export function getSystemCatalogItem(id: SystemId) {
  return SYSTEM_CATALOG.find((system) => system.id === id) ?? SYSTEM_CATALOG[0];
}
