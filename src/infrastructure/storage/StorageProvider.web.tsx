import type { AppSettings, Breakdown, Quote } from "@/domain/models";
import type { BreakdownRepository } from "@/infrastructure/breakdownRepository";
import type { QuoteRepository } from "@/infrastructure/quoteRepository";
import { StorageContext } from "@/infrastructure/storage/StorageContext";
import { mergeStoredSettings } from "@/infrastructure/storage/settings";
import type { AppStorage, StoredBreakdown, StoredQuote } from "@/infrastructure/storage/types";
import { PropsWithChildren, useMemo } from "react";

const QUOTES_KEY = "mac-desgloses:quotes:v1";
const SETTINGS_KEY = "mac-desgloses:settings:v1";
const BREAKDOWNS_KEY = "mac-desgloses:breakdowns:v1";

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function parseValue<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

class LocalStorageQuoteRepository implements QuoteRepository {
  constructor(private readonly storage: Storage | null) {}

  private read(): StoredQuote[] {
    return parseValue<StoredQuote[]>(this.storage?.getItem(QUOTES_KEY) ?? null, []);
  }

  async save(quote: Quote) {
    const records = this.read();
    const record: StoredQuote = {
      quote,
      searchText:
        `${quote.client.name} ${quote.projectName} ${quote.number}`.toLowerCase(),
    };
    const existingIndex = records.findIndex(({ quote: stored }) => stored.id === quote.id);

    if (existingIndex === -1) {
      records.push(record);
    } else {
      records[existingIndex] = record;
    }

    this.storage?.setItem(QUOTES_KEY, JSON.stringify(records));
  }

  async list(search = "") {
    const normalizedSearch = search.toLowerCase();
    return this.read()
      .filter(({ searchText }) => searchText.includes(normalizedSearch))
      .map(({ quote }) => quote)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async findById(id: string) {
    return this.read().find(({ quote }) => quote.id === id)?.quote ?? null;
  }
}

class LocalStorageBreakdownRepository implements BreakdownRepository {
  constructor(private readonly storage: Storage | null) {}

  private read(): StoredBreakdown[] {
    return parseValue<StoredBreakdown[]>(
      this.storage?.getItem(BREAKDOWNS_KEY) ?? null,
      [],
    );
  }

  async save(breakdown: Breakdown) {
    const records = this.read();
    const record = {
      breakdown,
      searchText: `${breakdown.number} ${breakdown.name}`.toLowerCase(),
    };
    const index = records.findIndex(({ breakdown: stored }) => stored.id === breakdown.id);
    if (index === -1) records.push(record);
    else records[index] = record;
    this.storage?.setItem(BREAKDOWNS_KEY, JSON.stringify(records));
  }

  async list(search = "") {
    const normalized = search.toLowerCase();
    return this.read()
      .filter(({ searchText }) => searchText.includes(normalized))
      .map(({ breakdown }) => breakdown)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async findById(id: string) {
    return this.read().find(({ breakdown }) => breakdown.id === id)?.breakdown ?? null;
  }
}

class LocalStorageAdapter implements AppStorage {
  readonly quotes: QuoteRepository;
  readonly breakdowns: BreakdownRepository;

  constructor(private readonly storage: Storage | null) {
    this.quotes = new LocalStorageQuoteRepository(storage);
    this.breakdowns = new LocalStorageBreakdownRepository(storage);
  }

  async loadSettings() {
    const stored = parseValue<Partial<AppSettings>>(
      this.storage?.getItem(SETTINGS_KEY) ?? null,
      {},
    );
    return mergeStoredSettings(stored);
  }

  async saveSettings(settings: AppSettings) {
    this.storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}

export function StorageProvider({ children }: PropsWithChildren) {
  const storage = useMemo<AppStorage>(
    () => new LocalStorageAdapter(browserStorage()),
    [],
  );

  return (
    <StorageContext.Provider value={storage}>
      {children}
    </StorageContext.Provider>
  );
}
