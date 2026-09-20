import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Play,
  Sparkles,
  Zap,
  Gamepad2,
} from "lucide-react";
import { browse, getSections, sectionGames } from "../lib/db/repository";
import { GameCard } from "../components/GameCard";
import { Artwork } from "../components/Artwork";
import { CategoryIcon } from "../components/Icons";
import { LibraryGrid } from "../components/Library";
export const metadata = { alternates: { canonical: "/" } };
export default async function Home() {
  const [games, sections] = await Promise.all([
    browse({ limit: 3, sort: "quality" }),
    getSections(),
  ]);
  const curated = await Promise.all(
    sections
      .filter((s) => s.rule !== "recent")
      .map(async (section) => ({
        section,
        games: await sectionGames(section),
      })),
  );
  const hero = games.find((g) => g.slug === "neon-drift") || games[0];
  const pick = games.find((g) => g.id !== hero?.id);
  const gamesBySection = new Map(
    curated.map(({ section, games }) => [section.id, games]),
  );
  return (
    <div className="page home-page">
      <div className="intro-row">
        <div>
          <p className="eyebrow">
            <span className="tiny-led" /> GOOD GAMES. GREAT BREAKS.
          </p>
          <h1>
            Less scrolling. <em>More playing.</em>
          </h1>
          <p className="intro-subtitle">
            A whole world of games. Your kind of escape.
          </p>
        </div>
        <Link className="browse-link" href="/games">
          Explore all games <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="hero-grid">
        <section className="hero">
          <Artwork
            src={hero?.thumbnail || "/art/night-drift.webp"}
            alt={
              hero
                ? `${hero.title} artwork`
                : "A mint sports car drifting along a mountain racetrack"
            }
            priority
          />
          <div className="hero-gradient" />
          <div className="hero-copy">
            <span className="hero-tag">
              <Zap size={13} fill="currentColor" /> THE SPOTLIGHT
            </span>
            <h2>{hero?.title || "Find your flow."}</h2>
            <p>
              One more turn.
              <br />
              One more “just one more.”
            </p>
            <Link
              className="button primary"
              href={hero ? `/game/${hero.slug}` : "/games"}
            >
              <Play size={16} fill="currentColor" />
              Let’s play <ArrowRight size={17} />
            </Link>
          </div>
          <span className="hero-edition">THE NIGHT ARCADE COLLECTION / 01</span>
        </section>
        <Link
          className="editors-pick"
          href={pick ? `/game/${pick.slug}` : "/games"}
        >
          <Artwork src={pick?.thumbnail || "/art/pocket-planet.svg"} alt="" />
          <div className="pick-shade" />
          <span className="pick-label">
            <Sparkles size={14} /> SMALL GAME, BIG ENERGY
          </span>
          <div>
            <p>TAKE A DIFFERENT TURN</p>
            <h2>{pick?.title || "A little adventure"}</h2>
            <span>
              Meet your next obsession <ArrowUpRight size={18} />
            </span>
          </div>
        </Link>
      </div>
      <div className="category-chips" aria-label="Browse by category">
        <Link href="/games" className="selected">
          <Gamepad2 size={16} />
          For you
        </Link>
        {[
          "puzzle",
          "racing",
          "action",
          "sports",
          "2-player",
          "adventure",
          "casual",
        ].map((c) => (
          <Link href={`/category/${c}`} key={c}>
            <CategoryIcon name={c} size={16} />
            {c === "2-player"
              ? "2 Player"
              : c.charAt(0).toUpperCase() + c.slice(1)}
          </Link>
        ))}
      </div>
      {sections.map((section) => {
        if (section.rule === "recent")
          return (
            <LibraryGrid
              key={section.id}
              kind="recent"
              compact
              title={section.title}
              limit={section.limit}
            />
          );
        const games = gamesBySection.get(section.id) || [];
        return (
          games.length > 0 && (
            <section className="section" key={section.id}>
              <div className="section-heading">
                <div>
                  <h2>
                    <CategoryIcon
                      name={section.id === "trending" ? "popular" : section.id}
                      size={21}
                    />
                    {section.title}
                  </h2>
                  {section.id === curated[0]?.section.id && (
                    <p>The ones you’ll want to play again.</p>
                  )}
                </div>
                <Link
                  href={
                    section.rule.startsWith("category:")
                      ? `/category/${section.rule.slice(9)}`
                      : section.rule === "new"
                        ? "/new"
                        : "/popular"
                  }
                >
                  View all <ArrowRight size={16} />
                </Link>
              </div>
              <div className="game-grid">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
              {section.id === curated[1]?.section.id && (
                <div className="break-banner">
                  <span className="banner-icon">
                    <Gamepad2 size={35} />
                  </span>
                  <div>
                    <span className="eyebrow">PRESS PAUSE ON THE EVERYDAY</span>
                    <h3>Your five-minute break deserves a good game.</h3>
                  </div>
                  <Link href="/category/casual">
                    Find your quick escape <ArrowRight size={17} />
                  </Link>
                </div>
              )}
            </section>
          )
        );
      })}
      {!games.length && (
        <div className="empty-state">
          <Gamepad2 size={36} />
          <h2>Your arcade is getting ready.</h2>
          <p>New games will appear here as the collection is curated.</p>
        </div>
      )}
    </div>
  );
}
