import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import {
  getTableColumns,
  getTableName,
  type Table,
  type InferSelectModel,
} from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { selectSources } from "../lib/source-selection";
import { createProvider } from "../lib/providers/adapters";
import { providerIds, type GameCardData, type ProviderId } from "../lib/types";
import { queryCatalog, type CatalogEntry } from "../lib/static-catalog";
import { siteIntegrations } from "../lib/site-integrations";
import type { PublishedSnapshot } from "../static/snapshot";
import { publicGame, playableSources } from "../static/public-data";

import { spotlightSlugs } from "../lib/home-spotlight";

const config = JSON.parse(
  (await readFile("wrangler.jsonc", "utf8")).replace(/,\s*([}\]])/g, "$1"),
);
const production = config.env.production;
const env = production.vars as CloudflareEnv;
const { token } = JSON.parse(
  execFileSync("node_modules/.bin/wrangler", ["auth", "token", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.account_id}/d1/database/${production.d1_databases[0].database_id}/query`;
async function query(sql: string): Promise<Record<string, unknown>[]> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });
  const body = (await response.json()) as {
    success: boolean;
    result: { success: boolean; results: Record<string, unknown>[] }[];
  };
  if (!response.ok || !body.success || !body.result?.[0]?.success)
    throw new Error(
      `Production catalog read failed (${response.status}); no snapshot was written.`,
    );
  return body.result[0].results;
}
async function table<T extends Table>(
  table: T,
  where = "",
): Promise<InferSelectModel<T>[]> {
  const columns = getTableColumns(table);
  const rows = await query(
    `SELECT ${Object.entries(columns)
      .map(([key, col]) => `"${col.name}" AS "${key}"`)
      .join(",")} FROM "${getTableName(table)}" ${where}`,
  );
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(columns).map(([key, column]) => [
        key,
        row[key] === null ? null : column.mapFromDriverValue(row[key]),
      ]),
    ),
  ) as InferSelectModel<T>[];
}
const games = await table(
  schema.games,
  "WHERE publish_status='published' AND is_fixture=0",
);
if (!games.length) throw new Error("Refusing to publish an empty catalog.");
const sources = await table(schema.gameSources);
const providers = await table(schema.providers);
const contracts = await table(schema.providerContractConfig);
const categories = await table(schema.categories);
const relations = await table(schema.gameCategories);
const sections = await table(
  schema.homepageSections,
  "WHERE enabled=1 ORDER BY position",
);
const pins = await table(schema.homepageSectionGames, "ORDER BY position");
const redirects = await table(schema.gameRedirects);
const plays = await query(
  "SELECT game_id AS id, sum(count) AS total FROM game_metrics_daily WHERE event='game_start' GROUP BY game_id",
);
const catalog: CatalogEntry[] = games.map((g) => {
  const card: GameCardData = {
    id: g.id,
    slug: g.slug,
    title: g.title,
    supportsMobile: g.supportsMobile,
    isMultiplayer: g.isMultiplayer,
    isFixture: false,
    featured: g.featured,
    thumbnail:
      sources
        .filter((s) => s.gameId === g.id)
        .sort(
          (a, b) =>
            Number(b.isActive) - Number(a.isActive) || b.priority - a.priority,
        )[0]?.thumbnailUrl || "/art/fallback.svg",
    categories: relations
      .filter((r) => r.gameId === g.id)
      .map((r) => r.categoryId)
      .sort(
        (a, b) =>
          Number(["arcade", "casual"].includes(a)) -
          Number(["arcade", "casual"].includes(b)),
      ),
    badge: g.isMultiplayer
      ? "Multiplayer"
      : g.featured
        ? "Hot"
        : Date.now() - Date.parse(g.createdAt) < 604800000
          ? "New"
          : undefined,
  };
  return {
    card,
    search: [g.title, g.description, g.tags, g.developer, ...card.categories]
      .filter(Boolean)
      .join(" "),
    createdAt: g.createdAt,
    popularity: g.popularityScore,
    quality: g.qualityScore,
    trending: g.trendingScore,
  };
});
const cards = queryCatalog(catalog);
const snapshot: PublishedSnapshot = {
  generatedAt: new Date().toISOString(),
  siteUrl: env.SITE_URL,
  ...siteIntegrations(env),
  email: env.CONTACT_EMAIL || "",
  catalog,
  categories,
  redirects: redirects.flatMap((r) => {
    const game = games.find((g) => g.id === r.gameId);
    return game && r.slug !== game.slug
      ? [{ from: `/game/${r.slug}`, to: `/game/${game.slug}` }]
      : [];
  }),
  home: {
    games: queryCatalog(catalog, { sort: "quality" }).slice(0, 24),
    picks: cards.filter((c) => spotlightSlugs.includes(c.slug)),
    count: games.length,
    curated: sections
      .filter((s) => s.rule !== "recent")
      .map((section) => {
        const pinned = pins
          .filter((p) => p.sectionId === section.id)
          .flatMap((p) => cards.filter((c) => c.id === p.gameId));
        const automatic =
          section.kind === "manual"
            ? []
            : queryCatalog(catalog, {
                sort: section.rule,
                category: section.rule.startsWith("category:")
                  ? section.rule.slice(9)
                  : undefined,
              });
        return {
          section,
          games: [
            ...pinned,
            ...automatic.filter((c) => !pinned.some((p) => p.id === c.id)),
          ].slice(0, section.limit),
        };
      }),
  },
  games: games.map((g) => {
    const card = cards.find((c) => c.id === g.id)!;
    const selected = playableSources(
      selectSources(
        sources.filter((s) => s.gameId === g.id),
        providers,
        contracts,
      ).flatMap((s) => {
        if (!providerIds.includes(s.providerId as ProviderId)) return [];
        try {
          return [
            createProvider(s.providerId as ProviderId, env).getEmbedConfig(s),
          ];
        } catch {
          return [];
        }
      }),
    );
    return {
      indexable: g.indexStatus === "index",
      props: {
        game: publicGame({
          ...g,
          categories: card.categories,
          thumbnail: card.thumbnail,
          plays: Number(plays.find((p) => p.id === g.id)?.total || 0),
        }),
        sources: selected,
        more: queryCatalog(catalog, { category: card.categories[0] })
          .filter((c) => c.id !== g.id)
          .slice(0, 6),
        siteUrl: env.SITE_URL,
        consentRequired: env.CONSENT_REQUIRED !== "false",
      },
    };
  }),
};
const unavailable = snapshot.games.filter((g) => !g.props.sources.length);
if (unavailable.length)
  throw new Error(
    `${unavailable.length} published games lack an approved playable source: ${unavailable
      .slice(0, 10)
      .map((g) => g.props.game.slug)
      .join(", ")}. Review before publishing.`,
  );
await writeFile(
  "static/published-catalog.json",
  JSON.stringify(snapshot) + "\n",
);
console.log(
  `Exported ${games.length} published production games, ${categories.length} categories; private source records and credentials excluded.`,
);
