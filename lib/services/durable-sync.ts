import type { GameProvider, NormalizedProviderGame } from "../types";
import { upsertProviderGame } from "./sync";
import { recomputeRankings } from "./ranking";
import { providerDiagnostic } from "../providers/diagnostics";
/** Compatible with Cloudflare WorkflowStep and a deterministic test step runner. */
export type StepOutput =
  | string
  | number
  | boolean
  | null
  | {
      count: number;
      complete: boolean;
      mode: "fixture" | "live";
      done: boolean;
    };
export interface DurableSteps {
  do<T extends StepOutput>(
    name: string,
    callback: () => Promise<T>,
  ): Promise<T>;
}
const lease = () => new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
export async function durableSync(
  db: D1Database,
  adapter: GameProvider,
  step: DurableSteps,
  runId: string,
) {
  const started = await step.do("acquire-provider-lease", async () => {
    const now = new Date().toISOString();
    const lock = await db
      .prepare(
        "UPDATE providers SET sync_lock=?,lock_until=? WHERE id=? AND enabled=1 AND (sync_lock IS NULL OR lock_until<? OR sync_lock=?)",
      )
      .bind(runId, lease(), adapter.id, now, runId)
      .run();
    if (!lock.meta.changes) return null;
    await db
      .prepare(
        "UPDATE sync_runs SET status='failed',finished_at=?,errors=1,error_summary='Lease expired before completion; next sync can resume source upserts.' WHERE provider_id=? AND status='running' AND id!=?",
      )
      .bind(now, adapter.id, runId)
      .run();
    await db
      .prepare(
        "INSERT OR IGNORE INTO sync_runs(id,provider_id,status,mode,started_at) VALUES (?,?,'running',?,?)",
      )
      .bind(runId, adapter.id, adapter.validateConfig().mode, now)
      .run();
    return (await db
      .prepare("SELECT started_at FROM sync_runs WHERE id=?")
      .bind(runId)
      .first<{ started_at: string }>())!.started_at;
  });
  if (!started) return { status: "skipped", received: 0 };
  try {
    let catalogInfo = {
      count: 0,
      complete: false,
      mode: "live" as "live" | "fixture",
      done: false,
    };
    for (let page = 1; page <= 500; page++) {
      const info = await step.do(
        `validate-and-stage-page-${page}`,
        async () => {
          const catalog = await (async () => {
            try {
              return adapter.readCatalogPage
                ? await adapter.readCatalogPage(page)
                : { ...(await adapter.syncCatalog()), done: true };
            } catch (error) {
              await db
                .prepare("UPDATE sync_runs SET error_summary=? WHERE id=?")
                .bind(providerDiagnostic(error), runId)
                .run();
              throw error;
            }
          })();
          await db
            .prepare("DELETE FROM sync_staging WHERE sync_id=? AND page=?")
            .bind(runId, page)
            .run();
          let chunk: { game: NormalizedProviderGame; percentile: number }[] =
            [];
          let bytes = 2;
          const flush = async () => {
            if (!chunk.length) return;
            await db
              .prepare(
                `INSERT INTO sync_staging(sync_id,provider_game_id,payload,percentile,is_new,page)
     SELECT ?,json_extract(value,'$.game.providerGameId'),json_extract(value,'$.game'),json_extract(value,'$.percentile'),
     CASE WHEN EXISTS(SELECT 1 FROM game_sources WHERE provider_id=? AND provider_game_id=json_extract(value,'$.game.providerGameId')) THEN 0 ELSE 1 END,?
     FROM json_each(?)`,
              )
              .bind(runId, adapter.id, page, JSON.stringify(chunk))
              .run();
            chunk = [];
            bytes = 2;
          };
          for (const game of catalog.games) {
            const row = { game, percentile: game.rank };
            const size = new TextEncoder().encode(JSON.stringify(row)).length;
            if (bytes + size > 700000) await flush();
            chunk.push(row);
            bytes += size + 1;
          }
          await flush();
          await db
            .prepare(
              "UPDATE providers SET lock_until=? WHERE id=? AND sync_lock=?",
            )
            .bind(lease(), adapter.id, runId)
            .run();
          return {
            count: catalog.games.length,
            complete: catalog.complete,
            mode: catalog.mode,
            done: catalog.done,
          };
        },
      );
      catalogInfo = { ...info, count: catalogInfo.count + info.count };
      if (catalogInfo.count > 50000)
        throw new Error("Catalog record cap exceeded");
      if (info.done) break;
    }
    if (!catalogInfo.done) throw new Error("Catalog pagination did not finish");
    await step.do("rank-staged-catalog", async () => {
      await db.batch([
        db
          .prepare(
            `WITH ranked AS (SELECT provider_game_id,1.0-(row_number() OVER (ORDER BY percentile DESC,provider_game_id)-1.0)/count(*) OVER () AS score FROM sync_staging WHERE sync_id=?) UPDATE sync_staging SET percentile=(SELECT score FROM ranked WHERE ranked.provider_game_id=sync_staging.provider_game_id) WHERE sync_id=?`,
          )
          .bind(runId, runId),
        db
          .prepare("UPDATE sync_runs SET received=? WHERE id=?")
          .bind(catalogInfo.count, runId),
      ]);
      return true;
    });
    // Each resumable step handles at most 20 sources; no full feed is stored in
    // Workflow step results. Upserts and the staging marker make retries safe.
    for (let batch = 0; batch < Math.ceil(catalogInfo.count / 20); batch++) {
      await step.do(`import-batch-${batch}`, async () => {
        const rows = await db
          .prepare(
            "SELECT provider_game_id,payload,percentile FROM sync_staging WHERE sync_id=? ORDER BY provider_game_id LIMIT 20 OFFSET ?",
          )
          .bind(runId, batch * 20)
          .all<{
            provider_game_id: string;
            payload: string;
            percentile: number;
          }>();
        const lock = await db
          .prepare(
            "UPDATE providers SET lock_until=? WHERE id=? AND sync_lock=?",
          )
          .bind(lease(), adapter.id, runId)
          .run();
        if (!lock.meta.changes) throw new Error("Sync lease lost");
        for (const row of rows.results) {
          await upsertProviderGame(
            db,
            JSON.parse(row.payload) as NormalizedProviderGame,
            started,
            row.percentile,
          );
          await db
            .prepare(
              "UPDATE sync_staging SET imported=1 WHERE sync_id=? AND provider_game_id=?",
            )
            .bind(runId, row.provider_game_id)
            .run();
        }
        await db
          .prepare(
            "UPDATE sync_runs SET inserted=(SELECT count(*) FROM sync_staging WHERE sync_id=? AND imported=1 AND is_new=1),updated=(SELECT count(*) FROM sync_staging WHERE sync_id=? AND imported=1 AND is_new=0) WHERE id=?",
          )
          .bind(runId, runId, runId)
          .run();
        return rows.results.length;
      });
    }
    await step.do("refresh-rankings", async () => {
      await recomputeRankings(db);
      return true;
    });
    await step.do("commit-successful-snapshot", async () => {
      const previous = await db
        .prepare("SELECT status FROM sync_runs WHERE id=?")
        .bind(runId)
        .first<{ status: string }>();
      if (previous?.status === "success" || previous?.status === "partial")
        return true;

      const pending = await db
        .prepare(
          "SELECT count(*) AS n FROM sync_staging WHERE sync_id=? AND imported=0",
        )
        .bind(runId)
        .first<{ n: number }>();
      if (pending?.n) throw new Error("Staged sources remain unprocessed");
      const lock = await db
        .prepare("SELECT sync_lock FROM providers WHERE id=?")
        .bind(adapter.id)
        .first<{ sync_lock: string | null }>();
      if (lock?.sync_lock !== runId) throw new Error("Sync lease lost");
      const statements: D1PreparedStatement[] = [];
      let missing = 0;
      if (catalogInfo.complete && catalogInfo.count > 0) {
        missing =
          (
            await db
              .prepare(
                "SELECT count(*) n FROM game_sources WHERE provider_id=? AND last_seen_at<? AND json_extract(metadata_json,'$.fixture')=?",
              )
              .bind(adapter.id, started, +(catalogInfo.mode === "fixture"))
              .first<{ n: number }>()
          )?.n || 0;
        statements.push(
          db
            .prepare(
              "UPDATE game_sources SET missing_cycles=missing_cycles+1,is_active=CASE WHEN missing_cycles+1>=3 THEN 0 ELSE is_active END WHERE provider_id=? AND last_seen_at<? AND json_extract(metadata_json,'$.fixture')=? AND EXISTS(SELECT 1 FROM sync_runs WHERE id=? AND status='running')",
            )
            .bind(
              adapter.id,
              started,
              +(catalogInfo.mode === "fixture"),
              runId,
            ),
        );
      }
      const now = new Date().toISOString();
      statements.push(
        db
          .prepare(
            "UPDATE sync_runs SET status=?,finished_at=?,missing=?,errors=0,error_summary=NULL WHERE id=?",
          )
          .bind(
            catalogInfo.complete ? "success" : "partial",
            now,
            missing,
            runId,
          ),
        db
          .prepare(
            "UPDATE providers SET last_sync_at=?,sync_lock=NULL,lock_until=NULL WHERE id=? AND sync_lock=?",
          )
          .bind(now, adapter.id, runId),
        db.prepare("DELETE FROM sync_staging WHERE sync_id=?").bind(runId),
      );
      await db.batch(statements);
      return true;
    });
    return {
      status: catalogInfo.complete ? "success" : "partial",
      received: catalogInfo.count,
    };
  } catch {
    await step.do("record-failure-and-release-lease", async () => {
      await db.batch([
        db
          .prepare(
            "UPDATE sync_runs SET status='failed',finished_at=?,errors=1,error_summary=COALESCE(error_summary,'Background sync failed after retries. Check feed mappings, origins and account configuration; successful source upserts are retained.') WHERE id=?",
          )
          .bind(new Date().toISOString(), runId),
        db
          .prepare(
            "UPDATE providers SET sync_lock=NULL,lock_until=NULL WHERE id=? AND sync_lock=?",
          )
          .bind(adapter.id, runId),
        db.prepare("DELETE FROM sync_staging WHERE sync_id=?").bind(runId),
      ]);
      return true;
    });
    return { status: "failed", received: 0 };
  }
}
