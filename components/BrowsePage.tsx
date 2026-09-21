import { browse, type BrowseOptions } from "../lib/db/repository";
import { BrowseContent } from "./BrowseContent";
import { catalogPage, catalogPageSize } from "../lib/catalog-pagination";
export async function BrowsePage({
  title,
  description,
  options = {},
  page = 1,
  basePath = "/games",
  event,
}: {
  title: string;
  description: string;
  options?: BrowseOptions;
  page?: number;
  basePath?: string;
  event?: string;
}) {
  const currentPage = catalogPage(page);
  const games = await browse({
    ...options,
    limit: catalogPageSize + 1,
    offset: (currentPage - 1) * catalogPageSize,
  });
  return (
    <BrowseContent
      title={title}
      description={description}
      options={options}
      currentPage={currentPage}
      basePath={basePath}
      event={event}
      games={games}
    />
  );
}
