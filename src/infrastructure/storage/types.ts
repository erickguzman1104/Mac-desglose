import type { AppSettings, Breakdown, Quote } from "@/domain/models";
import type { BreakdownRepository } from "@/infrastructure/breakdownRepository";
import type { QuoteRepository } from "@/infrastructure/quoteRepository";

export interface AppStorage {
  quotes: QuoteRepository;
  breakdowns: BreakdownRepository;
  loadSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
}

export interface StoredBreakdown {
  breakdown: Breakdown;
  searchText: string;
}

export interface StoredQuote {
  quote: Quote;
  searchText: string;
}
