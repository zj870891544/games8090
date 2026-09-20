import { analyticsGameEvent } from "./google-analytics";
export interface Library {
  version: 1;
  favorites: string[];
  recent: { slug: string; playedAt: string }[];
}
const key = "8090.library.v1";
const empty: Library = { version: 1, favorites: [], recent: [] };
export function readLibrary(): Library {
  try {
    const raw = JSON.parse(
      localStorage.getItem(key) || "null",
    ) as Library | null;
    if (
      raw?.version === 1 &&
      Array.isArray(raw.favorites) &&
      Array.isArray(raw.recent)
    )
      return {
        version: 1,
        favorites: raw.favorites
          .filter((s) => typeof s === "string")
          .slice(0, 100),
        recent: raw.recent
          .filter(
            (r) =>
              r && typeof r.slug === "string" && typeof r.playedAt === "string",
          )
          .slice(0, 40),
      };
  } catch {}
  return { ...empty };
}
function save(library: Library) {
  try {
    localStorage.setItem(key, JSON.stringify(library));
    window.dispatchEvent(new Event("arcade-library"));
    return true;
  } catch {
    return false;
  }
}
export function toggleFavorite(slug: string) {
  const library = readLibrary();
  const exists = library.favorites.includes(slug);
  library.favorites = exists
    ? library.favorites.filter((s) => s !== slug)
    : [slug, ...library.favorites].slice(0, 100);
  return { added: !exists, saved: save(library) };
}
export function addRecent(slug: string) {
  const library = readLibrary();
  library.recent = [
    { slug, playedAt: new Date().toISOString() },
    ...library.recent.filter((r) => r.slug !== slug),
  ].slice(0, 40);
  save(library);
}
export function clearLibrary() {
  try {
    localStorage.removeItem(key);
    window.dispatchEvent(new Event("arcade-library"));
    return true;
  } catch {
    return false;
  }
}
export function track(
  event: string,
  gameId?: string,
  sourceId?: string,
  value?: number,
) {
  if (typeof window === "undefined") return;
  analyticsGameEvent(event, gameId, sourceId, value);
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, gameId, sourceId, value }),
    keepalive: true,
  }).catch(() => {});
}
