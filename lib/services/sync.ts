import { recomputeRankings } from "./ranking";
import {
  dedupeConfidence,
  normalizeTitle,
  slugify,
  categorySlug,
} from "../normalize";
import type { GameProvider, NormalizedProviderGame } from "../types";
interface ExistingGame {
  id: string;
  title: string;
  developer: string | null;
  description: string;
  slug: string;
  is_fixture: number;
  editorial_locked: number;
}
interface ExistingSource {
  id: string;
  game_id: string;
  metadata_json: string;
}
export async function upsertProviderGame(
  db: D1Database,
  item: NormalizedProviderGame,
  now: string,
  rank: number,
): Promise<"inserted" | "updated"> {
  const sourceId = `${item.providerId}:${item.providerGameId}`;
  const existing = await db
    .prepare(
      "SELECT id,game_id,metadata_json FROM game_sources WHERE provider_id=? AND provider_game_id=?",
    )
    .bind(item.providerId, item.providerGameId)
    .first<ExistingSource>();
  let gameId = existing?.game_id;
  const pending: { sourceId: string; confidence: number; reason: string }[] =
    [];
  const statements: D1PreparedStatement[] = [];
  if (!gameId) {
    const title = normalizeTitle(item.title);
    const first = title.split(" ")[0];
    const matches = (
      await db
        .prepare(
          "SELECT id,title,developer,description,slug,is_fixture,editorial_locked FROM games WHERE is_fixture=? AND (normalized_title=? OR normalized_title LIKE ?) LIMIT 100",
        )
        .bind(Number(item.fixture), title, `${first}%`)
        .all<ExistingGame>()
    ).results;
    const scored = matches.map((g) => ({
      g,
      result: dedupeConfidence(item, g),
    }));
    const automatic = scored.filter((x) => x.result.autoMerge);
    // Ambiguous multiple matches require a human decision.
    if (automatic.length === 1) gameId = automatic[0].g.id;
    for (const { g, result } of scored)
      if (result.candidate && g.id !== gameId) {
        const source = await db
          .prepare(
            "SELECT id FROM game_sources WHERE game_id=? ORDER BY id LIMIT 1",
          )
          .bind(g.id)
          .first<{ id: string }>();
        if (source)
          pending.push({
            sourceId: source.id,
            confidence: result.confidence,
            reason: result.reason,
          });
      }
    if (!gameId) {
      gameId = crypto.randomUUID();
      let slug = slugify(item.title);
      const conflict = await db
        .prepare(
          "SELECT id FROM games WHERE slug=? UNION SELECT game_id as id FROM game_redirects WHERE slug=?",
        )
        .bind(slug, slug)
        .first();
      if (conflict) slug += `-${gameId.slice(0, 8)}`;
      statements.push(
        db
          .prepare(
            `INSERT INTO games (id,slug,title,normalized_title,description,developer,orientation,supports_mobile,supports_desktop,supports_touch,supports_keyboard,supports_gamepad,is_multiplayer,quality_score,trending_score,popularity_score,publish_status,index_status,tags,controls,how_to_play,is_fixture,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'published','noindex',?,?,?,?,?,?)`,
          )
          .bind(
            gameId,
            slug,
            item.title,
            title,
            item.description,
            item.developer,
            item.orientation,
            +item.supportsMobile,
            +item.supportsDesktop,
            +item.supportsTouch,
            +item.supportsKeyboard,
            +item.supportsGamepad,
            +item.isMultiplayer,
            rank,
            rank,
            rank,
            item.tags.join(" "),
            item.controls,
            item.howToPlay,
            +item.fixture,
            now,
            now,
          ),
      );
    }
  }
  statements.push(
    db
      .prepare(
        `INSERT INTO game_sources (id,game_id,provider_id,provider_game_id,embed_url,source_url,thumbnail_url,source_title,source_description,source_developer,width,height,orientation,provider_rank,last_seen_at,metadata_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(provider_id,provider_game_id) DO UPDATE SET embed_url=excluded.embed_url,source_url=excluded.source_url,thumbnail_url=excluded.thumbnail_url,source_title=excluded.source_title,source_description=excluded.source_description,source_developer=excluded.source_developer,width=excluded.width,height=excluded.height,orientation=excluded.orientation,provider_rank=excluded.provider_rank,last_seen_at=excluded.last_seen_at,metadata_json=excluded.metadata_json,is_active=1,missing_cycles=0`,
      )
      .bind(
        sourceId,
        gameId,
        item.providerId,
        item.providerGameId,
        item.embedUrl,
        item.sourceUrl,
        item.thumbnail,
        item.title,
        item.description,
        item.developer,
        item.width,
        item.height,
        item.orientation,
        rank,
        now,
        JSON.stringify(item.metadata),
      ),
  );
  // Enrich device capabilities without overwriting manual editorial decisions.
  statements.push(
    db
      .prepare(
        `UPDATE games SET supports_mobile=max(supports_mobile,?),supports_desktop=max(supports_desktop,?),supports_touch=max(supports_touch,?),supports_keyboard=max(supports_keyboard,?),is_multiplayer=max(is_multiplayer,?),quality_score=max(quality_score,?),updated_at=? WHERE id=? AND editorial_locked=0`,
      )
      .bind(
        +item.supportsMobile,
        +item.supportsDesktop,
        +item.supportsTouch,
        +item.supportsKeyboard,
        +item.isMultiplayer,
        rank,
        now,
        gameId,
      ),
  );
  for (const cat of item.categories)
    statements.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO game_categories(game_id,category_id) SELECT ?,? WHERE EXISTS(SELECT 1 FROM categories WHERE id=?) AND EXISTS(SELECT 1 FROM games WHERE id=? AND editorial_locked=0)",
        )
        .bind(gameId, categorySlug(cat), categorySlug(cat), gameId),
    );
  statements.push(
    db
      .prepare(
        "INSERT INTO game_health(source_id,last_discovery_at) VALUES (?,?) ON CONFLICT(source_id) DO UPDATE SET last_discovery_at=excluded.last_discovery_at",
      )
      .bind(sourceId, now),
  );
  for (const p of pending) {
    const pair = [p.sourceId, sourceId].sort();
    statements.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO dedupe_candidates(id,source_a,source_b,confidence,reason,created_at) VALUES (?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          pair[0],
          pair[1],
          p.confidence,
          p.reason,
          now,
        ),
    );
  }
  await db.batch(statements);
  return existing ? "updated" : "inserted";
}
export async function syncProvider(db: D1Database, adapter: GameProvider) {
  const id = crypto.randomUUID(),
    start = new Date().toISOString(),
    until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const lock = await db
    .prepare(
      "UPDATE providers SET sync_lock=?,lock_until=? WHERE id=? AND enabled=1 AND (sync_lock IS NULL OR lock_until<?)",
    )
    .bind(id, until, adapter.id, start)
    .run();
  if (!lock.meta.changes)
    throw new Error("Provider is disabled or a sync is already running");
  let inserted = 0,
    updated = 0,
    missing = 0,
    received = 0;
  await db
    .prepare(
      "UPDATE sync_runs SET status='failed',finished_at=?,errors=1,error_summary='Previous sync exceeded its lease; review before retrying.' WHERE provider_id=? AND status='running'",
    )
    .bind(start, adapter.id)
    .run();
  await db
    .prepare(
      "INSERT INTO sync_runs(id,provider_id,status,mode,started_at) VALUES (?,?,?, ?,?)",
    )
    .bind(id, adapter.id, "running", adapter.validateConfig().mode, start)
    .run();
  try {
    const catalog = await adapter.syncCatalog();
    received = catalog.games.length;
    const ranked = [...catalog.games].sort((a, b) => b.rank - a.rank);
    const ranks = new Map(
      ranked.map((g, i) => [
        g.providerGameId,
        1 - i / Math.max(1, ranked.length),
      ]),
    );
    for (const item of catalog.games) {
      const action = await upsertProviderGame(
        db,
        item,
        start,
        ranks.get(item.providerGameId) || 0,
      );
      if (action === "inserted") inserted++;
      else updated++;
    }
    await recomputeRankings(db);
    const finalization: D1PreparedStatement[] = [];
    // Empty and filtered feeds are never proof of catalog-wide removals.
    // Commit disappearance and the successful run together, so a failed
    // finalization cannot leave inactive sources behind a failed sync log.
    if (catalog.complete && received > 0) {
      const count = await db
        .prepare(
          "SELECT count(*) AS n FROM game_sources WHERE provider_id=? AND last_seen_at<? AND json_extract(metadata_json,'$.fixture')=?",
        )
        .bind(adapter.id, start, +(catalog.mode === "fixture"))
        .first<{ n: number }>();
      missing = count?.n || 0;
      finalization.push(
        db
          .prepare(
            `UPDATE game_sources SET missing_cycles=missing_cycles+1,is_active=CASE WHEN missing_cycles+1>=3 THEN 0 ELSE is_active END WHERE provider_id=? AND last_seen_at<? AND json_extract(metadata_json,'$.fixture')=?`,
          )
          .bind(adapter.id, start, +(catalog.mode === "fixture")),
      );
    }
    const finished = new Date().toISOString();
    await db.batch([
      ...finalization,
      db
        .prepare(
          "UPDATE sync_runs SET status=?,finished_at=?,received=?,inserted=?,updated=?,missing=? WHERE id=?",
        )
        .bind(
          catalog.complete ? "success" : "partial",
          finished,
          received,
          inserted,
          updated,
          missing,
          id,
        ),
      db
        .prepare("UPDATE providers SET last_sync_at=? WHERE id=?")
        .bind(finished, adapter.id),
    ]);
    return {
      id,
      received,
      inserted,
      updated,
      missing,
      status: catalog.complete ? "success" : "partial",
    };
  } catch (error) {
    const summary = error instanceof Error ? error.message : "Sync failed";
    const safe =
      summary.startsWith("Missing configuration:") ||
      summary.startsWith("Provider returned HTTP")
        ? summary
        : "Feed validation or import failed. Check mappings, permitted origins, attribution, and catalog completeness.";
    await db
      .prepare(
        "UPDATE sync_runs SET status='failed',finished_at=?,received=?,inserted=?,updated=?,errors=1,error_summary=? WHERE id=?",
      )
      .bind(new Date().toISOString(), received, inserted, updated, safe, id)
      .run();
    return { id, received, inserted, updated, missing: 0, status: "failed" };
  } finally {
    await db
      .prepare(
        "UPDATE providers SET sync_lock=NULL,lock_until=NULL WHERE id=? AND sync_lock=?",
      )
      .bind(adapter.id, id)
      .run();
  }
}
export async function mergeGames(
  db: D1Database,
  targetId: string,
  donorId: string,
  candidateId: string,
) {
  if (targetId === donorId)
    throw new Error("Games already share a canonical identity");
  const donor = await db
    .prepare("SELECT slug FROM games WHERE id=?")
    .bind(donorId)
    .first<{ slug: string }>();
  const target = await db
    .prepare("SELECT id FROM games WHERE id=?")
    .bind(targetId)
    .first();
  if (!donor || !target) throw new Error("Game no longer exists");
  await db.batch([
    db
      .prepare(
        "INSERT OR REPLACE INTO game_redirects(slug,game_id) VALUES (?,?)",
      )
      .bind(donor.slug, targetId),
    db
      .prepare("UPDATE game_redirects SET game_id=? WHERE game_id=?")
      .bind(targetId, donorId),
    db
      .prepare("UPDATE game_sources SET game_id=? WHERE game_id=?")
      .bind(targetId, donorId),
    db
      .prepare(
        "INSERT OR IGNORE INTO game_categories(game_id,category_id) SELECT ?,category_id FROM game_categories WHERE game_id=?",
      )
      .bind(targetId, donorId),
    db
      .prepare(
        "INSERT OR IGNORE INTO homepage_section_games(section_id,game_id,position) SELECT section_id,?,position FROM homepage_section_games WHERE game_id=?",
      )
      .bind(targetId, donorId),
    db
      .prepare(
        "INSERT INTO game_metrics_daily(game_id,day,event,count,active_seconds) SELECT ?,day,event,count,active_seconds FROM game_metrics_daily WHERE game_id=? ON CONFLICT(game_id,day,event) DO UPDATE SET count=count+excluded.count,active_seconds=active_seconds+excluded.active_seconds",
      )
      .bind(targetId, donorId),
    db.prepare("DELETE FROM game_metrics_daily WHERE game_id=?").bind(donorId),
    db
      .prepare(
        "UPDATE dedupe_candidates SET status=? WHERE id=? OR (source_a IN (SELECT id FROM game_sources WHERE game_id=?) AND source_b IN (SELECT id FROM game_sources WHERE game_id=?))",
      )
      .bind("merged", candidateId, targetId, targetId),
    db.prepare("DELETE FROM games WHERE id=?").bind(donorId),
  ]);
}
