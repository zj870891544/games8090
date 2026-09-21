import { notFound } from "next/navigation";
import { BrowsePage } from "../../components/BrowsePage";
import {
  InfoContent,
  pageTitles as titles,
} from "../../components/InfoContent";
import { getEnv } from "../../lib/db/client";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  return {
    title: titles[page] || "Page not found",
    alternates: { canonical: `/${page}` },
    robots: {
      index:
        getEnv().APP_ENV === "production" &&
        !["favorites", "recent"].includes(page),
      follow: true,
    },
  };
}
export default async function StaticPage({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await params;
  if (!titles[page]) notFound();
  if (["games", "new", "popular"].includes(page)) {
    const query = await searchParams;
    return (
      <BrowsePage
        title={titles[page]}
        description={
          page === "new"
            ? "New discoveries. Fresh challenges. Your next “just one more.”"
            : "From quick little escapes to your next big obsession."
        }
        options={{ sort: page }}
        page={Math.max(1, Math.min(1000, Number(query.page) || 1))}
        basePath={`/${page}`}
      />
    );
  }
  return <InfoContent page={page} email={getEnv().CONTACT_EMAIL} />;
}
