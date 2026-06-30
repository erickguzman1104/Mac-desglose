import { AppSettings } from "@/domain/models";
import { mergeStoredSettings } from "@/infrastructure/storage/settings";
import { type SQLiteDatabase } from "expo-sqlite";

export async function loadSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'app'",
  );
  const stored = row ? (JSON.parse(row.value) as Partial<AppSettings>) : null;
  return mergeStoredSettings(stored);
}

export async function saveSettings(db: SQLiteDatabase, settings: AppSettings) {
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES ('app', ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    JSON.stringify(settings),
    new Date().toISOString(),
  );
}
