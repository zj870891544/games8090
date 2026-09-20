import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
export function testDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  for (const f of [
    "0001_initial.sql",
    "0002_search_and_taxonomy.sql",
    "0003_discovery_indexes.sql",
    "0004_sync_staging.sql",
    "0005_sync_staging_pages.sql",
  ])
    sqlite.exec(readFileSync(`migrations/${f}`, "utf8"));
  class Statement {
    constructor(
      private query: string,
      private values: unknown[] = [],
    ) {}
    bind(...values: unknown[]) {
      return new Statement(this.query, values);
    }
    async first(column?: string) {
      const row = sqlite
        .prepare(this.query)
        .get(...(this.values as (string | number | null)[]));
      return column ? (row?.[column] ?? null) : (row ?? null);
    }
    async all() {
      return {
        results: sqlite
          .prepare(this.query)
          .all(...(this.values as (string | number | null)[])),
        success: true,
        meta: {},
      };
    }
    async run() {
      const result = sqlite
        .prepare(this.query)
        .run(...(this.values as (string | number | null)[]));
      return {
        results: [],
        success: true,
        meta: { changes: Number(result.changes) },
      };
    }
  }
  const db = {
    prepare: (query: string) => new Statement(query),
    async batch(statements: Statement[]) {
      sqlite.exec("BEGIN");
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        sqlite.exec("COMMIT");
        return result;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
  return { db, sqlite, close: () => sqlite.close() };
}
