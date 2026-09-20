"use client";
import Link from "next/link";
import { ArrowUpRight, Play, Smartphone } from "lucide-react";
import { Artwork } from "./Artwork";
import { track } from "../lib/browser-library";
import type { GameCardData } from "../lib/types";
export function GameCard({
  game,
  priority = false,
}: {
  game: GameCardData;
  priority?: boolean;
}) {
  return (
    <Link
      className="game-card"
      href={`/game/${game.slug}`}
      onClick={() => track("game_card_click", game.id)}
    >
      <div className="card-art">
        <Artwork
          src={game.thumbnail}
          alt={`${game.title} artwork`}
          priority={priority}
        />
        {game.badge && (
          <span className={`badge ${game.badge === "Hot" ? "badge-hot" : ""}`}>
            {game.badge === "Hot" ? "↗ " : ""}
            {game.badge}
          </span>
        )}
        <span className="card-play">
          <Play size={21} fill="currentColor" />
        </span>
      </div>
      <div className="card-caption">
        <h3>{game.title}</h3>
        <ArrowUpRight size={15} />
      </div>
      <p>
        {game.categories[0]?.replaceAll("-", " ") || "Arcade"}
        {game.supportsMobile && <Smartphone size={11} />}
      </p>
    </Link>
  );
}
