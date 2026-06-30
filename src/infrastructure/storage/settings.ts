import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { AppSettings } from "@/domain/models";

export function mergeStoredSettings(stored?: Partial<AppSettings> | null): AppSettings {
  if (!stored) return DEFAULT_SETTINGS;

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    company: { ...DEFAULT_SETTINGS.company, ...stored.company },
    prices: {
      ...DEFAULT_SETTINGS.prices,
      ...stored.prices,
      accessoryPrices: {
        ...DEFAULT_SETTINGS.prices.accessoryPrices,
        ...stored.prices?.accessoryPrices,
      },
    },
  };
}
