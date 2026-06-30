import { Quote } from "@/domain/models";
import { type SQLiteDatabase } from "expo-sqlite";

interface QuoteRow {
  payload: string;
}

export interface QuoteRepository {
  save(quote: Quote): Promise<void>;
  list(search?: string): Promise<Quote[]>;
  findById(id: string): Promise<Quote | null>;
}

export class SQLiteQuoteRepository implements QuoteRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async save(quote: Quote) {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `INSERT INTO clients (id, name, phone, address, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           phone = excluded.phone,
           address = excluded.address`,
        quote.client.id,
        quote.client.name,
        quote.client.phone,
        quote.client.address,
        quote.client.createdAt,
      );

      const searchText =
        `${quote.client.name} ${quote.projectName} ${quote.number}`.toLowerCase();
      await this.db.runAsync(
        `INSERT INTO quotes (
          id, number, client_id, project_name, quote_date, status,
          search_text, payload, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          project_name = excluded.project_name,
          quote_date = excluded.quote_date,
          status = excluded.status,
          search_text = excluded.search_text,
          payload = excluded.payload,
          updated_at = excluded.updated_at`,
        quote.id,
        quote.number,
        quote.client.id,
        quote.projectName,
        quote.date,
        quote.status,
        searchText,
        JSON.stringify(quote),
        quote.createdAt,
        quote.updatedAt,
      );
    });
  }

  async list(search = "") {
    const rows = await this.db.getAllAsync<QuoteRow>(
      `SELECT payload FROM quotes
       WHERE search_text LIKE ?
       ORDER BY updated_at DESC`,
      `%${search.toLowerCase()}%`,
    );
    return rows.map((row) => JSON.parse(row.payload) as Quote);
  }

  async findById(id: string) {
    const row = await this.db.getFirstAsync<QuoteRow>(
      "SELECT payload FROM quotes WHERE id = ?",
      id,
    );
    return row ? (JSON.parse(row.payload) as Quote) : null;
  }
}
