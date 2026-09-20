import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
export const providers = sqliteTable("providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  priority: integer("priority").notNull().default(0),
  lastSyncAt: text("last_sync_at"),
  syncLock: text("sync_lock"),
  lockUntil: text("lock_until"),
});
export const games = sqliteTable(
  "games",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    description: text("description").notNull().default(""),
    editorialDescription: text("editorial_description").notNull().default(""),
    developer: text("developer"),
    orientation: text("orientation").notNull().default("any"),
    supportsMobile: integer("supports_mobile", { mode: "boolean" })
      .notNull()
      .default(false),
    supportsDesktop: integer("supports_desktop", { mode: "boolean" })
      .notNull()
      .default(true),
    supportsTouch: integer("supports_touch", { mode: "boolean" })
      .notNull()
      .default(false),
    supportsKeyboard: integer("supports_keyboard", { mode: "boolean" })
      .notNull()
      .default(false),
    supportsGamepad: integer("supports_gamepad", { mode: "boolean" })
      .notNull()
      .default(false),
    isMultiplayer: integer("is_multiplayer", { mode: "boolean" })
      .notNull()
      .default(false),
    qualityScore: real("quality_score").notNull().default(0),
    trendingScore: real("trending_score").notNull().default(0),
    popularityScore: real("popularity_score").notNull().default(0),
    publishStatus: text("publish_status").notNull().default("published"),
    indexStatus: text("index_status").notNull().default("noindex"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    tags: text("tags").notNull().default(""),
    controls: text("controls").notNull().default(""),
    howToPlay: text("how_to_play").notNull().default(""),
    isFixture: integer("is_fixture", { mode: "boolean" })
      .notNull()
      .default(false),
    editorialLocked: integer("editorial_locked", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("games_normalized_idx").on(t.normalizedTitle),
    index("games_new_idx").on(t.publishStatus, t.createdAt),
    index("games_trending_idx").on(t.publishStatus, t.trendingScore),
    index("games_quality_idx").on(t.publishStatus, t.qualityScore),
    index("games_discovery_idx").on(t.publishStatus, t.popularityScore),
    index("games_seo_idx").on(t.indexStatus, t.publishStatus),
  ],
);
export const gameSources = sqliteTable(
  "game_sources",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id),
    providerGameId: text("provider_game_id").notNull(),
    embedUrl: text("embed_url").notNull(),
    overrideUrl: text("override_url"),
    sourceUrl: text("source_url"),
    thumbnailUrl: text("thumbnail_url").notNull(),
    sourceTitle: text("source_title").notNull(),
    sourceDescription: text("source_description").notNull().default(""),
    sourceDeveloper: text("source_developer"),
    width: integer("width"),
    height: integer("height"),
    orientation: text("orientation").notNull().default("any"),
    providerRank: real("provider_rank").notNull().default(0),
    priority: integer("priority").notNull().default(0),
    manualPriority: integer("manual_priority"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    manuallyDisabled: integer("manually_disabled", { mode: "boolean" })
      .notNull()
      .default(false),
    missingCycles: integer("missing_cycles").notNull().default(0),
    lastSeenAt: text("last_seen_at").notNull(),
    lastHealthCheckAt: text("last_health_check_at"),
    metadataJson: text("metadata_json").notNull().default("{}"),
  },
  (t) => [
    uniqueIndex("source_provider_unique").on(t.providerId, t.providerGameId),
    index("sources_game_idx").on(t.gameId),
    index("sources_seen_idx").on(t.providerId, t.lastSeenAt),
  ],
);
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  indexable: integer("indexable", { mode: "boolean" }).notNull().default(false),
});
export const gameCategories = sqliteTable(
  "game_categories",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
  },
  (t) => [
    primaryKey({ columns: [t.gameId, t.categoryId] }),
    index("category_games_idx").on(t.categoryId),
  ],
);
export const dedupeCandidates = sqliteTable(
  "dedupe_candidates",
  {
    id: text("id").primaryKey(),
    sourceA: text("source_a")
      .notNull()
      .references(() => gameSources.id),
    sourceB: text("source_b")
      .notNull()
      .references(() => gameSources.id),
    confidence: real("confidence").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("dedupe_pair").on(t.sourceA, t.sourceB)],
);
export const homepageSections = sqliteTable("homepage_sections", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("auto"),
  rule: text("rule").notNull().default("popular"),
  position: integer("position").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  limit: integer("item_limit").notNull().default(6),
});
export const homepageSectionGames = sqliteTable(
  "homepage_section_games",
  {
    sectionId: text("section_id")
      .notNull()
      .references(() => homepageSections.id),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.sectionId, t.gameId] })],
);
export const syncRuns = sqliteTable(
  "sync_runs",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id),
    status: text("status").notNull(),
    mode: text("mode").notNull(),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    received: integer("received").notNull().default(0),
    inserted: integer("inserted").notNull().default(0),
    updated: integer("updated").notNull().default(0),
    missing: integer("missing").notNull().default(0),
    errors: integer("errors").notNull().default(0),
    errorSummary: text("error_summary"),
  },
  (t) => [index("sync_provider_idx").on(t.providerId, t.startedAt)],
);
export const gameHealth = sqliteTable("game_health", {
  sourceId: text("source_id")
    .primaryKey()
    .references(() => gameSources.id),
  lastDiscoveryAt: text("last_discovery_at"),
  httpStatus: integer("http_status"),
  lastReachabilityAt: text("last_reachability_at"),
  iframeAttempts: integer("iframe_attempts").notNull().default(0),
  iframeLoads: integer("iframe_loads").notNull().default(0),
  fallbackEvents: integer("fallback_events").notNull().default(0),
  note: text("note"),
});
export const gameMetricsDaily = sqliteTable(
  "game_metrics_daily",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    day: text("day").notNull(),
    event: text("event").notNull(),
    count: integer("count").notNull().default(0),
    activeSeconds: integer("active_seconds").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.day, t.event] })],
);
export const providerContractConfig = sqliteTable("provider_contract_config", {
  providerId: text("provider_id")
    .primaryKey()
    .references(() => providers.id),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  exclusivity: text("exclusivity").notNull().default("non_exclusive"),
  notes: text("notes").notNull().default(""),
});
export const gameRedirects = sqliteTable("game_redirects", {
  slug: text("slug").primaryKey(),
  gameId: text("game_id")
    .notNull()
    .references(() => games.id),
});
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  window: integer("window").notNull(),
  count: integer("count").notNull().default(0),
});
export const siteMetricsDaily = sqliteTable(
  "site_metrics_daily",
  {
    day: text("day").notNull(),
    event: text("event").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.event] })],
);

export const syncStaging = sqliteTable(
  "sync_staging",
  {
    page: integer("page").notNull().default(1),
    syncId: text("sync_id")
      .notNull()
      .references(() => syncRuns.id, { onDelete: "cascade" }),
    providerGameId: text("provider_game_id").notNull(),
    payload: text("payload").notNull(),
    percentile: real("percentile").notNull(),
    isNew: integer("is_new", { mode: "boolean" }).notNull(),
    imported: integer("imported", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.syncId, t.providerGameId] }),
    index("sync_staging_pending_idx").on(t.syncId, t.imported),
  ],
);
