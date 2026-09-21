import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  catalogSlice,
  queryCatalog,
  type CatalogEntry,
} from "../lib/static-catalog";
import {
  jsonForHtml,
  playableSources,
  publicGame,
} from "../static/public-data";
import type { PublishedSnapshot } from "../static/snapshot";
import type { GameDetail } from "../lib/types";

const published = JSON.parse(
  readFileSync(
    new URL("../static/published-catalog.json", import.meta.url),
    "utf8",
  ),
) as PublishedSnapshot;
describe("static publication", () => {
  it("keeps all catalog pages distinct with a finite last batch", () => {
    const ids: string[] = [];
    let page: number | null = 1;
    while (page !== null) {
      const batch = catalogSlice(published.catalog, {}, page);
      ids.push(...batch.games.map((g) => g.id));
      page = batch.nextPage;
    }
    expect(new Set(ids).size).toBe(published.catalog.length);
    expect(ids.length).toBe(published.catalog.length);
  });
  it("searches Unicode prefixes and combines query/category filters", () => {
    const catalog = [
      {
        ...published.catalog[0],
        card: {
          ...published.catalog[0].card,
          title: "Racing Car 2",
          categories: ["racing"],
        },
        search: "Racing Car 2",
      },
    ] satisfies CatalogEntry[];
    expect(
      queryCatalog(catalog, { query: "ＲＡＣ car", category: "racing" }),
    ).toHaveLength(1);
    expect(queryCatalog(catalog, { query: "car", category: "puzzle" })).toEqual(
      [],
    );
    expect(queryCatalog(catalog, { query: "<><>" })).toEqual([]);
    expect(queryCatalog(catalog, { slugs: [] })).toEqual([]);
    expect(queryCatalog(published.catalog, { query: "2048" })[0].slug).toBe(
      "2048",
    );
  });
  it("does not mutate popular order when browsing newest or saved titles", () => {
    const original = JSON.stringify(published.catalog);
    const newest = queryCatalog(published.catalog, { sort: "new" });
    const lookup = queryCatalog(published.catalog, { slugs: [newest[0].slug] });
    expect(lookup.map((g) => g.slug)).toEqual([newest[0].slug]);
    expect(JSON.stringify(published.catalog)).toBe(original);
  });
  it("publishes only actual games and preserves provider attribution", () => {
    expect(published.games.length).toBeGreaterThan(500);
    for (const { props } of published.games) {
      expect(props.game.isFixture).toBe(false);
      expect(props.sources.length).toBeGreaterThan(0);
      expect(props.game).not.toHaveProperty("editorialLocked");
      for (const source of props.sources) {
        expect(source.fixture).toBe(false);
        expect(new URL(source.url).protocol).toBe("https:");
        expect(source).not.toHaveProperty("metadataJson");
        if (source.providerName === "GamePix")
          expect(new URL(source.url).searchParams.get("sid")).toBe("G1MS1");
      }
    }
    expect(JSON.stringify(published.games)).toContain(
      "p_07f32c8e-79a8-4b26-8eee-b652d5751ac3",
    );
  });
  it("cannot leak private record fields through public projections", () => {
    const game = publicGame({
      ...published.games[0].props.game,
      editorialLocked: true,
      metadataJson: "private",
      password: "private",
    } as unknown as GameDetail);
    expect(game).not.toHaveProperty("metadataJson");
    expect(game).not.toHaveProperty("password");
    expect(game).not.toHaveProperty("editorialLocked");
    const source = published.games[0].props.sources[0];
    expect(
      playableSources([
        { ...source, fixture: true },
        { ...source, url: "/fixtures/player" },
      ]),
    ).toEqual([]);
  });
  it("serializes hostile game descriptions without escaping their JSON script element", () => {
    const attack = { description: '</script><script>alert("x")</script>' };
    const encoded = jsonForHtml(attack);
    expect(encoded).not.toContain("<");
    expect(JSON.parse(encoded)).toEqual(attack);
  });
});
