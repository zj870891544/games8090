"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, RotateCcw } from "lucide-react";
import { GameCard } from "./GameCard";
import { useHydrated } from "./useHydrated";
import type { GameCardData } from "../lib/types";

interface CollectionState {
  games: GameCardData[];
  nextPage: number | null;
}

// Preserve appended games during client-side Back navigation. This cache is
// populated only by browser effects, never by server rendering or user data.
const collections = new Map<string, CollectionState & { savedAt: number }>();

export function GameCollection({
  initialGames,
  initialNextPage,
  collectionKey,
  basePath,
  query,
  category,
  sort,
}: {
  initialGames: GameCardData[];
  initialNextPage: number | null;
  collectionKey: string;
  basePath: string;
  query?: string;
  category?: string;
  sort?: string;
}) {
  const hydrated = useHydrated();
  const [collection, setCollection] = useState<CollectionState>(() => {
    const saved = collections.get(collectionKey);
    return saved && Date.now() - saved.savedAt < 5 * 60_000
      ? saved
      : { games: initialGames, nextPage: initialNextPage };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    collections.delete(collectionKey);
    collections.set(collectionKey, { ...collection, savedAt: Date.now() });
    if (collections.size > 3)
      collections.delete(collections.keys().next().value!);
  }, [collectionKey, collection]);

  useEffect(() => () => request.current?.abort(), []);

  const loadMore = useCallback(async () => {
    if (request.current || collection.nextPage === null) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({
      page: String(collection.nextPage),
      sort: sort || "popular",
    });
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    try {
      const response = await fetch(`/api/games?${params}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Collection request failed");
      const data = (await response.json()) as CollectionState;
      if (controller.signal.aborted) return;
      setCollection((current) => {
        const ids = new Set(current.games.map((game) => game.id));
        return {
          games: [
            ...current.games,
            ...data.games.filter((game) => !ids.has(game.id)),
          ],
          nextPage: data.nextPage,
        };
      });
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setLoading(false);
      }
    }
  }, [collection.nextPage, query, category, sort]);

  useEffect(() => {
    if (
      !hydrated ||
      error ||
      collection.nextPage === null ||
      !sentinel.current ||
      !("IntersectionObserver" in window)
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "0px 0px 400px 0px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hydrated, error, collection.nextPage, loadMore]);

  const fallbackParams = new URLSearchParams();
  if (query) fallbackParams.set("q", query);
  if (collection.nextPage)
    fallbackParams.set("page", String(collection.nextPage));

  return (
    <>
      <div className="game-grid browse-grid" aria-label="Game collection">
        {collection.games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
      <div className="collection-loader" ref={sentinel}>
        <p role="status" aria-live="polite">
          {error
            ? "Couldn’t load more games. Your collection is still here."
            : loading
              ? "Loading more games…"
              : collection.nextPage !== null
                ? `${collection.games.length} games ready · Scroll for more`
                : `End of collection · ${collection.games.length} games shown`}
        </p>
        {collection.nextPage !== null &&
          (hydrated ? (
            <button
              className="button"
              disabled={loading}
              onClick={() => void loadMore()}
            >
              {loading ? (
                <span className="spinner" />
              ) : error ? (
                <RotateCcw size={16} />
              ) : (
                <ArrowDown size={16} />
              )}
              {loading ? "Loading…" : error ? "Try again" : "Load more games"}
            </button>
          ) : (
            <Link className="button" href={`${basePath}?${fallbackParams}`}>
              Load more games <ArrowDown size={16} />
            </Link>
          ))}
      </div>
    </>
  );
}
