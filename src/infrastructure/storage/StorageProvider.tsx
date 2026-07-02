import { migrateDatabase } from "@/infrastructure/database";
import { SQLiteQuoteRepository } from "@/infrastructure/quoteRepository";
import { SQLiteBreakdownRepository } from "@/infrastructure/breakdownRepository";
import {
  loadSettings,
  saveSettings,
} from "@/infrastructure/settingsRepository";
import { StorageContext } from "@/infrastructure/storage/StorageContext";
import { AppStorage } from "@/infrastructure/storage/types";
import {
  SQLiteProvider,
  useSQLiteContext,
} from "expo-sqlite";
import { PropsWithChildren, useMemo } from "react";

function SQLiteStorageProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const storage = useMemo<AppStorage>(
    () => ({
      quotes: new SQLiteQuoteRepository(db),
      breakdowns: new SQLiteBreakdownRepository(db),
      loadSettings: () => loadSettings(db),
      saveSettings: (settings) => saveSettings(db, settings),
    }),
    [db],
  );

  return (
    <StorageContext.Provider value={storage}>
      {children}
    </StorageContext.Provider>
  );
}

export function StorageProvider({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider databaseName="mac-desgloses.db" onInit={migrateDatabase}>
      <SQLiteStorageProvider>{children}</SQLiteStorageProvider>
    </SQLiteProvider>
  );
}
