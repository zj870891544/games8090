import { afterEach, beforeEach, it, expect } from "vitest";
import { testDatabase } from "./database";
import {
  durableSync,
  type DurableSteps,
  type StepOutput,
} from "../lib/services/durable-sync";
import { createProvider } from "../lib/providers/adapters";
import type { GameProvider } from "../lib/types";
let database: ReturnType<typeof testDatabase>;
beforeEach(() => (database = testDatabase()));
afterEach(() => database.close());
function runner() {
  const names: string[] = [];
  const steps: DurableSteps = {
    do: async <T extends StepOutput>(
      name: string,
      callback: () => Promise<T>,
    ) => {
      names.push(name);
      return callback();
    },
  };
  return { names, steps };
}
it("stages pages before mutation and imports in resumable batches of 20", async () => {
  const base = createProvider("playgama", {
    APP_ENV: "local",
    PROVIDER_MODE: "fixture",
  });
  const sample = (await base.syncCatalog()).games[0];
  let calls = 0;
  const adapter = {
    ...base,
    id: base.id,
    validateConfig: () => base.validateConfig(),
    readCatalogPage: async (page: number) => {
      calls++;
      expect(
        database.sqlite.prepare("SELECT count(*) n FROM games").get()?.n,
      ).toBe(0);
      return {
        games: Array.from({ length: page === 3 ? 5 : 23 }, (_, i) => ({
          ...sample,
          providerGameId: `durable-${page}-${i}`,
          title: `Unique ${page}-${i}`,
          developer: `Studio ${page}-${i}`,
        })),
        complete: true,
        done: page === 3,
        mode: "fixture" as const,
      };
    },
  } as GameProvider;
  const { names, steps } = runner();
  expect(
    await durableSync(database.db, adapter, steps, "workflow-test"),
  ).toMatchObject({ status: "success", received: 51 });
  expect(calls).toBe(3);
  expect(names.filter((n) => n.startsWith("import-batch"))).toHaveLength(3);
  expect(database.sqlite.prepare("SELECT count(*) n FROM games").get()?.n).toBe(
    51,
  );
  expect(
    database.sqlite.prepare("SELECT count(*) n FROM sync_staging").get()?.n,
  ).toBe(0);
  expect(
    database.sqlite
      .prepare(
        "SELECT inserted,updated,status FROM sync_runs WHERE id='workflow-test'",
      )
      .get(),
  ).toMatchObject({ inserted: 51, updated: 0, status: "success" });
});
it("late page failure leaves the live catalog untouched and releases the lease", async () => {
  const base = createProvider("playgama", {
    APP_ENV: "local",
    PROVIDER_MODE: "fixture",
  });
  const sample = (await base.syncCatalog()).games[0];
  const adapter = {
    ...base,
    id: base.id,
    validateConfig: () => base.validateConfig(),
    readCatalogPage: async (page: number) => {
      if (page === 2) throw new Error("private token");
      return {
        games: [sample],
        complete: true,
        done: false,
        mode: "fixture" as const,
      };
    },
  } as GameProvider;
  const { steps } = runner();
  expect(
    await durableSync(database.db, adapter, steps, "workflow-failed"),
  ).toMatchObject({ status: "failed" });
  expect(database.sqlite.prepare("SELECT count(*) n FROM games").get()?.n).toBe(
    0,
  );
  expect(
    database.sqlite
      .prepare("SELECT sync_lock FROM providers WHERE id='playgama'")
      .get()?.sync_lock,
  ).toBe(null);
  expect(
    database.sqlite.prepare("SELECT count(*) n FROM sync_staging").get()?.n,
  ).toBe(0);
});
it("retrying the same import step cannot duplicate sources or counters", async () => {
  const adapter = createProvider("playgama", {
    APP_ENV: "local",
    PROVIDER_MODE: "fixture",
  });
  const steps: DurableSteps = {
    do: async <T extends StepOutput>(
      name: string,
      callback: () => Promise<T>,
    ) => {
      const result = await callback();
      if (name === "import-batch-0" || name === "commit-successful-snapshot")
        await callback();
      return result;
    },
  };
  expect(
    await durableSync(database.db, adapter, steps, "workflow-retry"),
  ).toMatchObject({ status: "success", received: 6 });
  expect(
    database.sqlite.prepare("SELECT count(*) n FROM game_sources").get()?.n,
  ).toBe(6);
  expect(
    database.sqlite
      .prepare("SELECT inserted FROM sync_runs WHERE id='workflow-retry'")
      .get()?.inserted,
  ).toBe(6);
});
