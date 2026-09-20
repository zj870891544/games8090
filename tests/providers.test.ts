import { describe, it, expect, vi } from "vitest";
import fixtures from "../fixtures/providers.json";
import { providerIds } from "../lib/types";
import {
  createProvider,
  GamepixProvider,
  GamemonetizeProvider,
  PlaygamaProvider,
  WgplaygroundProvider,
} from "../lib/providers/adapters";
import { safeUrl, defaultFrames } from "../lib/providers/config";
const fixtureEnv = { APP_ENV: "local", PROVIDER_MODE: "fixture" };
describe("four provider adapters", () => {
  it("reads the current Playgama catalogue with POST pagination and preserves CLID", async () => {
    // Synthetic values in the field structure observed in the official live API.
    const row = {
      id: "sample",
      title: "Sample Puzzle",
      description: "A sample.",
      gameURL: "https://playgama.com/export/game/sample?lang=en",
      images: ["https://static.playgama.com/sample.png"],
      genres: ["puzzle"],
      mobileReady: ["For IOS", "For Desktop"],
      screenOrientation: { horizontal: false, vertical: true },
      howToPlayText: "Tap a tile.",
    };
    const mock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          games: Array.from({ length: 100 }, (_, i) => ({
            ...row,
            id: String(i),
          })),
          totalCount: 101,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ games: [{ ...row, id: "100" }], totalCount: 101 }),
      );
    const provider = new PlaygamaProvider(
      {
        PROVIDER_MODE: "live",
        PLAYGAMA_CLID: "test-publisher",
        PLAYGAMA_API_BASE:
          "https://playgama.com/api/v1/partner/export/catalogue/games",
      },
      mock,
    );
    const result = await provider.syncCatalog();
    expect(result.games).toHaveLength(101);
    expect(mock.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(mock.mock.calls[1][1].body).pagination.offset).toBe(100);
    expect(result.games[0]).toMatchObject({
      supportsMobile: true,
      supportsDesktop: true,
      orientation: "portrait",
      categories: ["Puzzle"],
      developer: null,
    });
    expect(result.games[0].embedUrl).toContain("lang=en&clid=test-publisher");
  });
  it("rejects a current Playgama catalog that ends before its advertised total", async () => {
    const provider = new PlaygamaProvider(
      {
        PROVIDER_MODE: "live",
        PLAYGAMA_CLID: "test-publisher",
        PLAYGAMA_API_BASE:
          "https://playgama.com/api/v1/partner/export/catalogue/games",
      },
      vi.fn().mockResolvedValue(Response.json({ games: [], totalCount: 100 })),
    );
    await expect(provider.readCatalogPage(1)).rejects.toThrow(
      "before the advertised total",
    );
  });
  for (const id of providerIds)
    it(`${id} validates its fixture and returns a neutral model`, async () => {
      const adapter = createProvider(id, fixtureEnv);
      const catalog = await adapter.syncCatalog();
      expect(catalog.complete).toBe(true);
      expect(catalog.games.length).toBeGreaterThan(0);
      const game = catalog.games[0];
      expect(game.providerId).toBe(id);
      expect(game.fixture).toBe(true);
      expect(game.categories.length).toBeGreaterThan(0);
      expect(game.metadata.sourceCategories).toBeDefined();
      expect(() => adapter.normalize({ title: "bad" })).toThrow();
    });
  it("production does not silently serve fixtures", () => {
    expect(
      createProvider("playgama", { APP_ENV: "production" }).validateConfig()
        .mode,
    ).toBe("blocked");
    expect(
      createProvider("playgama", {
        APP_ENV: "local",
        PLAYGAMA_CLID: "configured",
      }).validateConfig().mode,
    ).toBe("blocked");
  });
  it("retains existing tracking query values and appends missing CLID", () => {
    const provider = new PlaygamaProvider({
      PROVIDER_MODE: "live",
      PLAYGAMA_CLID: "publisher-42",
      PLAYGAMA_API_BASE: "https://playgama.com/api/v1/games/export-list",
    });
    const raw = {
      ...fixtures.playgama[0],
      gameURL:
        "https://playgama.com/export/game/demo?clid=publisher-42&lang=en",
      thumbnail: "https://playgama.com/example.png",
    };
    expect(provider.normalize(raw).embedUrl).toContain(
      "clid=publisher-42&lang=en",
    );
    expect(
      provider.normalize({
        ...raw,
        gameURL: "https://playgama.com/export/game/demo?lang=en",
      }).embedUrl,
    ).toContain("clid=publisher-42");
    expect(() =>
      provider.normalize({
        ...raw,
        gameURL: "https://playgama.com/export/game/demo?clid=another",
      }),
    ).toThrow("CLID mismatch");
  });
  it("paginates GamePix with documented limit/offset/SID and preserves attributed player URL", async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      ...fixtures.gamepix[0],
      id: i,
      url: `https://games.gamepix.com/game?gid=${i}&sid=test-sid`,
      thumbnailUrl: "https://img.gamepix.com/img.png",
    }));
    const mock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(rows))
      .mockResolvedValueOnce(Response.json([]));
    const adapter = new GamepixProvider(
      {
        PROVIDER_MODE: "live",
        GAMEPIX_SID: "test-sid",
        GAMEPIX_API_BASE: "https://games.gamepix.com/games",
      },
      mock,
    );
    const result = await adapter.syncCatalog();
    expect(result.games.length).toBe(100);
    expect(mock.mock.calls[0][0]).toContain("offset=0");
    expect(mock.mock.calls[1][0]).toContain("offset=100");
    expect(result.games[0].embedUrl).toContain("sid=test-sid");
  });
  it("parses publisher RSS without assuming a full catalog or expanding XML entities", async () => {
    const xml =
      "<rss><channel><item><id>rss-1</id><title>Sample Puzzle</title><description>A puzzle.</description><url>https://html5.gamemonetize.com/example/</url><thumb>https://img.gamemonetize.com/example.png</thumb><category>Puzzle</category></item></channel></rss>";
    const adapter = new GamemonetizeProvider(
      {
        PROVIDER_MODE: "live",
        GAMEMONETIZE_FEED_URL:
          "https://rss.gamemonetize.com/publisher-generated",
      },
      vi.fn().mockResolvedValue(new Response(xml)),
    );
    const result = await adapter.syncCatalog();
    expect(result.games[0].title).toBe("Sample Puzzle");
    expect(result.complete).toBe(false);
  });
  it("requires explicit attribution mapping for a configured WG partner ID", () => {
    const adapter = new WgplaygroundProvider({
      PROVIDER_MODE: "live",
      WGPLAYGROUND_API_BASE:
        "https://www.wgplayground.com/api/games_api/get_games",
      WGPLAYGROUND_PARTNER_ID: "account",
    });
    expect(adapter.validateConfig()).toMatchObject({
      ready: false,
      mode: "blocked",
      missing: ["WGPLAYGROUND_ATTRIBUTION_PARAM"],
    });
  });
  it("rejects feed metadata URLs outside configured HTTPS origins", () => {
    for (const url of [
      "http://playgama.com/game",
      "https://evil.test/a",
      "javascript:alert(1)",
      "https://name:secret@playgama.com/game",
      "https://playgama.com.evil.test/a",
    ])
      expect(() => safeUrl(url, defaultFrames)).toThrow();
  });
  it("rejects redirects without following an unapproved host on Workers", async () => {
    const mock = vi
      .fn()
      .mockResolvedValue(
        Response.redirect("https://unapproved.example/feed", 302),
      );
    const provider = new GamemonetizeProvider(
      {
        PROVIDER_MODE: "live",
        GAMEMONETIZE_FEED_URL: "https://rss.gamemonetize.com/rssfeed.php",
      },
      mock,
    );
    await expect(provider.readCatalogPage(1)).rejects.toThrow(
      "Provider returned HTTP 302",
    );
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock.mock.calls[0][1].redirect).toBe("manual");
  });
  it("fails unknown envelopes instead of guessing success or deleting sources", async () => {
    const adapter = new PlaygamaProvider(
      {
        PROVIDER_MODE: "live",
        PLAYGAMA_CLID: "test",
        PLAYGAMA_API_BASE: "https://playgama.com/api/v1/games/export-list",
      },
      vi.fn().mockResolvedValue(Response.json({ unexpected: [] })),
    );
    await expect(adapter.syncCatalog()).rejects.toThrow("Feed envelope");
  });
  it("supports explicit account envelope and field mapping", async () => {
    const mapping = {
      gamepix: {
        itemsPath: "payload.rows",
        fields: {
          id: "key",
          title: "name",
          url: "player",
          thumbnailUrl: "cover",
          categories: "genres",
        },
      },
    };
    const adapter = new GamepixProvider(
      {
        PROVIDER_MODE: "live",
        GAMEPIX_SID: "test",
        GAMEPIX_API_BASE: "https://games.gamepix.com/games",
        PROVIDER_MAPPING_JSON: JSON.stringify(mapping),
      },
      vi.fn().mockResolvedValue(
        Response.json({
          payload: {
            rows: [
              {
                key: "1",
                name: "Mapped game",
                player: "https://games.gamepix.com/game?sid=test",
                cover: "https://img.gamepix.com/game.png",
                genres: ["Puzzle"],
              },
            ],
          },
        }),
      ),
    );
    expect((await adapter.syncCatalog()).games[0].title).toBe("Mapped game");
  });
});
