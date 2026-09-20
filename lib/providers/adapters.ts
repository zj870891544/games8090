import { z } from "zod";
import { XMLParser } from "fast-xml-parser";
import type {
  CatalogResult,
  GameProvider,
  NormalizedProviderGame,
  ProviderId,
  Source,
} from "../types";
import { normalizeCategories, plainText } from "../normalize";
import {
  atPath,
  defaultAssets,
  defaultFeeds,
  defaultFrames,
  mappingFor,
  origins,
  providerNames,
  remap,
  safeUrl,
  type ProviderEnv,
  type ProviderMapping,
} from "./config";
import fixtures from "../../fixtures/providers.json";
const id = z.union([z.string().min(1), z.number()]).transform(String);
const str = z.string().max(20000);
const categories = z
  .union([
    z.array(z.union([z.string(), z.number()]).transform(String)),
    z.string().transform((s) => s.split(/[,;|]/).map((s) => s.trim())),
  ])
  .default([]);
const dim = z.coerce.number().int().positive().max(10000).nullable().optional();
const flag = z
  .union([
    z.boolean(),
    z.literal(0),
    z.literal(1),
    z.literal("0"),
    z.literal("1"),
  ])
  .transform((v) => v === true || v === 1 || v === "1")
  .optional();
// Development fixtures model these schemas; unknown dashboard variants require an explicit field mapping.
export const playgamaSchema = z.object({
  id,
  title: str,
  description: str.default(""),
  developer: str.nullish(),
  gameURL: str,
  thumbnail: str,
  categories,
  width: dim,
  height: dim,
  orientation: str.optional(),
  mobile: flag,
  touch: flag,
  keyboard: flag,
  rank: z.coerce.number().optional(),
  controls: str.optional(),
  howToPlay: str.optional(),
  tags: categories,
});
// Current official widgets.playgama.com catalogue response, verified live.
// The legacy export-list schema remains supported for existing accounts.
const playgamaCatalogSchema = z.object({
  id,
  title: str,
  description: str.default(""),
  gameURL: str,
  images: z.array(str).min(1),
  genres: z.array(str).default([]),
  tags: categories,
  developer: str.nullish(),
  howToPlayText: str.optional(),
  mobileReady: z
    .array(z.enum(["For Android", "For IOS", "For Desktop"]))
    .default([]),
  screenOrientation: z
    .object({ horizontal: z.boolean(), vertical: z.boolean() })
    .optional(),
  width: dim,
  height: dim,
});
export const gamepixSchema = z.object({
  id,
  title: str,
  description: str.default(""),
  author: str.nullish(),
  url: str,
  thumbnailUrl: str,
  categories,
  category: z.union([z.string(), z.number()]).optional(),
  width: dim,
  height: dim,
  orientation: str.optional(),
  responsive: flag,
  touch: flag,
  hwcontrols: flag,
  rkScore: z.coerce.number().optional(),
  controls: str.optional(),
  howToPlay: str.optional(),
  tags: categories,
  creation: str.optional(),
  lastUpdate: str.optional(),
});
export const gamemonetizeSchema = z.object({
  id,
  title: str,
  description: str.default(""),
  author: str.nullish(),
  url: str,
  thumb: str,
  category: categories,
  width: dim,
  height: dim,
  mobile: flag,
  instructions: str.optional(),
  tags: categories,
});
export const wgplaygroundSchema = z.object({
  id,
  title: str,
  description: str.default(""),
  developer: str.nullish(),
  url: str,
  thumbnail: str,
  categories,
  width: dim,
  height: dim,
  orientation: str.optional(),
  mobile: flag,
  controls: str.optional(),
  tags: categories,
});
export abstract class BaseProvider implements GameProvider {
  abstract id: ProviderId;
  constructor(
    protected env: ProviderEnv = {},
    // workerd's native fetch requires its global receiver; calling an unbound
    // native function as this.fetcher() works in Node but fails in Workers.
    protected fetcher: typeof fetch = (input, init) => fetch(input, init),
  ) {}
  protected get mapping() {
    return mappingFor(this.id, this.env);
  }
  protected abstract required(): string[];
  validateConfig() {
    const required = this.required();
    const missing = required.filter((k) => !this.env[k as keyof ProviderEnv]);
    const mode = this.env.PROVIDER_MODE || "auto";
    const any = required.some((k) => Boolean(this.env[k as keyof ProviderEnv]));
    const fixture =
      mode === "fixture" ||
      (mode === "auto" &&
        !any &&
        this.env.APP_ENV !== "production" &&
        this.env.APP_ENV !== "preview");
    return {
      ready: fixture || missing.length === 0,
      mode: fixture
        ? ("fixture" as const)
        : missing.length
          ? ("blocked" as const)
          : ("live" as const),
      missing,
      note: fixture
        ? "Development samples, not licensed catalog data."
        : missing.length
          ? "Complete server-side credentials before syncing."
          : "Live feed; verify account schema, attribution and contract before publication.",
    };
  }
  abstract normalize(raw: unknown): NormalizedProviderGame;
  protected finish(
    data: Partial<NormalizedProviderGame> &
      Pick<
        NormalizedProviderGame,
        "providerGameId" | "title" | "embedUrl" | "thumbnail"
      >,
  ): NormalizedProviderGame {
    const fixture = this.validateConfig().mode === "fixture";
    const sourceCategories = data.sourceCategories || [];
    const mapped = sourceCategories.map(
      (v) => this.mapping.categoryMap?.[v] || v,
    );
    const cats = normalizeCategories(mapped);
    const embedUrl = safeUrl(
      data.embedUrl,
      origins(this.env.PROVIDER_FRAME_ORIGINS, defaultFrames),
      fixture,
    );
    const thumbnail = safeUrl(
      data.thumbnail,
      origins(this.env.PROVIDER_ASSET_ORIGINS, defaultAssets),
      fixture,
    );
    return {
      providerId: this.id,
      providerGameId: data.providerGameId,
      title: plainText(data.title),
      description: plainText(data.description || ""),
      developer: data.developer ? plainText(data.developer) : null,
      embedUrl,
      sourceUrl: null,
      thumbnail,
      categories: cats,
      sourceCategories,
      tags: data.tags || [],
      width: data.width || null,
      height: data.height || null,
      orientation: data.orientation || "any",
      supportsMobile: data.supportsMobile || false,
      supportsDesktop: data.supportsDesktop ?? true,
      supportsTouch: data.supportsTouch || false,
      supportsKeyboard: data.supportsKeyboard || false,
      supportsGamepad: false,
      isMultiplayer: cats.includes("Multiplayer") || cats.includes("2 Player"),
      rank: data.rank || 0,
      controls: plainText(data.controls || ""),
      howToPlay: plainText(data.howToPlay || ""),
      fixture,
      metadata: { sourceCategories, fixture, ...data.metadata },
    };
  }
  getEmbedConfig(source: Source) {
    const metadata = JSON.parse(source.metadataJson) as { fixture?: boolean };
    return {
      sourceId: source.id,
      providerName: providerNames[this.id],
      url: safeUrl(
        source.overrideUrl || source.embedUrl,
        origins(this.env.PROVIDER_FRAME_ORIGINS, defaultFrames),
        Boolean(metadata.fixture),
      ),
      allow:
        this.mapping.allow ||
        (this.id === "wgplayground" ? "fullscreen; autoplay" : "fullscreen"),
      orientation: source.orientation,
      fixture: Boolean(metadata.fixture),
    };
  }
  protected async request(
    url: string,
    init: {
      method?: string;
      body?: string;
      headers?: Record<string, string>;
    } = {},
  ): Promise<unknown> {
    safeUrl(url, origins(this.env.PROVIDER_FEED_ORIGINS, defaultFeeds));
    const response = await this.fetcher(url, {
      ...init,
      // Workers supports manual/follow, not redirect:error. Reject 3xx below
      // without following Location to an unapproved host.
      redirect: "manual",
      signal: AbortSignal.timeout(45000),
      headers: {
        Accept: "application/json, application/rss+xml;q=0.9",
        ...init.headers,
      },
    });
    if (!response.ok)
      throw new Error(`Provider returned HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty response");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 20_000_000) {
        await reader.cancel();
        throw new Error("Feed exceeds 20 MB page limit");
      }
      chunks.push(value);
    }
    const all = new Uint8Array(size);
    let offset = 0;
    for (const part of chunks) {
      all.set(part, offset);
      offset += part.length;
    }
    const text = new TextDecoder().decode(all);
    if (text.trimStart().startsWith("<")) {
      if (/<!DOCTYPE|<!ENTITY/i.test(text))
        throw new Error("XML entities are not supported");
      return new XMLParser({
        ignoreAttributes: false,
        processEntities: false,
        parseTagValue: false,
      }).parse(text) as unknown;
    }
    return JSON.parse(text) as unknown;
  }
  protected items(
    raw: unknown,
    mapping: ProviderMapping = this.mapping,
  ): unknown[] {
    const rows = mapping.itemsPath ? atPath(raw, mapping.itemsPath) : raw;
    if (!Array.isArray(rows))
      throw new Error(
        "Feed envelope differs from configured itemsPath. Map the actual publisher response.",
      );
    return z.array(z.unknown()).max(50000).parse(rows);
  }
  protected abstract loadPage(
    page: number,
  ): Promise<{ rows: unknown[]; done: boolean; complete: boolean }>;
  async readCatalogPage(
    page: number,
  ): Promise<CatalogResult & { done: boolean }> {
    const state = this.validateConfig();
    if (!state.ready)
      throw new Error(`Missing configuration: ${state.missing.join(", ")}`);
    if (state.mode === "fixture")
      return {
        games:
          page === 1
            ? (fixtures[this.id] as unknown[]).map((v) => this.normalize(v))
            : [],
        complete: true,
        done: true,
        mode: "fixture",
      };
    const result = await this.loadPage(page);
    const games = result.rows.map((row) =>
      this.normalize(remap(row, this.mapping)),
    );
    return {
      games,
      complete: result.complete,
      done: result.done,
      mode: "live",
    };
  }
  async syncCatalog(): Promise<CatalogResult> {
    const games: NormalizedProviderGame[] = [];
    const seen = new Set<string>();
    for (let page = 1; page <= 500; page++) {
      const result = await this.readCatalogPage(page);
      for (const game of result.games) {
        if (seen.has(game.providerGameId))
          throw new Error(
            "Duplicate provider IDs across pages; catalog completeness cannot be established",
          );
        seen.add(game.providerGameId);
        games.push(game);
      }
      if (games.length > 50000) throw new Error("Catalog record limit reached");
      if (result.done)
        return { games, complete: result.complete, mode: result.mode };
    }
    throw new Error(
      "Catalog page limit reached; no sources will be marked missing",
    );
  }
}
function orientation(
  value: string | undefined,
): "landscape" | "portrait" | "any" {
  return value === "landscape" || value === "portrait" ? value : "any";
}
export class PlaygamaProvider extends BaseProvider {
  id = "playgama" as const;
  protected required() {
    return ["PLAYGAMA_CLID", "PLAYGAMA_API_BASE"];
  }
  normalize(raw: unknown) {
    let desktop: boolean | undefined;
    if (
      this.env.PLAYGAMA_API_BASE?.endsWith("/partner/export/catalogue/games") &&
      this.validateConfig().mode === "live"
    ) {
      const current = playgamaCatalogSchema.parse(raw);
      desktop = current.mobileReady.includes("For Desktop");
      const mobile = current.mobileReady.some(
        (device) => device === "For Android" || device === "For IOS",
      );
      raw = {
        ...current,
        thumbnail: current.images[0],
        categories: current.genres,
        mobile,
        touch: mobile,
        howToPlay: current.howToPlayText,
        orientation:
          current.screenOrientation?.horizontal &&
          !current.screenOrientation.vertical
            ? "landscape"
            : current.screenOrientation?.vertical &&
                !current.screenOrientation.horizontal
              ? "portrait"
              : "any",
      };
    }
    const v = playgamaSchema.parse(raw);
    let url = v.gameURL;
    if (this.validateConfig().mode === "live") {
      const parsed = new URL(url);
      if (!parsed.searchParams.has("clid"))
        parsed.searchParams.set("clid", this.env.PLAYGAMA_CLID!);
      else if (parsed.searchParams.get("clid") !== this.env.PLAYGAMA_CLID)
        throw new Error("CLID mismatch in feed; verify publisher account");
      url = parsed.href;
    }
    return this.finish({
      providerGameId: v.id,
      title: v.title,
      description: v.description,
      developer: v.developer,
      embedUrl: url,
      thumbnail: v.thumbnail,
      sourceCategories: v.categories,
      orientation: orientation(v.orientation),
      width: v.width,
      height: v.height,
      supportsMobile: v.mobile,
      supportsDesktop: desktop,
      supportsTouch: v.touch,
      supportsKeyboard: v.keyboard,
      rank: v.rank,
      controls: v.controls,
      howToPlay: v.howToPlay,
      tags: v.tags,
    });
  }
  protected async loadPage(page: number) {
    const url = new URL(this.env.PLAYGAMA_API_BASE!);
    if (url.pathname.endsWith("/partner/export/catalogue/games")) {
      const data = z
        .object({
          games: z.array(z.unknown()).max(100),
          totalCount: z.number().int().nonnegative(),
        })
        .parse(
          await this.request(url.href, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pagination: { limit: 100, offset: (page - 1) * 100 },
              filters: {},
            }),
          }),
        );
      if (!data.games.length && (page - 1) * 100 < data.totalCount)
        throw new Error("Catalog ended before the advertised total");
      return {
        rows: data.games,
        done: (page - 1) * 100 + data.games.length >= data.totalCount,
        complete: true,
      };
    }
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("clid", this.env.PLAYGAMA_CLID!);
    const rows = this.items(await this.request(url.href));
    return { rows, done: rows.length < 100, complete: true };
  }
}
export class GamepixProvider extends BaseProvider {
  id = "gamepix" as const;
  protected required() {
    return ["GAMEPIX_SID", "GAMEPIX_API_BASE"];
  }
  normalize(raw: unknown) {
    const v = gamepixSchema.parse(raw);
    let url = v.url;
    if (this.validateConfig().mode === "live") {
      const parsed = new URL(url);
      if (!parsed.searchParams.has("sid"))
        parsed.searchParams.set("sid", this.env.GAMEPIX_SID!);
      else if (parsed.searchParams.get("sid") !== this.env.GAMEPIX_SID)
        throw new Error("SID mismatch in feed; verify publisher account");
      url = parsed.href;
    }
    return this.finish({
      providerGameId: v.id,
      title: v.title,
      description: v.description,
      developer: v.author,
      embedUrl: url,
      thumbnail: v.thumbnailUrl,
      sourceCategories: [
        ...v.categories,
        ...(v.category !== undefined ? [String(v.category)] : []),
      ],
      width: v.width,
      height: v.height,
      orientation: orientation(v.orientation),
      supportsMobile: v.touch,
      supportsTouch: v.touch,
      supportsKeyboard: v.hwcontrols,
      rank: v.rkScore,
      controls: v.controls,
      howToPlay: v.howToPlay,
      tags: v.tags,
      metadata: {
        responsive: v.responsive,
        creation: v.creation,
        lastUpdate: v.lastUpdate,
      },
    });
  }
  protected async loadPage(page: number) {
    const url = new URL(this.env.GAMEPIX_API_BASE!);
    url.searchParams.set("sid", this.env.GAMEPIX_SID!);
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", String((page - 1) * 100));
    const rows = this.items(await this.request(url.href));
    return { rows, done: rows.length < 100, complete: true };
  }
}
export class GamemonetizeProvider extends BaseProvider {
  id = "gamemonetize" as const;
  protected required() {
    return ["GAMEMONETIZE_FEED_URL"];
  }
  normalize(raw: unknown) {
    const v = gamemonetizeSchema.parse(raw);
    return this.finish({
      providerGameId: v.id,
      title: v.title,
      description: v.description,
      developer: v.author,
      embedUrl: v.url,
      thumbnail: v.thumb,
      sourceCategories: v.category,
      width: v.width,
      height: v.height,
      supportsMobile: v.mobile,
      supportsTouch: v.mobile,
      howToPlay: v.instructions,
      tags: v.tags,
    });
  }
  protected async loadPage(_page: number) {
    const raw = await this.request(this.env.GAMEMONETIZE_FEED_URL!);
    const rss = atPath(raw, "rss.channel.item");
    const rows =
      rss !== undefined ? (Array.isArray(rss) ? rss : [rss]) : this.items(raw);
    return { rows, done: true, complete: this.mapping.fullCatalog === true };
  }
}
export class WgplaygroundProvider extends BaseProvider {
  id = "wgplayground" as const;
  protected required() {
    return this.env.WGPLAYGROUND_PARTNER_ID
      ? ["WGPLAYGROUND_API_BASE", "WGPLAYGROUND_ATTRIBUTION_PARAM"]
      : ["WGPLAYGROUND_API_BASE"];
  }
  normalize(raw: unknown) {
    const v = wgplaygroundSchema.parse(raw);
    let url = v.url;
    if (
      this.env.WGPLAYGROUND_PARTNER_ID &&
      this.env.WGPLAYGROUND_ATTRIBUTION_PARAM
    ) {
      const u = new URL(url);
      const existing = u.searchParams.get(
        this.env.WGPLAYGROUND_ATTRIBUTION_PARAM,
      );
      if (existing && existing !== this.env.WGPLAYGROUND_PARTNER_ID)
        throw new Error("Partner attribution differs from configuration");
      u.searchParams.set(
        this.env.WGPLAYGROUND_ATTRIBUTION_PARAM,
        this.env.WGPLAYGROUND_PARTNER_ID,
      );
      url = u.href;
    }
    return this.finish({
      providerGameId: v.id,
      title: v.title,
      description: v.description,
      developer: v.developer,
      embedUrl: url,
      thumbnail: v.thumbnail,
      sourceCategories: v.categories,
      width: v.width,
      height: v.height,
      orientation: orientation(v.orientation),
      supportsMobile: v.mobile,
      supportsTouch: v.mobile,
      controls: v.controls,
      tags: v.tags,
    });
  }
  protected async loadPage(page: number) {
    const base = this.env.WGPLAYGROUND_API_BASE!.replace(/\/$/, "");
    const paginated = base.endsWith("/get_games");
    const rows = this.items(
      await this.request(paginated ? `${base}/100/${(page - 1) * 100}` : base),
    );
    return { rows, done: !paginated || rows.length < 100, complete: paginated };
  }
}
export const providerFactories: Record<
  ProviderId,
  (env: ProviderEnv) => GameProvider
> = {
  playgama: (env) => new PlaygamaProvider(env),
  gamepix: (env) => new GamepixProvider(env),
  gamemonetize: (env) => new GamemonetizeProvider(env),
  wgplayground: (env) => new WgplaygroundProvider(env),
};
export const createProvider = (id: ProviderId, env: ProviderEnv) =>
  providerFactories[id](env);
