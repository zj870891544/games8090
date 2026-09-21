import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Keyboard,
  Monitor,
  Smartphone,
  Gamepad2,
  Info,
} from "lucide-react";
import { GamePlayer } from "./GamePlayer";
import { FavoriteButton } from "./Library";
import { GameCard } from "./GameCard";
import type { GameDetail, EmbedConfig, GameCardData } from "../lib/types";
export type PublicGameDetail = Pick<
  GameDetail,
  | "id"
  | "slug"
  | "title"
  | "description"
  | "editorialDescription"
  | "developer"
  | "orientation"
  | "supportsMobile"
  | "supportsDesktop"
  | "supportsTouch"
  | "supportsKeyboard"
  | "supportsGamepad"
  | "isMultiplayer"
  | "controls"
  | "howToPlay"
  | "isFixture"
  | "categories"
  | "thumbnail"
  | "plays"
>;
export interface GameContentProps {
  game: PublicGameDetail;
  sources: EmbedConfig[];
  more: GameCardData[];
  siteUrl: string;
  consentRequired: boolean;
  nonce?: string;
}
export function GameContent({
  game,
  sources,
  more,
  siteUrl,
  consentRequired,
  nonce,
}: GameContentProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    url: `${siteUrl}/game/${game.slug}`,
    description: game.editorialDescription || game.description,
    genre: game.categories,
    gamePlatform: "Web browser",
    ...(game.developer
      ? { author: { "@type": "Organization", name: game.developer } }
      : {}),
  };
  return (
    <div className="page game-page">
      <div className="breadcrumbs">
        <Link href="/games">
          <ArrowLeft size={14} />
          All games
        </Link>
        <span>/</span>
        {game.categories[0] && (
          <Link href={`/category/${game.categories[0]}`}>
            {game.categories[0].replaceAll("-", " ")}
          </Link>
        )}
        <span>/</span>
        <span>{game.title}</span>
      </div>
      <GamePlayer
        id={game.id}
        slug={game.slug}
        title={game.title}
        thumbnail={game.thumbnail}
        sources={sources}
        consentRequired={consentRequired}
      />
      <div className="game-title-row">
        <div>
          <h1>{game.title}</h1>
          <p>
            {game.plays > 0
              ? `${game.plays.toLocaleString()} starts on 8090`
              : "Be among the first to play"}
            <span>·</span>
            {game.isMultiplayer ? "Play together" : "Your own little escape"}
          </p>
        </div>
        <FavoriteButton id={game.id} slug={game.slug} />
      </div>
      {game.isFixture && (
        <div className="fixture-note">
          <Info size={17} />
          <span>
            This is a development catalog sample. The player demonstrates
            loading and source switching; real gameplay will be available after
            a licensed provider is connected.
          </span>
        </div>
      )}
      <div className="game-info-grid">
        <article>
          <span className="eyebrow">GET TO KNOW YOUR NEXT FAVORITE</span>
          <h2>About {game.title}</h2>
          <p>
            {game.editorialDescription ||
              game.description ||
              "More details are being prepared for this game."}
          </p>
          <h3>How to play</h3>
          <p>
            {game.howToPlay ||
              "Follow the instructions shown inside the game. Detailed instructions will be added after editorial review."}
          </p>
          <h3>Controls</h3>
          <p>
            {game.controls ||
              "Check the game’s own instructions for supported controls."}
          </p>
          <div className="tag-list">
            {game.categories.map((c) => (
              <Link key={c} href={`/category/${c}`}>
                {c.replaceAll("-", " ")}
              </Link>
            ))}
          </div>
        </article>
        <aside className="details-panel">
          <h3>The essentials</h3>
          <dl>
            {game.developer && (
              <>
                <dt>Made by</dt>
                <dd>{game.developer}</dd>
              </>
            )}
            <dt>Play on</dt>
            <dd className="device-list">
              {game.supportsDesktop && (
                <span>
                  <Monitor size={16} />
                  Desktop
                </span>
              )}
              {game.supportsMobile && (
                <span>
                  <Smartphone size={16} />
                  Mobile
                </span>
              )}
            </dd>
            <dt>Input support</dt>
            <dd className="device-list">
              {game.supportsKeyboard && (
                <span>
                  <Keyboard size={16} />
                  Keyboard
                </span>
              )}
              {game.supportsTouch && (
                <span>
                  <Smartphone size={16} />
                  Touch
                </span>
              )}
              {game.supportsGamepad && (
                <span>
                  <Gamepad2 size={16} />
                  Gamepad
                </span>
              )}
              {!game.supportsKeyboard &&
                !game.supportsTouch &&
                !game.supportsGamepad &&
                "See game instructions"}
            </dd>
            <dt>Orientation</dt>
            <dd>
              {game.orientation === "any" ? "Flexible" : game.orientation}
            </dd>
            <dt>Game credits</dt>
            <dd>
              {[...new Set(sources.map((s) => s.providerName))].join(" · ") ||
                "No available provider"}
            </dd>
          </dl>
        </aside>
      </div>
      <section id="related" className="section">
        <div className="section-heading">
          <h2>More like this</h2>
          <Link href="/games">
            Explore more <ArrowRight size={16} />
          </Link>
        </div>
        <div className="game-grid">
          {more.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </section>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
