import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { AppSettings, Breakdown, Quote } from "@/domain/models";
import { useStorage } from "@/infrastructure/storage/StorageContext";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AppContextValue {
  settings: AppSettings;
  quotes: Quote[];
  breakdowns: Breakdown[];
  loading: boolean;
  refreshQuotes(search?: string): Promise<void>;
  findQuote(id: string): Promise<Quote | null>;
  saveQuote(quote: Quote): Promise<void>;
  refreshBreakdowns(search?: string): Promise<void>;
  findBreakdown(id: string): Promise<Breakdown | null>;
  saveBreakdown(breakdown: Breakdown): Promise<void>;
  updateSettings(settings: AppSettings): Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const storage = useStorage();
  const repository = storage.quotes;
  const breakdownRepository = storage.breakdowns;
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshQuotes = useCallback(
    async (search = "") => setQuotes(await repository.list(search)),
    [repository],
  );
  const refreshBreakdowns = useCallback(
    async (search = "") => setBreakdowns(await breakdownRepository.list(search)),
    [breakdownRepository],
  );

  useEffect(() => {
    Promise.all([storage.loadSettings(), repository.list(), breakdownRepository.list()])
      .then(([storedSettings, storedQuotes, storedBreakdowns]) => {
        setSettings(storedSettings);
        setQuotes(storedQuotes);
        setBreakdowns(storedBreakdowns);
      })
      .finally(() => setLoading(false));
  }, [breakdownRepository, repository, storage]);

  const findQuote = useCallback(
    (id: string) => repository.findById(id),
    [repository],
  );

  const saveQuote = async (quote: Quote) => {
    await repository.save(quote);
    await refreshQuotes();
  };

  const findBreakdown = useCallback(
    (id: string) => breakdownRepository.findById(id),
    [breakdownRepository],
  );

  const saveBreakdown = async (breakdown: Breakdown) => {
    await breakdownRepository.save(breakdown);
    await refreshBreakdowns();
  };

  const updateSettings = async (nextSettings: AppSettings) => {
    await storage.saveSettings(nextSettings);
    setSettings(nextSettings);
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        quotes,
        breakdowns,
        loading,
        refreshQuotes,
        findQuote,
        saveQuote,
        refreshBreakdowns,
        findBreakdown,
        saveBreakdown,
        updateSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp debe usarse dentro de AppProvider");
  return value;
}
