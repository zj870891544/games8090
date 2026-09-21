import type { HomeContentProps } from "../components/HomeContent";
import type { GameContentProps } from "../components/GameContent";
import type { CatalogEntry } from "../lib/static-catalog";

/** Only public, publishable fields may be saved in the committed snapshot. */
export interface PublishedSnapshot {
  generatedAt: string;
  siteUrl: string;
  ga4Id: string;
  google: string;
  bing: string;
  email: string;
  home: HomeContentProps;
  catalog: CatalogEntry[];
  games: { props: GameContentProps; indexable: boolean }[];
  categories: { id: string; name: string; indexable: boolean }[];
  redirects: { from: string; to: string }[];
}
