import {
  catalogSlice,
  queryCatalog,
  type CatalogEntry,
} from "./static-catalog";

let catalog: Promise<CatalogEntry[]> | undefined;
export function loadStaticCatalog() {
  if (!catalog) {
    const url = document.querySelector<HTMLMetaElement>(
      'meta[name="8090-catalog"]',
    )?.content;
    if (!url) return Promise.reject(new Error("Missing published catalog"));
    catalog = fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error("Catalog unavailable");
        return (await response.json()) as CatalogEntry[];
      })
      .catch((error) => {
        catalog = undefined;
        throw error;
      });
  }
  return catalog;
}

/** Keep the local/admin app on D1, while public static pages need no API. */
export async function catalogRequest(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  if (process.env.NEXT_PUBLIC_STATIC_SITE !== "true") return fetch(input, init);
  const entries = await loadStaticCatalog();
  init?.signal?.throwIfAborted();
  const url = new URL(input, "https://games8090.online");
  const options = {
    query: url.searchParams.get("q") || undefined,
    category: url.searchParams.get("category") || undefined,
    sort: url.searchParams.get("sort") || undefined,
  };
  if (url.pathname === "/api/games")
    return Response.json(
      catalogSlice(entries, options, Number(url.searchParams.get("page")) || 1),
    );
  const games = queryCatalog(
    entries,
    url.pathname === "/api/library"
      ? {
          slugs: (url.searchParams.get("slugs") || "").split(",").slice(0, 100),
        }
      : options,
  );
  return Response.json({
    games: games.slice(0, url.pathname === "/api/search" ? 8 : 100),
  });
}
