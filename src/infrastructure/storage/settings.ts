import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { AppSettings, LockType, SYSTEM_IDS } from "@/domain/models";

export function mergeStoredSettings(stored?: Partial<AppSettings> | null): AppSettings {
  if (!stored) return DEFAULT_SETTINGS;

  const squareFootPrices = Object.fromEntries(
    SYSTEM_IDS.map((systemId) => [
      systemId,
      stored.prices?.squareFootPrices?.[systemId] ??
        DEFAULT_SETTINGS.prices.squareFootPrices[systemId],
    ]),
  ) as AppSettings["prices"]["squareFootPrices"];

  const accessoryRules = Object.fromEntries(
    SYSTEM_IDS.map((systemId) => {
      const defaults = DEFAULT_SETTINGS.prices.accessoryRules[systemId];
      const saved = stored.prices?.accessoryRules?.[systemId];
      const mergeRule = (key: keyof Omit<typeof defaults, "locksByType">) => ({
        ...defaults[key],
        ...saved?.[key],
      });
      return [
        systemId,
        {
          rubberMeters: mergeRule("rubberMeters"),
          wheels: mergeRule("wheels"),
          guideKits: mergeRule("guideKits"),
          weatherstripMeters: mergeRule("weatherstripMeters"),
          screws: mergeRule("screws"),
          locksByType: Object.fromEntries(
            (["mono", "puño", "tradicional", "monopunto"] as LockType[]).map((lockType) => [
              lockType,
              {
                ...defaults.locksByType[lockType],
                ...saved?.locksByType?.[lockType],
              },
            ]),
          ),
        },
      ];
    }),
  ) as AppSettings["prices"]["accessoryRules"];

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    unit: stored.unit === "cm" ? "cm" : "in",
    company: { ...DEFAULT_SETTINGS.company, ...stored.company },
    prices: {
      ...DEFAULT_SETTINGS.prices,
      ...stored.prices,
      squareFootPrices,
      accessoryRules,
      accessoryPrices: {
        ...DEFAULT_SETTINGS.prices.accessoryPrices,
        ...stored.prices?.accessoryPrices,
      },
    },
  };
}
