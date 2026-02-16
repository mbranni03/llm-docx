/**
 * Lightweight wrapper around LanceDB for vector storage.
 *
 * - DB files live in `backend/.vectordb/` (gitignored).
 * - Lazily connects on first operation.
 * - Provides simple `insert`, `search`, and `reset` helpers.
 * - Optionally accepts an `Embedder` for automatic text → vector conversion.
 *
 * Usage (raw vectors):
 * ```ts
 * const vdb = new VectorDB("chunks");
 * await vdb.insert([{ text: "hello", vector: [0.1, 0.2, ...] }]);
 * const results = await vdb.search([0.1, 0.2, ...], 5);
 * ```
 *
 * Usage (auto-embed):
 * ```ts
 * import { Embedder } from "./embedder";
 *
 * const vdb = new VectorDB("chunks", new Embedder());
 * await vdb.insertText([{ text: "hello" }]);
 * const results = await vdb.searchText("hello", 5);
 * ```
 */

import * as lancedb from "@lancedb/lancedb";
import type { Table, Connection } from "@lancedb/lancedb";
import { resolve } from "path";
import { Embedder } from "./embedder";

// ─── Constants ───────────────────────────────────────────────────────

/** Root directory for all LanceDB data (gitignored). */
const DB_DIR = resolve(import.meta.dir, "../.vectordb");

// ─── Types ───────────────────────────────────────────────────────────

export interface VectorRecord {
  vector: number[];
  [key: string]: unknown;
}

/** A record without a pre-computed vector — the embedder will generate it. */
export interface TextRecord {
  text: string;
  [key: string]: unknown;
}

export interface SearchResult<T = Record<string, unknown>> {
  /** The original record fields. */
  record: T;
  /** L2 distance from the query vector (lower = closer). */
  _distance: number;
}

// ─── VectorDB ────────────────────────────────────────────────────────

export class VectorDB {
  private tableName: string;
  private db: Connection | null = null;
  private table: Table | null = null;
  private embedder: Embedder | null;

  /**
   * @param tableName  Name of the LanceDB table / collection.
   * @param embedder   Optional `Embedder` instance to enable text-based
   *                   insert & search methods (`insertText`, `searchText`).
   */
  constructor(tableName: string, embedder?: Embedder) {
    this.tableName = tableName;
    this.embedder = embedder ?? null;
  }

  // ── Connection ──────────────────────────────────────────────────

  /** Lazily open (or reuse) the LanceDB connection. */
  private async connect(): Promise<Connection> {
    if (!this.db) {
      this.db = await lancedb.connect(DB_DIR);
    }
    return this.db;
  }

  /**
   * Get the underlying LanceDB Table, creating it from `initialData`
   * on first call if the table doesn't exist yet.
   *
   * If the table has never been created and no data is provided,
   * this returns `null` so callers can handle the empty-state.
   */
  private async getTable(initialData?: VectorRecord[]): Promise<Table | null> {
    if (this.table) return this.table;

    const db = await this.connect();
    const existing = await db.tableNames();

    if (existing.includes(this.tableName)) {
      this.table = await db.openTable(this.tableName);
      return this.table;
    }

    // Can only create the table when we have data to infer the schema.
    if (initialData && initialData.length > 0) {
      this.table = await db.createTable(this.tableName, initialData);
      return this.table;
    }

    return null;
  }

  // ── Public API — raw vectors ───────────────────────────────────

  /**
   * Insert one or more records into the collection.
   *
   * If the table doesn't exist yet the first batch of records will be
   * used to create it (LanceDB infers the schema from the data).
   */
  async insert(records: VectorRecord[]): Promise<void> {
    if (records.length === 0) return;

    let table = await this.getTable(records);

    // Table was just created from records — nothing left to add.
    if (table && !this.table) {
      this.table = table;
      return;
    }

    // Table already existed — append.
    if (table) {
      await table.add(records);
      return;
    }

    // Fallback: table didn't exist and getTable returned null (shouldn't
    // happen since we passed records, but guard defensively).
    const db = await this.connect();
    this.table = await db.createTable(this.tableName, records);
  }

  /**
   * Perform a nearest-neighbour vector search.
   *
   * @param queryVector  The vector to search for.
   * @param limit        Maximum number of results (default 10).
   * @returns            Matching records sorted by distance (ascending).
   */
  async search<T = Record<string, unknown>>(
    queryVector: number[],
    limit = 10,
  ): Promise<SearchResult<T>[]> {
    const table = await this.getTable();
    if (!table) return [];

    const raw = await table.vectorSearch(queryVector).limit(limit).toArray();

    return raw.map((row: Record<string, unknown>) => {
      const { _distance, ...rest } = row;
      return { record: rest as T, _distance: _distance as number };
    });
  }

  /**
   * Drop the table and clear the cached reference so the next
   * `insert` call will recreate it from scratch.
   */
  async reset(): Promise<void> {
    const db = await this.connect();
    const existing = await db.tableNames();

    if (existing.includes(this.tableName)) {
      await db.dropTable(this.tableName);
    }

    this.table = null;
  }

  /**
   * Return the number of rows currently stored.
   * Returns `0` if the table hasn't been created yet.
   */
  async count(): Promise<number> {
    const table = await this.getTable();
    if (!table) return 0;
    return table.countRows();
  }

  // ── Public API — text (requires embedder) ─────────────────────

  /** Throws if no `Embedder` was provided at construction time. */
  private requireEmbedder(): Embedder {
    if (!this.embedder) {
      throw new Error(
        "VectorDB: an Embedder is required for text operations. " +
          'Pass one to the constructor: new VectorDB("name", new Embedder())',
      );
    }
    return this.embedder;
  }

  /**
   * Embed text records and insert them.
   *
   * Each record must have a `text` field; the embedder converts it
   * to a `vector` before storage. All other fields are kept as-is.
   */
  async insertText(records: TextRecord[]): Promise<void> {
    if (records.length === 0) return;
    const embedder = this.requireEmbedder();

    const texts = records.map((r) => r.text);
    const vectors = await embedder.embedBatch(texts);

    const vectorRecords: VectorRecord[] = records.map((r, i) => ({
      ...r,
      vector: vectors[i]!,
    }));

    await this.insert(vectorRecords);
  }

  /**
   * Embed a query string and perform nearest-neighbour search.
   *
   * @param query  Natural-language query text.
   * @param limit  Maximum number of results (default 10).
   */
  async searchText<T = Record<string, unknown>>(
    query: string,
    limit = 10,
  ): Promise<SearchResult<T>[]> {
    const embedder = this.requireEmbedder();
    const queryVector = await embedder.embed(query);
    return this.search<T>(queryVector, limit);
  }
}
