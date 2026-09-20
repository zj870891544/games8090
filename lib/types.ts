import type {
  games,
  gameSources,
  providers,
  providerContractConfig,
  homepageSections,
} from "./db/schema";
export const providerIds = [
  "playgama",
  "gamepix",
  "gamemonetize",
  "wgplayground",
] as const;
export type ProviderId = (typeof providerIds)[number];
export type Game = typeof games.$inferSelect;
export type Source = typeof gameSources.$inferSelect;
export type Provider = typeof providers.$inferSelect;
export type Contract = typeof providerContractConfig.$inferSelect;
export type HomeSection = typeof homepageSections.$inferSelect;
export type GameCardData = Pick<
  Game,
  | "id"
  | "slug"
  | "title"
  | "supportsMobile"
  | "isMultiplayer"
  | "isFixture"
  | "featured"
> & { thumbnail: string; categories: string[]; badge?: string };
export type GameDetail = Game & {
  sources: Source[];
  categories: string[];
  thumbnail: string;
  plays: number;
};
export interface NormalizedProviderGame {
  providerId: ProviderId;
  providerGameId: string;
  title: string;
  description: string;
  developer: string | null;
  embedUrl: string;
  sourceUrl: string | null;
  thumbnail: string;
  categories: string[];
  sourceCategories: string[];
  tags: string[];
  width: number | null;
  height: number | null;
  orientation: "landscape" | "portrait" | "any";
  supportsMobile: boolean;
  supportsDesktop: boolean;
  supportsTouch: boolean;
  supportsKeyboard: boolean;
  supportsGamepad: boolean;
  isMultiplayer: boolean;
  rank: number;
  controls: string;
  howToPlay: string;
  fixture: boolean;
  metadata: Record<string, unknown>;
}
export interface EmbedConfig {
  sourceId: string;
  providerName: string;
  url: string;
  allow: string;
  orientation: string;
  fixture: boolean;
}
export interface ProviderConfigStatus {
  ready: boolean;
  mode: "fixture" | "live" | "blocked";
  missing: string[];
  note: string;
}
export interface CatalogResult {
  games: NormalizedProviderGame[];
  complete: boolean;
  mode: "fixture" | "live";
}
export interface GameProvider {
  id: ProviderId;
  syncCatalog(): Promise<CatalogResult>;
  readCatalogPage?(page: number): Promise<CatalogResult & { done: boolean }>;
  normalize(raw: unknown): NormalizedProviderGame;
  getEmbedConfig(source: Source): EmbedConfig;
  validateConfig(): ProviderConfigStatus;
}
