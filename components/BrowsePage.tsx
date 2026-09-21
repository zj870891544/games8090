import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";
import { browse, type BrowseOptions } from "../lib/db/repository";
import { GameCollection } from "./GameCollection";
import { PageEvent } from "./PageEvent";
import { CategoryNav } from "./CategoryNav";
import {
  catalogPage,
  catalogPageSize,
  maxCatalogPage,
} from "../lib/catalog-pagination";
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
  const collectionKey = JSON.stringify([
    basePath,
    options.query,
    options.category,
    options.sort,
    currentPage,
  ]);
  return (
    <div className="page catalog-page">
      <header className="page-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <CategoryNav />
      {event && <PageEvent event={event} />}
      <div className="collection-topline">
        <span>
          {options.query
            ? `Results for “${options.query}”`
            : "Pick your next good break"}
        </span>
        <span>
          INSTANT PLAY <span className="tiny-led" />
        </span>
      </div>
      {games.length ? (
        <>
          <GameCollection
            key={collectionKey}
            collectionKey={collectionKey}
            initialGames={games.slice(0, catalogPageSize)}
            initialNextPage={
              games.length > catalogPageSize && currentPage < maxCatalogPage
                ? currentPage + 1
                : null
            }
            basePath={basePath}
            query={options.query}
            category={options.category}
            sort={options.sort}
          />
          {currentPage > 1 && (
            <p className="collection-start-link">
              <Link
                href={`${basePath}${options.query ? `?q=${encodeURIComponent(options.query)}` : ""}`}
              >
                Back to the beginning
              </Link>
            </p>
          )}
        </>
      ) : (
        <div className="empty-state">
          <SearchX size={35} />
          <h2>No games here just yet.</h2>
          <p>Try another title or explore the full collection.</p>
          <Link href="/games" className="button primary">
            Explore games <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
