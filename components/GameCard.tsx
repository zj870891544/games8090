"use client";
import Link from "next/link";
import { Play } from "lucide-react";
import { Artwork } from "./Artwork";
import { track } from "../lib/browser-library";
import type { GameCardData } from "../lib/types";
export function GameCard({
  game,
  priority = false,
  spotlight = false,
}: {
  game: GameCardData;
  priority?: boolean;
  spotlight?: boolean;
}) {
  return (
    <Link
      className={spotlight ? "spotlight-card" : "game-card"}
      href={`/game/${game.slug}`}
      onClick={() => track("game_card_click", game.id)}
      title={game.title}
    >
      <div className={spotlight ? "spotlight-art" : "card-art"}>
        <Artwork
          src={game.thumbnail}
          alt={`${game.title} artwork`}
          priority={priority}
        />
        {!spotlight && (
          <span className="card-play" aria-hidden="true">
            <Play size={21} fill="currentColor" />
          </span>
        )}
      </div>
      {spotlight ? (
        <div className="spotlight-copy">
          <h2>{game.title}</h2>
          <p>{game.categories[0]?.replaceAll("-", " ") || "Arcade"}</p>
          <span className="button primary">
            <Play size={18} fill="currentColor" /> Play now
          </span>
        </div>
      ) : (
        <>
          <div className="card-caption">
            <h3>{game.title}</h3>
          </div>
          <p>{game.categories[0]?.replaceAll("-", " ") || "Arcade"}</p>
        </>
      )}
    </Link>
  );
}
