import { useEffect, useState } from "react";
import { Shell } from "../components/Shell";
import { GoogleAnalytics } from "../components/GoogleAnalytics";
import { HomeContent, type HomeContentProps } from "../components/HomeContent";
import { GameContent, type GameContentProps } from "../components/GameContent";
import {
  BrowseContent,
  type BrowseContentProps,
} from "../components/BrowseContent";
import { InfoContent } from "../components/InfoContent";
import { loadStaticCatalog } from "../lib/catalog-client";
import { queryCatalog } from "../lib/static-catalog";
import { catalogPage, catalogPageSize } from "../lib/catalog-pagination";
import { PathContext } from "./navigation";

export type PageData = { path: string; ga4Id: string } & (
  | { kind: "home"; props: HomeContentProps }
  | { kind: "game"; props: GameContentProps }
  | { kind: "browse"; props: BrowseContentProps }
  | { kind: "info"; props: { page: string; email?: string } }
  | { kind: "404" }
);

function QueryBrowse({ initial }: { initial: BrowseContentProps }) {
  const [data, setData] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(initial.basePath === "/search");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (initial.basePath !== "/search" && !params.has("page")) return;
    let active = true;
    const options = {
      ...initial.options,
      query: params.get("q")?.trim().slice(0, 100) || undefined,
    };
    const currentPage = catalogPage(Number(params.get("page")) || 1);
    loadStaticCatalog()
      .then((catalog) => {
        if (!active) return;
        const games =
          options.query || initial.basePath !== "/search"
            ? queryCatalog(catalog, options)
            : [];
        setData({
          ...initial,
          options,
          currentPage,
          games: games.slice(
            (currentPage - 1) * catalogPageSize,
            currentPage * catalogPageSize + 1,
          ),
        });
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setFailed(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [initial]);
  if (failed)
    return (
      <div className="page empty-state">
        <h1>Collection unavailable</h1>
        <p>Please reload to try again.</p>
        <button className="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  if (loading)
    return (
      <div className="page empty-state">
        <h1>Find your next favorite</h1>
        <p role="status">Searching the collection…</p>
        <noscript>
          Enable JavaScript to search, or browse <a href="/games">all games</a>.
        </noscript>
      </div>
    );
  return <BrowseContent {...data} />;
}

export function StaticApp({ data }: { data: PageData }) {
  return (
    <PathContext value={data.path}>
      <GoogleAnalytics id={data.ga4Id} nonce="" />
      <Shell sitePermission analyticsEnabled={!!data.ga4Id}>
        {data.kind === "home" ? (
          <HomeContent {...data.props} />
        ) : data.kind === "game" ? (
          <GameContent {...data.props} />
        ) : data.kind === "browse" ? (
          <QueryBrowse initial={data.props} />
        ) : data.kind === "info" ? (
          <InfoContent {...data.props} />
        ) : (
          <div className="page empty-state">
            <h1>Game over? Not quite.</h1>
            <p>This page could not be found.</p>
            <a className="button primary" href="/games">
              Explore games
            </a>
          </div>
        )}
      </Shell>
    </PathContext>
  );
}
