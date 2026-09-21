"use client";
import { catalogRequest } from "../lib/catalog-client";
import { useEffect, useState } from "react";
import { useHydrated } from "./useHydrated";
import { Heart, History, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  readLibrary,
  clearLibrary,
  toggleFavorite,
  track,
} from "../lib/browser-library";
import { GameCard } from "./GameCard";
import type { GameCardData } from "../lib/types";
export function FavoriteButton({ slug, id }: { slug: string; id: string }) {
  const hydrated = useHydrated();
  const [favorite, setFavorite] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    const update = () => setFavorite(readLibrary().favorites.includes(slug));
    update();
    window.addEventListener("arcade-library", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("arcade-library", update);
      window.removeEventListener("storage", update);
    };
  }, [slug]);
  return (
    <>
      <button
        className={`button ${favorite ? "favorited" : ""}`}
        aria-pressed={favorite}
        disabled={!hydrated}
        onClick={() => {
          const result = toggleFavorite(slug);
          if (result.added && result.saved) track("favorite_add", id);
          setMessage(
            result.saved ? "" : "Your browser could not save this favorite.",
          );
        }}
      >
        <Heart size={17} fill={favorite ? "currentColor" : "none"} />
        {favorite ? "Favorited" : "Favorite"}
      </button>
      {message && <span role="status">{message}</span>}
    </>
  );
}
export function LibraryGrid({
  kind,
  compact = false,
  title = "Jump back in",
  limit = 6,
}: {
  kind: "favorites" | "recent";
  compact?: boolean;
  title?: string;
  limit?: number;
}) {
  const [games, setGames] = useState<GameCardData[]>([]),
    [ready, setReady] = useState(false);
  useEffect(() => {
    const update = async () => {
      const saved = readLibrary();
      const slugs =
        kind === "favorites"
          ? saved.favorites
          : saved.recent.map((r) => r.slug);
      if (!slugs.length) {
        setGames([]);
        setReady(true);
        return;
      }
      try {
        const response = await catalogRequest(
          `/api/library?slugs=${encodeURIComponent(slugs.join(","))}`,
        );
        const data = (await response.json()) as { games: GameCardData[] };
        setGames(
          slugs.flatMap((slug) => data.games.filter((g) => g.slug === slug)),
        );
      } catch {
        setGames([]);
      }
      setReady(true);
    };
    void update();
    window.addEventListener("arcade-library", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("arcade-library", update);
      window.removeEventListener("storage", update);
    };
  }, [kind]);
  if (compact && !games.length) return null;
  return (
    <section className={compact ? "section" : "library-grid"}>
      {compact && (
        <div className="section-heading">
          <h2>
            <History size={21} />
            {title}
          </h2>
          <Link href="/recent">
            View all <ArrowRight size={16} />
          </Link>
        </div>
      )}
      {games.length ? (
        <div className="game-grid">
          {games.slice(0, compact ? limit : 100).map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {kind === "favorites" ? <Heart size={34} /> : <History size={34} />}
          <h2>
            {!ready
              ? "Opening your collection…"
              : kind === "favorites"
                ? "A home for your favorites"
                : "Your next adventure starts here"}
          </h2>
          <p>
            {kind === "favorites"
              ? "Tap the heart on a game to keep it close. Saved on this browser."
              : "Games you start will appear here, ready for another round."}
          </p>
          <Link className="button primary" href="/games">
            Find something to play <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </section>
  );
}
export function ClearLibraryButton() {
  const [done, setDone] = useState(false);
  return (
    <button className="button" onClick={() => setDone(clearLibrary())}>
      {done
        ? "Local favorites and history cleared"
        : "Clear favorites & recently played"}
    </button>
  );
}

export function ContinuePlaying() {
  const [game, setGame] = useState<GameCardData | null>(null);
  useEffect(() => {
    let request: AbortController | undefined;
    const update = async () => {
      request?.abort();
      const slug = readLibrary().recent[0]?.slug;
      setGame(null);
      if (!slug) return;
      const controller = new AbortController();
      request = controller;
      try {
        const response = await catalogRequest(
          `/api/library?slugs=${encodeURIComponent(slug)}`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) return;
        const data = (await response.json()) as { games: GameCardData[] };
        if (!controller.signal.aborted) setGame(data.games[0] || null);
      } catch {
        /* History is optional; navigation stays available if it cannot load. */
      }
    };
    void update();
    window.addEventListener("arcade-library", update);
    window.addEventListener("storage", update);
    return () => {
      request?.abort();
      window.removeEventListener("arcade-library", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  if (!game) return null;
  return (
    <Link
      className="continue-playing"
      href={`/game/${game.slug}`}
      aria-label={`Continue playing ${game.title}`}
    >
      <span>Continue: {game.title}</span>
      <ArrowRight size={18} />
    </Link>
  );
}
