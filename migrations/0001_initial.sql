CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`indexable` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dedupe_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`source_a` text NOT NULL,
	`source_b` text NOT NULL,
	`confidence` real NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`source_a`) REFERENCES `game_sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_b`) REFERENCES `game_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dedupe_pair` ON `dedupe_candidates` (`source_a`,`source_b`);--> statement-breakpoint
CREATE TABLE `game_categories` (
	`game_id` text NOT NULL,
	`category_id` text NOT NULL,
	PRIMARY KEY(`game_id`, `category_id`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `category_games_idx` ON `game_categories` (`category_id`);--> statement-breakpoint
CREATE TABLE `game_health` (
	`source_id` text PRIMARY KEY NOT NULL,
	`last_discovery_at` text,
	`http_status` integer,
	`last_reachability_at` text,
	`iframe_attempts` integer DEFAULT 0 NOT NULL,
	`iframe_loads` integer DEFAULT 0 NOT NULL,
	`fallback_events` integer DEFAULT 0 NOT NULL,
	`note` text,
	FOREIGN KEY (`source_id`) REFERENCES `game_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_metrics_daily` (
	`game_id` text NOT NULL,
	`day` text NOT NULL,
	`event` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`active_seconds` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`game_id`, `day`, `event`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_redirects` (
	`slug` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`provider_game_id` text NOT NULL,
	`embed_url` text NOT NULL,
	`override_url` text,
	`source_url` text,
	`thumbnail_url` text NOT NULL,
	`source_title` text NOT NULL,
	`source_description` text DEFAULT '' NOT NULL,
	`source_developer` text,
	`width` integer,
	`height` integer,
	`orientation` text DEFAULT 'any' NOT NULL,
	`provider_rank` real DEFAULT 0 NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`manual_priority` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`manually_disabled` integer DEFAULT false NOT NULL,
	`missing_cycles` integer DEFAULT 0 NOT NULL,
	`last_seen_at` text NOT NULL,
	`last_health_check_at` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_provider_unique` ON `game_sources` (`provider_id`,`provider_game_id`);--> statement-breakpoint
CREATE INDEX `sources_game_idx` ON `game_sources` (`game_id`);--> statement-breakpoint
CREATE INDEX `sources_seen_idx` ON `game_sources` (`provider_id`,`last_seen_at`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`normalized_title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`editorial_description` text DEFAULT '' NOT NULL,
	`developer` text,
	`orientation` text DEFAULT 'any' NOT NULL,
	`supports_mobile` integer DEFAULT false NOT NULL,
	`supports_desktop` integer DEFAULT true NOT NULL,
	`supports_touch` integer DEFAULT false NOT NULL,
	`supports_keyboard` integer DEFAULT false NOT NULL,
	`supports_gamepad` integer DEFAULT false NOT NULL,
	`is_multiplayer` integer DEFAULT false NOT NULL,
	`quality_score` real DEFAULT 0 NOT NULL,
	`trending_score` real DEFAULT 0 NOT NULL,
	`popularity_score` real DEFAULT 0 NOT NULL,
	`publish_status` text DEFAULT 'published' NOT NULL,
	`index_status` text DEFAULT 'noindex' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`controls` text DEFAULT '' NOT NULL,
	`how_to_play` text DEFAULT '' NOT NULL,
	`is_fixture` integer DEFAULT false NOT NULL,
	`editorial_locked` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_slug_unique` ON `games` (`slug`);--> statement-breakpoint
CREATE INDEX `games_normalized_idx` ON `games` (`normalized_title`);--> statement-breakpoint
CREATE INDEX `games_discovery_idx` ON `games` (`publish_status`,`popularity_score`);--> statement-breakpoint
CREATE INDEX `games_seo_idx` ON `games` (`index_status`,`publish_status`);--> statement-breakpoint
CREATE TABLE `homepage_section_games` (
	`section_id` text NOT NULL,
	`game_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`section_id`, `game_id`),
	FOREIGN KEY (`section_id`) REFERENCES `homepage_sections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `homepage_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'auto' NOT NULL,
	`rule` text DEFAULT 'popular' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`item_limit` integer DEFAULT 6 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `provider_contract_config` (
	`provider_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`exclusivity` text DEFAULT 'non_exclusive' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`last_sync_at` text,
	`sync_lock` text,
	`lock_until` text
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_metrics_daily` (
	`day` text NOT NULL,
	`event` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `event`)
);
--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`status` text NOT NULL,
	`mode` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`received` integer DEFAULT 0 NOT NULL,
	`inserted` integer DEFAULT 0 NOT NULL,
	`updated` integer DEFAULT 0 NOT NULL,
	`missing` integer DEFAULT 0 NOT NULL,
	`errors` integer DEFAULT 0 NOT NULL,
	`error_summary` text,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sync_provider_idx` ON `sync_runs` (`provider_id`,`started_at`);