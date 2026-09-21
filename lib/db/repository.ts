import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, getEnv } from "./client";
import * as s from "./schema";
import type { Game, GameCardData, GameDetail, HomeSection } from "../types";
export function ftsQuery(query: string) {
  return (
    query
      .normalize("NFKC")
      .match(/[\p{L}\p{N}]+/gu)
      ?.slice(0, 8)
      .map((term) => `"${term}"*`)
      .join(" AND ") || ""
  );
}
export async function getProviders() {
  return getDb().select().from(s.providers).orderBy(desc(s.providers.priority));
}
export async function getContracts() {
  return getDb().select().from(s.providerContractConfig);
}
export async function cardsFromGames(games: Game[]): Promise<GameCardData[]> {
  if (!games.length) return [];
  const db = getDb();
  const ids = games.map((g) => g.id);
  const [sources, cats] = await Promise.all([
    db.select().from(s.gameSources).where(inArray(s.gameSources.gameId, ids)),
    db
      .select()
      .from(s.gameCategories)
      .where(inArray(s.gameCategories.gameId, ids)),
  ]);
  return games.map((g) => ({
    id: g.id,
    slug: g.slug,
    title: g.title,
    supportsMobile: g.supportsMobile,
    isMultiplayer: g.isMultiplayer,
    isFixture: g.isFixture,
    featured: g.featured,
    thumbnail:
      sources
        .filter((v) => v.gameId === g.id)
        .sort(
          (a, b) =>
            Number(b.isActive) - Number(a.isActive) || b.priority - a.priority,
        )[0]?.thumbnailUrl || "/art/fallback.svg",
    categories: cats
      .filter((v) => v.gameId === g.id)
      .map((v) => v.categoryId)
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
  }));
}
export interface BrowseOptions {
  query?: string;
  category?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  ids?: string[];
  slugs?: string[];
  includeDrafts?: boolean;
}
export async function publishedGameCount() {
  const result = await getDb()
    .select({ total: sql<number>`count(*)` })
    .from(s.games)
    .where(
      and(
        eq(s.games.publishStatus, "published"),
        getEnv().APP_ENV === "local" ? undefined : eq(s.games.isFixture, false),
      ),
    )
    .get();
  return result?.total || 0;
}
export async function browse(
  options: BrowseOptions = {},
): Promise<GameCardData[]> {
  const db = getDb();
  const where = [];
  if (!options.includeDrafts)
    where.push(eq(s.games.publishStatus, "published"));
  if (getEnv().APP_ENV !== "local") where.push(eq(s.games.isFixture, false));
  if (options.category)
    where.push(
      sql`${s.games.id} IN (SELECT game_id FROM game_categories WHERE category_id=${options.category})`,
    );
  if (options.ids) {
    if (!options.ids.length) return [];
    where.push(inArray(s.games.id, options.ids.slice(0, 100)));
  }
  if (options.slugs) {
    if (!options.slugs.length) return [];
    where.push(inArray(s.games.slug, options.slugs.slice(0, 100)));
  }
  const query = options.query ? ftsQuery(options.query) : "";
  if (options.query && !query) return [];
  if (query)
    where.push(
      sql`${s.games.id} IN (SELECT game_id FROM games_fts WHERE games_fts MATCH ${query})`,
    );
  const order =
    options.sort === "new"
      ? desc(s.games.createdAt)
      : options.sort === "trending"
        ? desc(s.games.trendingScore)
        : options.sort === "quality"
          ? desc(s.games.qualityScore)
          : desc(s.games.popularityScore);
  const results = await db
    .select()
    .from(s.games)
    .where(and(...where))
    .orderBy(
      query
        ? sql`(SELECT rank FROM games_fts WHERE games_fts MATCH ${query} AND game_id=${s.games.id})`
        : order,
      s.games.title,
      s.games.id,
    )
    .limit(Math.min(options.limit || 36, 100))
    .offset(options.offset || 0);
  return cardsFromGames(results);
}
export async function getGame(slug: string): Promise<GameDetail | null> {
  const db = getDb();
  const game = await db
    .select()
    .from(s.games)
    .where(and(eq(s.games.slug, slug), eq(s.games.publishStatus, "published")))
    .get();
  if (!game || (getEnv().APP_ENV !== "local" && game.isFixture)) return null;
  const [sources, categories, plays] = await Promise.all([
    db.select().from(s.gameSources).where(eq(s.gameSources.gameId, game.id)),
    db
      .select()
      .from(s.gameCategories)
      .where(eq(s.gameCategories.gameId, game.id)),
    db
      .select({ total: sql<number>`coalesce(sum(count),0)` })
      .from(s.gameMetricsDaily)
      .where(
        and(
          eq(s.gameMetricsDaily.gameId, game.id),
          eq(s.gameMetricsDaily.event, "game_start"),
        ),
      )
      .get(),
  ]);
  return {
    ...game,
    sources,
    categories: categories.map((c) => c.categoryId),
    thumbnail: sources[0]?.thumbnailUrl || "/art/fallback.svg",
    plays: plays?.total || 0,
  };
}
export async function getRedirect(slug: string) {
  return getDb()
    .select({ slug: s.games.slug })
    .from(s.gameRedirects)
    .innerJoin(s.games, eq(s.gameRedirects.gameId, s.games.id))
    .where(
      and(
        eq(s.gameRedirects.slug, slug),
        eq(s.games.publishStatus, "published"),
      ),
    )
    .get();
}
export async function getSections() {
  return getDb()
    .select()
    .from(s.homepageSections)
    .where(eq(s.homepageSections.enabled, true))
    .orderBy(s.homepageSections.position);
}
export async function sectionGames(section: HomeSection) {
  const pins = await getDb()
    .select({ game: s.games })
    .from(s.homepageSectionGames)
    .innerJoin(s.games, eq(s.homepageSectionGames.gameId, s.games.id))
    .where(
      and(
        eq(s.homepageSectionGames.sectionId, section.id),
        eq(s.games.publishStatus, "published"),
        getEnv().APP_ENV === "local" ? undefined : eq(s.games.isFixture, false),
      ),
    )
    .orderBy(s.homepageSectionGames.position);
  const pinned = await cardsFromGames(pins.map((p) => p.game));
  if (section.kind === "manual") return pinned.slice(0, section.limit);
  const cat = section.rule.startsWith("category:")
    ? section.rule.slice(9)
    : undefined;
  const automatic = await browse({
    category: cat,
    sort: section.rule,
    limit: section.limit + pinned.length,
  });
  return [
    ...pinned,
    ...automatic.filter((g) => !pinned.some((p) => p.id === g.id)),
  ].slice(0, section.limit);
}
export async function indexableGames() {
  return getDb()
    .select()
    .from(s.games)
    .where(
      and(
        eq(s.games.publishStatus, "published"),
        eq(s.games.indexStatus, "index"),
        eq(s.games.isFixture, false),
      ),
    )
    .orderBy(s.games.title);
}
