import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";
import type { BrowseOptions } from "../lib/db/repository";
import type { GameCardData } from "../lib/types";
import { GameCollection } from "./GameCollection";
import { PageEvent } from "./PageEvent";
import { CategoryNav } from "./CategoryNav";
import { catalogPageSize, maxCatalogPage } from "../lib/catalog-pagination";
export interface BrowseContentProps {
  title: string;
  description: string;
  options?: BrowseOptions;
  currentPage?: number;
  basePath?: string;
  event?: string;
  games: GameCardData[];
}
export function BrowseContent({
  title,
  description,
  options = {},
  currentPage = 1,
  basePath = "/games",
  event,
  games,
}: BrowseContentProps) {
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
