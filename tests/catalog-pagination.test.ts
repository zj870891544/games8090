import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../lib/db/repository", () => ({ browse: vi.fn() }));
import { browse } from "../lib/db/repository";
import { GET } from "../app/api/games/route";
import { catalogPage } from "../lib/catalog-pagination";
import type { GameCardData } from "../lib/types";

const query = vi.mocked(browse);
const request = (params = "") =>
  new Request(`https://games8090.online/api/games?${params}`);

describe("public catalog continuation", () => {
  beforeEach(() => query.mockReset());

  it("returns 60 cards and uses the lookahead only to offer another batch", async () => {
    query.mockResolvedValue(
      Array.from({ length: 61 }, (_, i) => ({ id: String(i) }) as GameCardData),
    );
    const response = await GET(
      request(
        "page=2&q=car&category=racing&sort=new&includeDrafts=true&limit=9999",
      ),
    );
    const data = (await response.json()) as {
      games: GameCardData[];
      nextPage: number | null;
    };
    expect(data.games).toHaveLength(60);
    expect(data.nextPage).toBe(3);
    expect(query).toHaveBeenCalledWith({
      query: "car",
      category: "racing",
      sort: "new",
      limit: 61,
      offset: 60,
    });
  });

  it.each([0, 21, 60])(
    "ends a collection containing %i remaining cards",
    async (size) => {
      query.mockResolvedValue(
        Array.from(
          { length: size },
          (_, i) => ({ id: String(i) }) as GameCardData,
        ),
      );
      const data = (await (await GET(request())).json()) as {
        games: GameCardData[];
        nextPage: number | null;
      };
      expect(data.games).toHaveLength(size);
      expect(data.nextPage).toBeNull();
    },
  );

  it.each([
    "page=0",
    "page=-1",
    "page=1.5",
    "page=Infinity",
    "page=1001",
    "sort=invalid",
    `q=${"x".repeat(151)}`,
  ])("rejects invalid requests before querying D1: %s", async (params) => {
    expect((await GET(request(params))).status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it("normalizes legacy page links to bounded integer offsets", () => {
    expect(catalogPage(2.5)).toBe(2);
    expect(catalogPage(-1)).toBe(1);
    expect(catalogPage(Infinity)).toBe(1);
    expect(catalogPage(5000)).toBe(1000);
  });
});
