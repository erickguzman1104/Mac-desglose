import type { AppSettings, Quote } from "@/domain/models";
import type { QuoteRepository } from "@/infrastructure/quoteRepository";

export interface AppStorage {
  quotes: QuoteRepository;
  loadSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
}

export interface StoredQuote {
  quote: Quote;
  searchText: string;
}
