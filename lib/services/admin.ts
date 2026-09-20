import { categoryFromAdmin } from "../admin-language";
import { recomputeRankings } from "./ranking";
import { z } from "zod";
import {
  normalizeTitle,
  categorySlug,
  normalizeCategories,
} from "../normalize";
import { createProvider } from "../providers/adapters";
import { safeUrl, origins, defaultFrames } from "../providers/config";
import { providerIds, type ProviderId } from "../types";
import { mergeGames, syncProvider } from "./sync";
const bool = (v: FormDataEntryValue | null) => v === "on" || v === "true";
const id = z.string().min(1).max(200);
const priority = z.coerce.number().int().min(0).max(10000);
export async function adminMutation(
  action: string,
  form: FormData,
  env: CloudflareEnv,
) {
  const db = env.DB;
  const value = (name: string) => String(form.get(name) || "");
  if (action === "ranking") {
    await recomputeRankings(db);
    return {
      path: "/admin",
      message:
        "Discovery rankings refreshed from provider rank and local engagement.",
    };
  }
  if (action === "sync") {
    const provider = z.enum(providerIds).parse(value("provider"));
    if (env.CATALOG_SYNC || env.APP_ENV !== "local") {
      if (!env.CATALOG_SYNC)
        throw new Error("Background sync binding is missing.");
      const instance = await env.CATALOG_SYNC.create({
        params: { providerId: provider },
      });
      return {
        path: "/admin/sync",
        message: `Background sync queued (${instance.id}). Refresh this page for progress.`,
      };
    }
    const result = await syncProvider(db, createProvider(provider, env));
    return {
      path: "/admin/providers",
      message:
        result.status === "failed"
          ? "Sync failed. Review Sync Logs for configuration details."
          : `Sync ${result.status}: ${result.received} received, ${result.inserted} new sources, ${result.updated} updated.`,
    };
  }
  if (action === "provider") {
    const provider = z.enum(providerIds).parse(value("provider"));
    await db.batch([
      db
        .prepare("UPDATE providers SET enabled=?,priority=? WHERE id=?")
        .bind(
          +bool(form.get("enabled")),
          priority.parse(value("priority")),
          provider,
        ),
      db
        .prepare(
          "UPDATE provider_contract_config SET enabled=?,exclusivity=?,notes=? WHERE provider_id=?",
        )
        .bind(
          +bool(form.get("contractEnabled")),
          z.enum(["exclusive", "non_exclusive"]).parse(value("exclusivity")),
          z.string().max(2000).parse(value("notes")),
          provider,
        ),
    ]);
    return {
      path: "/admin/providers",
      message: "Provider configuration saved.",
    };
  }
  if (action === "game") {
    const gameId = id.parse(value("id"));
    const title = z.string().min(2).max(180).parse(value("title"));
    const description = z.string().max(12000).parse(value("description"));
    const editorial = z.string().max(12000).parse(value("editorial"));
    const controls = z.string().max(3000).parse(value("controls"));
    const how = z.string().max(6000).parse(value("howToPlay"));
    const status = z
      .enum(["published", "draft", "unavailable"])
      .parse(value("publishStatus"));
    const indexing = z.enum(["index", "noindex"]).parse(value("indexStatus"));
    const cats = normalizeCategories(
      value("categories")
        .split(/[,，]/)
        .map((s) => categoryFromAdmin(s.trim())),
    );
    const current = await db
      .prepare("SELECT is_fixture FROM games WHERE id=?")
      .bind(gameId)
      .first<{ is_fixture: number }>();
    if (!current) throw new Error("Game not found.");
    if (
      indexing === "index" &&
      (current.is_fixture ||
        editorial.trim().length < 120 ||
        !controls.trim() ||
        !how.trim() ||
        !cats.length ||
        status !== "published")
    )
      throw new Error(
        "Indexing requires a real published game, 120+ characters of editorial value, controls, instructions and categories.",
      );
    const statements = [
      db
        .prepare(
          "UPDATE games SET title=?,normalized_title=?,description=?,editorial_description=?,controls=?,how_to_play=?,publish_status=?,index_status=?,featured=?,editorial_locked=1,updated_at=? WHERE id=?",
        )
        .bind(
          title,
          normalizeTitle(title),
          description,
          editorial,
          controls,
          how,
          status,
          indexing,
          +bool(form.get("featured")),
          new Date().toISOString(),
          gameId,
        ),
      db.prepare("DELETE FROM game_categories WHERE game_id=?").bind(gameId),
    ];
    for (const c of cats)
      statements.push(
        db
          .prepare(
            "INSERT OR IGNORE INTO game_categories(game_id,category_id) VALUES (?,?)",
          )
          .bind(gameId, categorySlug(c)),
      );
    await db.batch(statements);
    return {
      path: `/admin/games?q=${encodeURIComponent(title)}`,
      message: "Game updated. Canonical URL preserved.",
    };
  }
  if (action === "source") {
    const sourceId = id.parse(value("id"));
    const source = await db
      .prepare(
        "SELECT provider_id,embed_url,metadata_json FROM game_sources WHERE id=?",
      )
      .bind(sourceId)
      .first<{
        provider_id: ProviderId;
        embed_url: string;
        metadata_json: string;
      }>();
    if (!source) throw new Error("Source not found.");
    const override = value("override").trim();
    if (override) {
      safeUrl(
        override,
        origins(env.PROVIDER_FRAME_ORIGINS, defaultFrames),
        JSON.parse(source.metadata_json).fixture === true,
      );
      if (!override.startsWith("/")) {
        const base = new URL(source.embed_url),
          target = new URL(override);
        const param =
          source.provider_id === "playgama"
            ? "clid"
            : source.provider_id === "gamepix"
              ? "sid"
              : source.provider_id === "wgplayground"
                ? env.WGPLAYGROUND_ATTRIBUTION_PARAM
                : undefined;
        if (
          param &&
          base.searchParams.has(param) &&
          target.searchParams.get(param) !== base.searchParams.get(param)
        )
          throw new Error(
            "Override must preserve the publisher attribution identifier.",
          );
      }
    }
    await db
      .prepare(
        "UPDATE game_sources SET manual_priority=?,manually_disabled=?,override_url=? WHERE id=?",
      )
      .bind(
        value("priority") === "" ? null : priority.parse(value("priority")),
        +bool(form.get("disabled")),
        override || null,
        sourceId,
      )
      .run();
    return {
      path: "/admin/games",
      message: "Source settings saved. Higher manual priority is preferred.",
    };
  }
  if (action === "dedupe") {
    const candidate = id.parse(value("id"));
    const decision = z
      .enum(["merge", "separate", "ignored"])
      .parse(value("decision"));
    const row = await db
      .prepare(
        "SELECT a.game_id AS target,b.game_id AS donor FROM dedupe_candidates d JOIN game_sources a ON a.id=d.source_a JOIN game_sources b ON b.id=d.source_b WHERE d.id=? AND d.status='pending'",
      )
      .bind(candidate)
      .first<{ target: string; donor: string }>();
    if (!row) throw new Error("Candidate has already been resolved.");
    if (decision === "merge")
      await mergeGames(db, row.target, row.donor, candidate);
    else
      await db
        .prepare("UPDATE dedupe_candidates SET status=? WHERE id=?")
        .bind(decision, candidate)
        .run();
    return {
      path: "/admin/dedupe",
      message:
        decision === "merge"
          ? "Merged sources into the left canonical game. Its URL is preserved."
          : "Review decision saved.",
    };
  }
  if (action === "curation") {
    const sectionId = id.parse(value("id"));
    const kind = z.enum(["auto", "manual"]).parse(value("kind"));
    const rule = z
      .string()
      .regex(/^(recent|popular|trending|new|quality|category:[a-z0-9-]+)$/)
      .parse(value("rule"));
    const title = z.string().min(1).max(100).parse(value("title"));
    const slugs = value("pins")
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (slugs.length > 30 || new Set(slugs).size !== slugs.length)
      throw new Error("Use up to 30 unique game slugs.");
    const pinIds: string[] = [];
    for (const slug of slugs) {
      const game = await db
        .prepare(
          "SELECT id FROM games WHERE slug=? AND publish_status='published'",
        )
        .bind(slug)
        .first<{ id: string }>();
      if (!game) throw new Error("A pinned slug is missing or not published.");
      pinIds.push(game.id);
    }
    const statements = [
      db
        .prepare(
          "UPDATE homepage_sections SET title=?,kind=?,rule=?,position=?,enabled=?,item_limit=? WHERE id=?",
        )
        .bind(
          title,
          kind,
          rule,
          priority.parse(value("position")),
          +bool(form.get("enabled")),
          z.coerce.number().int().min(1).max(24).parse(value("limit")),
          sectionId,
        ),
      db
        .prepare("DELETE FROM homepage_section_games WHERE section_id=?")
        .bind(sectionId),
    ];
    pinIds.forEach((gameId, index) =>
      statements.push(
        db
          .prepare(
            "INSERT INTO homepage_section_games(section_id,game_id,position) VALUES (?,?,?)",
          )
          .bind(sectionId, gameId, index),
      ),
    );
    await db.batch(statements);
    return { path: "/admin/curation", message: "Homepage section saved." };
  }
  if (action === "category") {
    await db
      .prepare("UPDATE categories SET indexable=? WHERE id=?")
      .bind(+bool(form.get("indexable")), id.parse(value("id")))
      .run();
    return {
      path: "/admin/seo",
      message:
        "Category indexing preference saved. Sitemap inclusion also requires indexable games.",
    };
  }
  if (action === "health") {
    const sourceId = id.parse(value("id"));
    const source = await db
      .prepare(
        "SELECT embed_url,override_url,metadata_json FROM game_sources WHERE id=?",
      )
      .bind(sourceId)
      .first<{
        embed_url: string;
        override_url: string | null;
        metadata_json: string;
      }>();
    if (!source) throw new Error("Source not found.");
    if (JSON.parse(source.metadata_json).fixture)
      throw new Error(
        "Reachability checks apply only to live provider sources.",
      );
    const url = safeUrl(
      source.override_url || source.embed_url,
      origins(env.PROVIDER_FRAME_ORIGINS, defaultFrames),
    );
    let status = 0;
    try {
      status = (
        await fetch(url, {
          method: "HEAD",
          redirect: "manual",
          signal: AbortSignal.timeout(10000),
        })
      ).status;
    } catch {}
    const now = new Date().toISOString();
    await db.batch([
      db
        .prepare(
          "INSERT INTO game_health(source_id,http_status,last_reachability_at,note) VALUES (?,?,?,'HTTP reachability only; not gameplay health.') ON CONFLICT(source_id) DO UPDATE SET http_status=excluded.http_status,last_reachability_at=excluded.last_reachability_at,note=excluded.note",
        )
        .bind(sourceId, status, now),
      db
        .prepare("UPDATE game_sources SET last_health_check_at=? WHERE id=?")
        .bind(now, sourceId),
    ]);
    return {
      path: "/admin/health",
      message: `HTTP ${status || "unreachable"}. This does not verify gameplay.`,
    };
  }
  throw new Error("Unknown action.");
}
