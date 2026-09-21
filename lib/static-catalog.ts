import type { GameCardData } from "./types";
import { catalogPage, catalogPageSize } from "./catalog-pagination";

export interface CatalogEntry {
  card: GameCardData;
  search: string;
  createdAt: string;
  popularity: number;
  quality: number;
  trending: number;
}
export interface CatalogQuery {
  query?: string;
  category?: string;
  sort?: string;
  slugs?: string[];
}
export const searchWords = (text: string) =>
  text
    .normalize("NFKC")
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) || [];

/** Deterministic ranking shared by the static exporter and browser. */
export function queryCatalog(
  catalog: CatalogEntry[],
  options: CatalogQuery = {},
) {
  const terms = searchWords(options.query || "").slice(0, 8);
  if (options.query && !terms.length) return [];
  const matches = catalog.filter(({ card, search }) => {
    if (options.category && !card.categories.includes(options.category))
      return false;
    if (options.slugs && !options.slugs.includes(card.slug)) return false;
    if (!terms.length) return true;
    const words = searchWords(search);
    return terms.every((term) => words.some((word) => word.startsWith(term)));
  });
  const score = (entry: CatalogEntry) =>
    options.sort === "new"
      ? Date.parse(entry.createdAt) || 0
      : options.sort === "quality"
        ? entry.quality
        : options.sort === "trending"
          ? entry.trending
          : entry.popularity;
  return matches
    .sort((a, b) => {
      const exact = (entry: CatalogEntry) =>
        terms.length &&
        searchWords(entry.card.title).join(" ") === terms.join(" ")
          ? 1
          : 0;
      const titleMatch = (entry: CatalogEntry) =>
        terms.length &&
        terms.every((term) =>
          searchWords(entry.card.title).some((word) => word.startsWith(term)),
        )
          ? 1
          : 0;
      return (
        exact(b) - exact(a) ||
        titleMatch(b) - titleMatch(a) ||
        score(b) - score(a) ||
        a.card.title.localeCompare(b.card.title, "en") ||
        a.card.id.localeCompare(b.card.id, "en")
      );
    })
    .map(({ card }) => card);
}

export function catalogSlice(
  catalog: CatalogEntry[],
  options: CatalogQuery,
  page: number,
) {
  const current = catalogPage(page);
  const all = queryCatalog(catalog, options);
  return {
    games: all.slice(
      (current - 1) * catalogPageSize,
      current * catalogPageSize,
    ),
    nextPage: all.length > current * catalogPageSize ? current + 1 : null,
  };
}
