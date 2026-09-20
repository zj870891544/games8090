import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, getEnv } from "../../../lib/db/client";
import { categories } from "../../../lib/db/schema";
import { BrowsePage } from "../../../components/BrowsePage";
async function category(slug: string) {
  return getDb().select().from(categories).where(eq(categories.id, slug)).get();
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = await category(slug);
  return {
    title: `${c?.name || "Category"} games`,
    description: `Discover ${c?.name.toLowerCase() || "browser"} games in the 8090 collection.`,
    alternates: { canonical: `/category/${slug}` },
    robots: {
      index: getEnv().APP_ENV === "production" && !!c?.indexable,
      follow: true,
    },
  };
}
export default async function Category({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const c = await category(slug);
  if (!c) notFound();
  const { page } = await searchParams;
  return (
    <BrowsePage
      title={`${c.name}. Your way.`}
      description={`A little ${c.name.toLowerCase()}. A lot to discover. Pick a game and get into it.`}
      options={{ category: slug }}
      basePath={`/category/${slug}`}
      page={Math.max(1, Math.min(1000, Number(page) || 1))}
      event="category_view"
    />
  );
}
