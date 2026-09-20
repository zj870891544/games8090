import { beforeEach, afterEach, it, expect } from "vitest";
import { testDatabase } from "./database";
import { createProvider } from "../lib/providers/adapters";
import { syncProvider, mergeGames } from "../lib/services/sync";
import { adminMutation } from "../lib/services/admin";
import { providerIds, type GameProvider } from "../lib/types";
let database: ReturnType<typeof testDatabase>;
beforeEach(() => {
  database = testDatabase();
});
afterEach(() => database.close());
const adapter = (id: (typeof providerIds)[number]) =>
  createProvider(id, { APP_ENV: "local", PROVIDER_MODE: "fixture" });
it("syncs four fixtures idempotently, produces 24 canonical games and 27 persistent sources", async () => {
  for (const id of providerIds)
    expect((await syncProvider(database.db, adapter(id))).status).toBe(
      "success",
    );
  expect(database.sqlite.prepare("SELECT count(*) n FROM games").get()?.n).toBe(
    24,
  );
  expect(
    database.sqlite.prepare("SELECT count(*) n FROM game_sources").get()?.n,
  ).toBe(27);
  const main = database.sqlite
    .prepare("SELECT id,index_status FROM games WHERE slug='neon-drift'")
    .get();
  expect(main?.index_status).toBe("noindex");
  expect(
    database.sqlite
      .prepare("SELECT count(*) n FROM game_sources WHERE game_id=?")
      .get(main!.id)?.n,
  ).toBe(3);
  const result = await syncProvider(database.db, adapter("playgama"));
  expect(result.inserted).toBe(0);
  expect(result.updated).toBe(6);
  expect(database.sqlite.prepare("SELECT count(*) n FROM games").get()?.n).toBe(
    24,
  );
});
it("creates a review candidate for identical titles with different developers", async () => {
  await syncProvider(database.db, adapter("playgama"));
  const candidates = database.sqlite
    .prepare("SELECT * FROM dedupe_candidates")
    .all();
  expect(candidates.length).toBe(1);
  expect(candidates[0].status).toBe("pending");
  expect(
    database.sqlite
      .prepare(
        "SELECT count(*) n FROM games WHERE normalized_title='neon drift'",
      )
      .get()?.n,
  ).toBe(2);
});
it("merges manually without losing sources, metrics or curated pins; preserves the target URL", async () => {
  await syncProvider(database.db, adapter("playgama"));
  const pair = database.sqlite
    .prepare(
      "SELECT d.id,a.game_id target,b.game_id donor FROM dedupe_candidates d JOIN game_sources a ON a.id=d.source_a JOIN game_sources b ON b.id=d.source_b",
    )
    .get()!;
  const oldSlug = database.sqlite
    .prepare("SELECT slug FROM games WHERE id=?")
    .get(pair.donor)!.slug;
  database.sqlite
    .prepare(
      "INSERT INTO game_metrics_daily(game_id,day,event,count) VALUES (?,'2026-09-20','game_start',4)",
    )
    .run(pair.donor);
  database.sqlite
    .prepare(
      "INSERT INTO homepage_section_games(section_id,game_id,position) VALUES ('trending',?,0)",
    )
    .run(pair.donor);
  await mergeGames(
    database.db,
    String(pair.target),
    String(pair.donor),
    String(pair.id),
  );
  expect(
    database.sqlite
      .prepare("SELECT count(*) n FROM game_sources WHERE game_id=?")
      .get(pair.target)?.n,
  ).toBe(2);
  expect(
    database.sqlite
      .prepare("SELECT game_id FROM game_redirects WHERE slug=?")
      .get(oldSlug)?.game_id,
  ).toBe(pair.target);
  expect(
    database.sqlite
      .prepare("SELECT count FROM game_metrics_daily WHERE game_id=?")
      .get(pair.target)?.count,
  ).toBe(4);
  expect(
    database.sqlite.prepare("SELECT game_id FROM homepage_section_games").get()
      ?.game_id,
  ).toBe(pair.target);
  expect(
    database.sqlite
      .prepare("SELECT count(*) n FROM games_fts WHERE games_fts MATCH 'neon'")
      .get()?.n,
  ).toBe(1);
});
it("only deactivates disappeared sources after three complete nonempty successful sync cycles", async () => {
  const provider = adapter("playgama");
  await syncProvider(database.db, provider);
  const catalog = await provider.syncCatalog();
  const missing = catalog.games.pop()!;
  database.sqlite
    .prepare("UPDATE game_sources SET last_seen_at='2000-01-01'")
    .run();
  const partial = {
    ...provider,
    id: provider.id,
    syncCatalog: async () => ({ ...catalog, complete: false }),
    validateConfig: () => provider.validateConfig(),
  } as GameProvider;
  await syncProvider(database.db, partial);
  const source = () =>
    database.sqlite
      .prepare(
        "SELECT is_active,missing_cycles FROM game_sources WHERE provider_game_id=?",
      )
      .get(missing.providerGameId)!;
  expect(source().missing_cycles).toBe(0);
  const full = {
    ...partial,
    syncCatalog: async () => ({ ...catalog, complete: true }),
  };
  for (let i = 0; i < 2; i++) await syncProvider(database.db, full);
  expect(source()).toMatchObject({ is_active: 1, missing_cycles: 2 });
  await syncProvider(database.db, full);
  expect(source()).toMatchObject({ is_active: 0, missing_cycles: 3 });
  await syncProvider(database.db, provider);
  expect(source()).toMatchObject({ is_active: 1, missing_cycles: 0 });
});
it("failed sync preserves sources, releases lock, and records sanitized diagnostics", async () => {
  const provider = adapter("playgama");
  await syncProvider(database.db, provider);
  const failure = {
    ...provider,
    id: provider.id,
    validateConfig: () => provider.validateConfig(),
    syncCatalog: async () => {
      throw new Error("secret token=do-not-log");
    },
  } as unknown as GameProvider;
  expect((await syncProvider(database.db, failure)).status).toBe("failed");
  expect(
    database.sqlite
      .prepare("SELECT max(missing_cycles) n FROM game_sources")
      .get()?.n,
  ).toBe(0);
  expect(
    database.sqlite
      .prepare("SELECT sync_lock FROM providers WHERE id=?")
      .get(provider.id)?.sync_lock,
  ).toBe(null);
  expect(
    JSON.stringify(
      database.sqlite
        .prepare("SELECT * FROM sync_runs WHERE status='failed'")
        .all(),
    ),
  ).not.toContain("do-not-log");
});
it("FTS indexes title, studio, categories and tags; triggers follow metadata edits", async () => {
  await syncProvider(database.db, adapter("playgama"));
  const lookup = (q: string) =>
    database.sqlite
      .prepare("SELECT title FROM games_fts WHERE games_fts MATCH ?")
      .all(q);
  expect(lookup('"neon"*').length).toBe(2);
  expect(lookup('"Mint"*').length).toBeGreaterThan(0);
  expect(lookup('"Racing"*').length).toBeGreaterThan(0);
  expect(lookup('"quick"*').length).toBe(6);
  database.sqlite
    .prepare(
      "UPDATE games SET title='Updated Racer',tags='testtoken' WHERE slug='neon-drift'",
    )
    .run();
  expect(lookup('"testtoken"').length).toBe(1);
});
it("manual source disable and ordering survive future syncs", async () => {
  const provider = adapter("playgama");
  await syncProvider(database.db, provider);
  database.sqlite
    .prepare(
      "UPDATE game_sources SET manually_disabled=1,manual_priority=999,override_url='/fixtures/player?game=neon-drift&source=playgama' WHERE provider_game_id='demo-1'",
    )
    .run();
  await syncProvider(database.db, provider);
  expect(
    database.sqlite
      .prepare(
        "SELECT manually_disabled,manual_priority,override_url FROM game_sources WHERE provider_game_id='demo-1'",
      )
      .get(),
  ).toMatchObject({
    manually_disabled: 1,
    manual_priority: 999,
    override_url: "/fixtures/player?game=neon-drift&source=playgama",
  });
});
it("rejects fixture SEO promotion and preserves the current game", async () => {
  await syncProvider(database.db, adapter("playgama"));
  const game = database.sqlite
    .prepare("SELECT id FROM games WHERE slug='neon-drift'")
    .get()!;
  const form = new FormData();
  for (const [key, value] of Object.entries({
    id: String(game.id),
    title: "Neon Drift",
    description: "Description",
    editorial: "A".repeat(150),
    controls: "Arrows",
    howToPlay: "Drive",
    publishStatus: "published",
    indexStatus: "index",
    categories: "Racing",
  }))
    form.set(key, value);
  await expect(
    adminMutation("game", form, { DB: database.db } as CloudflareEnv),
  ).rejects.toThrow("Indexing requires");
  expect(
    database.sqlite
      .prepare("SELECT index_status FROM games WHERE id=?")
      .get(game.id)?.index_status,
  ).toBe("noindex");
});

it("rankings combine observed engagement with provider percentiles", async () => {
  await syncProvider(database.db, adapter("playgama"));
  const game = database.sqlite
    .prepare("SELECT id,trending_score FROM games WHERE slug='cosmic-rally'")
    .get()!;
  database.sqlite
    .prepare(
      "INSERT INTO game_metrics_daily(game_id,day,event,count) VALUES (?,?,'game_start',100)",
    )
    .run(game.id, new Date().toISOString().slice(0, 10));
  const { recomputeRankings } = await import("../lib/services/ranking");
  await recomputeRankings(database.db);
  expect(
    Number(
      database.sqlite
        .prepare("SELECT trending_score FROM games WHERE id=?")
        .get(game.id)?.trending_score,
    ),
  ).toBeGreaterThan(Number(game.trending_score));
});
