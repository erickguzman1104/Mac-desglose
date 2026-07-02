import { MeasurementUnit } from "../models";
import { toInches } from "./measurement";

export const INCH_FRACTIONS = [
  { label: "Sin fracción", sixteenths: 0 },
  { label: "1/16", sixteenths: 1 },
  { label: "1/8", sixteenths: 2 },
  { label: "3/16", sixteenths: 3 },
  { label: "1/4", sixteenths: 4 },
  { label: "5/16", sixteenths: 5 },
  { label: "3/8", sixteenths: 6 },
  { label: "7/16", sixteenths: 7 },
  { label: "1/2", sixteenths: 8 },
  { label: "9/16", sixteenths: 9 },
  { label: "5/8", sixteenths: 10 },
  { label: "11/16", sixteenths: 11 },
  { label: "3/4", sixteenths: 12 },
  { label: "13/16", sixteenths: 13 },
  { label: "7/8", sixteenths: 14 },
  { label: "15/16", sixteenths: 15 },
] as const;

export function roundToNearestSixteenth(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 16) / 16;
}

export function splitInches(value: number) {
  const rounded = Math.max(0, roundToNearestSixteenth(value));
  let whole = Math.floor(rounded);
  let sixteenths = Math.round((rounded - whole) * 16);
  if (sixteenths === 16) {
    whole += 1;
    sixteenths = 0;
  }
  return { whole, sixteenths };
}

export function combineInches(whole: number, sixteenths: number) {
  return roundToNearestSixteenth(
    Math.max(0, Math.floor(whole || 0)) + Math.max(0, sixteenths) / 16,
  );
}

export function formatInches(value: number) {
  const { whole, sixteenths } = splitInches(value);
  const fraction =
    INCH_FRACTIONS.find((option) => option.sixteenths === sixteenths)?.label ??
    "";
  if (!sixteenths) return `${whole}"`;
  return `${whole ? `${whole} ` : ""}${fraction}"`;
}

export function formatMeasurement(value: number, unit: MeasurementUnit) {
  if (unit === "in") return formatInches(value);
  const centimeters = Math.round(value * 100) / 100;
  return `${centimeters} cm (${formatInches(toInches(value, "cm"))})`;
}
