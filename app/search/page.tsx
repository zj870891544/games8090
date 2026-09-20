import { BrowsePage } from "../../components/BrowsePage";
export const metadata = {
  title: "Search games",
  robots: { index: false, follow: true },
};
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  return (
    <BrowsePage
      title={q ? "Found your next favorite?" : "What are you in the mood for?"}
      description="Search the collection by game, studio, category, or tag."
      options={{ query: q.slice(0, 150) }}
      page={Math.max(1, Math.min(1000, Number(page) || 1))}
      basePath="/search"
      event="search"
    />
  );
}
