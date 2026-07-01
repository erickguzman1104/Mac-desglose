import { MeasurementUnit, SquareFootBreakdown } from "../models";

const round = (value: number, precision = 4) =>
  Math.round(value * 10 ** precision) / 10 ** precision;

export function toInches(value: number, unit: MeasurementUnit): number {
  return unit === "cm" ? value / 2.54 : value;
}

export function inchesToMillimeters(value: number): number {
  return value * 25.4;
}

export function fromInches(value: number, unit: MeasurementUnit): number {
  return unit === "cm" ? value * 2.54 : value;
}

export function calculateSquareFootPrice(
  widthInches: number,
  heightInches: number,
  quantity: number,
  pricePerSquareFoot: number,
): SquareFootBreakdown {
  const individualArea = (widthInches * heightInches) / 144;
  const totalArea = individualArea * quantity;
  return {
    individualArea: round(individualArea),
    totalArea: round(totalArea),
    pricePerSquareFoot: round(pricePerSquareFoot, 2),
    total: round(totalArea * pricePerSquareFoot, 2),
  };
}
