import {
  AccessoryInput,
  SystemAccessoryRules,
} from "../models";

const round = (value: number) => Math.round(value * 100) / 100;

const applyRule = (
  rule: { perWindow: number; perLeaf: number },
  parts: number,
  windows: number,
) => round((rule.perWindow + rule.perLeaf * parts) * windows);

export function calculateAutomaticAccessories(
  rules: SystemAccessoryRules,
  parts: number,
  windows: number,
): AccessoryInput {
  return {
    rubberMeters: applyRule(rules.rubberMeters, parts, windows),
    wheels: applyRule(rules.wheels, parts, windows),
    guideKits: applyRule(rules.guideKits, parts, windows),
    weatherstripMeters: applyRule(rules.weatherstripMeters, parts, windows),
    screws: applyRule(rules.screws, parts, windows),
    lockType: "puño",
    locks: applyRule(rules.locksByType.puño, parts, windows),
  };
}
