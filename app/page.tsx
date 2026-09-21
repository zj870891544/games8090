import {
  browse,
  getSections,
  publishedGameCount,
  sectionGames,
} from "../lib/db/repository";
import { HomeContent, spotlightSlugs } from "../components/HomeContent";
export const metadata = { alternates: { canonical: "/" } };
export default async function Home() {
  const [games, picks, sections, count] = await Promise.all([
    browse({ limit: 24, sort: "quality" }),
    browse({ slugs: spotlightSlugs, limit: spotlightSlugs.length }),
    getSections(),
    publishedGameCount(),
  ]);
  const curated = await Promise.all(
    sections
      .filter((s) => s.rule !== "recent")
      .map(async (section) => ({
        section,
        games: await sectionGames(section),
      })),
  );
  return (
    <HomeContent games={games} picks={picks} curated={curated} count={count} />
  );
}
