interface CloudflareEnv {
  DB: D1Database;
  CATALOG_SYNC?: Workflow<{
    providerId: "playgama" | "gamepix" | "gamemonetize" | "wgplayground";
  }>;
  ASSETS: Fetcher;
  ANALYTICS?: AnalyticsEngineDataset;
  APP_ENV: string;
  SITE_URL: string;
  SITE_NAME?: string;
  PROVIDER_MODE?: string;
  CONSENT_REQUIRED?: string;
  PLAYER_PERMISSION_MODE?: "site" | "external";
  CONTACT_EMAIL?: string;
  GA4_MEASUREMENT_ID?: string;
  GOOGLE_SITE_VERIFICATION?: string;
  BING_SITE_VERIFICATION?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  PLAYGAMA_CLID?: string;
  PLAYGAMA_API_BASE?: string;
  GAMEPIX_SID?: string;
  GAMEPIX_API_BASE?: string;
  GAMEMONETIZE_FEED_URL?: string;
  WGPLAYGROUND_API_BASE?: string;
  WGPLAYGROUND_PARTNER_ID?: string;
  WGPLAYGROUND_ATTRIBUTION_PARAM?: string;
  PROVIDER_FRAME_ORIGINS?: string;
  PROVIDER_ASSET_ORIGINS?: string;
  PROVIDER_FEED_ORIGINS?: string;
  PROVIDER_MAPPING_JSON?: string;
}
declare namespace Cloudflare {
  // Cloudflare Workers exposes this global augmentation for typed bindings.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Env extends CloudflareEnv {}
}
declare module "*.txt?raw" {
  const text: string;
  export default text;
}
