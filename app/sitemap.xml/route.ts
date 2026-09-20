import { and, eq, sql } from "drizzle-orm";
import { indexableGames } from "../../lib/db/repository";
import { getDb, getEnv } from "../../lib/db/client";
import { categories } from "../../lib/db/schema";
const escape = (v: string) =>
  v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
export async function GET() {
  const env = getEnv();
  const games = await indexableGames();
  const cats = await getDb()
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.indexable, true),
        sql`EXISTS (SELECT 1 FROM game_categories gc JOIN games g ON g.id=gc.game_id WHERE gc.category_id=${categories.id} AND g.publish_status='published' AND g.index_status='index' AND g.is_fixture=0)`,
      ),
    );
  const paths =
    env.APP_ENV === "production"
      ? [
          "/",
          ...cats.map((c) => `/category/${c.id}`),
          ...games.map((g) => `/game/${g.slug}`),
        ]
      : [];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${escape(new URL(path, env.SITE_URL).href)}</loc></url>`).join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml" } },
  );
}
