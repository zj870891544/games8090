import { describe, it, expect } from "vitest";
import {
  normalizeTitle,
  normalizeCategories,
  dedupeConfidence,
  slugify,
} from "../lib/normalize";
import { selectSources } from "../lib/source-selection";
import { aggregateAds } from "../lib/ads.mjs";
import { createSession, verifySession, safeEqual, isAdmin } from "../lib/auth";
import type { Source, Provider, Contract } from "../lib/types";
describe("canonical normalization", () => {
  it("normalizes Unicode, apostrophes, punctuation and whitespace while retaining meaningful numbers", () => {
    expect(
      ["Drift Boss", "DRIFT BOSS ", "Drift—Boss"].map(normalizeTitle),
    ).toEqual(["drift boss", "drift boss", "drift boss"]);
    expect(normalizeTitle(" Ｒacer’s　Club ２ ")).toBe("racers club 2");
    expect(slugify("Neon Drift 2")).toBe("neon-drift-2");
  });
  it("maps category aliases into the taxonomy", () => {
    expect(
      normalizeCategories(["Cars", "Racing", "Puzzles", "2Players", "unknown"]),
    ).toEqual(["Driving", "Racing", "Puzzle", "2 Player", "Multiplayer"]);
  });
  it("does not merge a title alone or different studios", () => {
    const a = {
      title: "Drift Boss",
      description: "A winding driving game",
      developer: null,
    };
    expect(dedupeConfidence(a, a).autoMerge).toBe(false);
    expect(
      dedupeConfidence(
        { ...a, developer: "Studio A" },
        { ...a, developer: "Unrelated Games" },
      ),
    ).toMatchObject({ autoMerge: false, candidate: true });
  });
  it("automatically merges exact title with corroborated developer", () => {
    expect(
      dedupeConfidence(
        {
          title: "Drift Boss",
          description: "Drive well",
          developer: "Example Studio",
        },
        {
          title: "DRIFT-BOSS",
          description: "Drive well",
          developer: "Example Studio",
        },
      ),
    ).toMatchObject({ autoMerge: true, confidence: 0.99 });
  });
});
describe("source selection", () => {
  const providers = [
    { id: "a", enabled: true, priority: 100 },
    { id: "b", enabled: true, priority: 10 },
  ] as Provider[];
  const contracts = [
    { providerId: "a", enabled: true, exclusivity: "non_exclusive" },
    { providerId: "b", enabled: true, exclusivity: "non_exclusive" },
  ] as Contract[];
  const sources = [
    {
      id: "1",
      providerId: "a",
      isActive: true,
      manuallyDisabled: false,
      manualPriority: null,
      providerRank: 1,
      priority: 0,
    },
    {
      id: "2",
      providerId: "b",
      isActive: true,
      manuallyDisabled: false,
      manualPriority: 10,
      providerRank: 0,
      priority: 0,
    },
  ] as Source[];
  it("respects manual priority and then provider priority", () => {
    expect(
      selectSources(sources, providers, contracts).map((s) => s.id),
    ).toEqual(["2", "1"]);
  });
  it("excludes disabled and unavailable sources even with manual priority", () => {
    expect(
      selectSources(
        [{ ...sources[1], manuallyDisabled: true }, sources[0]],
        providers,
        contracts,
      ).map((s) => s.id),
    ).toEqual(["1"]);
    expect(
      selectSources(
        sources,
        providers.map((p) => ({ ...p, enabled: false })),
        contracts,
      ),
    ).toEqual([]);
  });
  it("enforces exclusivity and fails closed on conflicts", () => {
    expect(
      selectSources(sources, providers, [
        { ...contracts[0], exclusivity: "exclusive" },
        contracts[1],
      ]).map((s) => s.id),
    ).toEqual(["1"]);
    expect(
      selectSources(
        sources,
        providers,
        contracts.map((c) => ({ ...c, exclusivity: "exclusive" })),
      ),
    ).toEqual([]);
  });
});
it("aggregates ads.txt without inventing seller records or changing case-sensitive IDs", () => {
  expect(
    aggregateAds([
      "# note\n Example.com , Account42 , direct, cert\n",
      "example.com, Account42, DIRECT, cert\n",
    ]),
  ).toBe("example.com, Account42, DIRECT, cert\n");
  expect(aggregateAds(["# empty"])).toBe("\n");
});
it("signs expiring, audience-bound admin sessions and rejects tampering", async () => {
  const secret = "test-secret-".repeat(5);
  const token = await createSession(secret);
  expect(await verifySession(token, secret)).toBe(true);
  expect(await verifySession(token + "x", secret)).toBe(false);
  expect(await verifySession(token, "wrong".repeat(10))).toBe(false);
  expect(await safeEqual("password", "password")).toBe(true);
  expect(await safeEqual("password", "Password")).toBe(false);
});
it("fails closed on partial Access configuration instead of accepting a cookie fallback", async () => {
  const secret = "test-secret-".repeat(5);
  const token = await createSession(secret);
  const request = new Request("https://arcade.example/admin", {
    headers: { cookie: `arcade_admin=${token}` },
  });
  const env = { ADMIN_SESSION_SECRET: secret } as CloudflareEnv;
  expect(await isAdmin(request, env)).toBe(true);
  expect(
    await isAdmin(request, { ...env, ACCESS_AUD: "configured-audience" }),
  ).toBe(false);
  expect(
    await isAdmin(request, {
      ...env,
      ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
    }),
  ).toBe(false);
  expect(
    await isAdmin(request, {
      ...env,
      ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
      ACCESS_AUD: "configured-audience",
    }),
  ).toBe(false);
});
