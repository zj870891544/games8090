import Link from "next/link";
import { ArrowRight, Gamepad2 } from "lucide-react";
import { GameCard } from "./GameCard";
import { CategoryNav } from "./CategoryNav";
import type { GameCardData, HomeSection } from "../lib/types";
export interface HomeContentProps {
  games: GameCardData[];
  picks: GameCardData[];
  curated: { section: HomeSection; games: GameCardData[] }[];
  count: number;
}
import { spotlightSlugs } from "../lib/home-spotlight";
export { spotlightSlugs } from "../lib/home-spotlight";
export function HomeContent({
  games,
  picks,
  curated,
  count,
}: HomeContentProps) {
  const manualPicks = curated
    .filter(({ section }) => section.kind === "manual")
    .flatMap(({ games }) => games);
  const orderedPicks = spotlightSlugs.flatMap((slug) =>
    picks.filter((game) => game.slug === slug),
  );
  const unique = new Map<string, GameCardData>();
  for (const game of [
    ...manualPicks,
    ...games.filter((g) => g.featured),
    ...orderedPicks,
    ...games,
  ]) {
    if (!unique.has(game.id)) unique.set(game.id, game);
  }
  const [spotlight, ...wall] = [...unique.values()];
  return (
    <div className="page home-page">
      <header className="arcade-intro">
        <h1>
          What are we <em>playing?</em>
        </h1>
        <p>{count.toLocaleString("en-US")} games. One good break.</p>
      </header>
      <CategoryNav />
      {spotlight ? (
        <>
          <section aria-label="Featured games" className="home-spotlight-grid">
            <GameCard game={spotlight} priority spotlight />
            <div className="spotlight-games">
              {wall.slice(0, 8).map((game) => (
                <GameCard key={game.id} game={game} priority />
              ))}
            </div>
          </section>
          <div
            className="game-grid home-more-grid"
            aria-label="More games to discover"
          >
            {wall.slice(8, 14).map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
          <div className="discover-collection-link">
            <Link href="/games">
              Explore all {count.toLocaleString("en-US")} games{" "}
              <ArrowRight size={18} />
            </Link>
          </div>
          {curated.map(
            ({ section, games }) =>
              games.length > 0 && (
                <section className="section" key={section.id}>
                  <div className="section-heading">
                    <h2>{section.title}</h2>
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
                </section>
              ),
          )}
        </>
      ) : (
        <div className="empty-state">
          <Gamepad2 size={36} />
          <h2>Your arcade is getting ready.</h2>
          <p>New games will appear here as the collection is curated.</p>
        </div>
      )}
    </div>
  );
}
