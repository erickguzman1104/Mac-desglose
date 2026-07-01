import {
  AccessoryInput,
  LockType,
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
  lockType: LockType,
): AccessoryInput {
  return {
    rubberMeters: applyRule(rules.rubberMeters, parts, windows),
    wheels: applyRule(rules.wheels, parts, windows),
    guideKits: applyRule(rules.guideKits, parts, windows),
    weatherstripMeters: applyRule(rules.weatherstripMeters, parts, windows),
    screws: applyRule(rules.screws, parts, windows),
    lockType,
    locks: applyRule(rules.locksByType[lockType], parts, windows),
  };
}
