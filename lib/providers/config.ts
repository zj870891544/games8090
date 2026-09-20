import { z } from "zod";
import playgamaFrames from "../../config/providers/playgama-frame-origins.json";
import type { ProviderId } from "../types";
export type ProviderEnv = Partial<
  Omit<CloudflareEnv, "DB" | "ASSETS" | "ANALYTICS" | "CATALOG_SYNC">
>;
export const providerNames: Record<ProviderId, string> = {
  playgama: "Playgama",
  gamepix: "GamePix",
  gamemonetize: "GameMonetize",
  wgplayground: "WGPlayground",
};
export const defaultFrames = [
  ...playgamaFrames,
  "https://playgama.com",
  "https://games.gamepix.com",
  "https://play.gamepix.com",
  "https://html5.gamemonetize.com",
  "https://html5.gamemonetize.co",
  "https://play.wgplayground.com",
];
export const defaultAssets = [
  "https://img.gamepix.com",
  "https://games.assets.gamepix.com",
  "https://img.gamemonetize.com",
  "https://playgama.com",
  "https://www.wgplayground.com",
  "https://static.playgama.com",
];
export const defaultFeeds = [
  "https://playgama.com",
  "https://games.gamepix.com",
  "https://rss.gamemonetize.com",
  "https://www.wgplayground.com",
];
export function origins(
  extra: string | undefined,
  defaults: string[],
): string[] {
  return [
    ...new Set([
      ...defaults,
      ...(extra || "")
        .split(",")
        .filter(Boolean)
        .map((s) => s.trim()),
    ]),
  ].filter((v) => {
    try {
      const u = new URL(v);
      return (
        u.protocol === "https:" && u.origin === v && !u.username && !u.password
      );
    } catch {
      return false;
    }
  });
}
export function safeUrl(
  value: string,
  allow: string[],
  fixture = false,
): string {
  if (
    fixture &&
    /^\/fixtures\/player\?game=[a-z0-9-]+(?:&source=[a-z0-9-]+)?$/.test(value)
  )
    return value;
  if (fixture && /^\/art\/[a-z0-9.-]+$/.test(value)) return value;
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !allow.includes(url.origin)
  )
    throw new Error(
      "URL origin is not configured. Review provider allowlists.",
    );
  return url.href;
}
export const mappingSchema = z.object({
  itemsPath: z.string().optional(),
  fields: z.record(z.string(), z.string()).optional(),
  categoryMap: z.record(z.string(), z.string()).optional(),
  fullCatalog: z.boolean().optional(),
  allow: z
    .string()
    .regex(/^[a-z -]+(?:;[a-z -]+)*$/)
    .optional(),
});
export type ProviderMapping = z.infer<typeof mappingSchema>;
export function mappingFor(id: ProviderId, env: ProviderEnv): ProviderMapping {
  if (!env.PROVIDER_MAPPING_JSON) return {};
  return (
    z
      .record(z.string(), mappingSchema)
      .parse(JSON.parse(env.PROVIDER_MAPPING_JSON))[id] || {}
  );
}
export function atPath(value: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (v, k) =>
        v && typeof v === "object" && Object.hasOwn(v, k)
          ? (v as Record<string, unknown>)[k]
          : undefined,
      value,
    );
}
export function remap(raw: unknown, mapping: ProviderMapping): unknown {
  if (!mapping.fields) return raw;
  const result: Record<string, unknown> = {};
  for (const [key, path] of Object.entries(mapping.fields))
    result[key] = atPath(raw, path);
  return result;
}
