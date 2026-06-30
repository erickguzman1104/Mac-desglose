import { DEFAULT_SETTINGS } from "@/domain/defaults";
import { AppSettings, Quote } from "@/domain/models";
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
  loading: boolean;
  refreshQuotes(search?: string): Promise<void>;
  findQuote(id: string): Promise<Quote | null>;
  saveQuote(quote: Quote): Promise<void>;
  updateSettings(settings: AppSettings): Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const storage = useStorage();
  const repository = storage.quotes;
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshQuotes = useCallback(
    async (search = "") => setQuotes(await repository.list(search)),
    [repository],
  );

  useEffect(() => {
    Promise.all([storage.loadSettings(), repository.list()])
      .then(([storedSettings, storedQuotes]) => {
        setSettings(storedSettings);
        setQuotes(storedQuotes);
      })
      .finally(() => setLoading(false));
  }, [repository, storage]);

  const findQuote = useCallback(
    (id: string) => repository.findById(id),
    [repository],
  );

  const saveQuote = async (quote: Quote) => {
    await repository.save(quote);
    await refreshQuotes();
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
        loading,
        refreshQuotes,
        findQuote,
        saveQuote,
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
