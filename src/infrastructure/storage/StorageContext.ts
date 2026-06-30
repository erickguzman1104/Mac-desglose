import type { AppStorage } from "@/infrastructure/storage/types";
import { createContext, useContext } from "react";

export const StorageContext = createContext<AppStorage | null>(null);

export function useStorage() {
  const storage = useContext(StorageContext);
  if (!storage) {
    throw new Error("useStorage debe usarse dentro de StorageProvider");
  }
  return storage;
}
