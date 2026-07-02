import { Breakdown } from "@/domain/models";
import { type SQLiteDatabase } from "expo-sqlite";

interface BreakdownRow {
  payload: string;
}

export interface BreakdownRepository {
  save(breakdown: Breakdown): Promise<void>;
  list(search?: string): Promise<Breakdown[]>;
  findById(id: string): Promise<Breakdown | null>;
}

export class SQLiteBreakdownRepository implements BreakdownRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async save(breakdown: Breakdown) {
    const searchText = `${breakdown.number} ${breakdown.name}`.toLowerCase();
    await this.db.runAsync(
      `INSERT INTO breakdowns (
        id, number, name, search_text, payload, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        search_text = excluded.search_text,
        payload = excluded.payload,
        updated_at = excluded.updated_at`,
      breakdown.id,
      breakdown.number,
      breakdown.name,
      searchText,
      JSON.stringify(breakdown),
      breakdown.createdAt,
      breakdown.updatedAt,
    );
  }

  async list(search = "") {
    const rows = await this.db.getAllAsync<BreakdownRow>(
      `SELECT payload FROM breakdowns
       WHERE search_text LIKE ?
       ORDER BY updated_at DESC`,
      `%${search.toLowerCase()}%`,
    );
    return rows.map(({ payload }) => JSON.parse(payload) as Breakdown);
  }

  async findById(id: string) {
    const row = await this.db.getFirstAsync<BreakdownRow>(
      "SELECT payload FROM breakdowns WHERE id = ?",
      id,
    );
    return row ? (JSON.parse(row.payload) as Breakdown) : null;
  }
}
