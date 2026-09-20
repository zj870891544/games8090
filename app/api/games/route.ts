import { z } from "zod";
import { browse } from "../../../lib/db/repository";
import {
  catalogPageSize,
  maxCatalogPage,
} from "../../../lib/catalog-pagination";

const requestSchema = z.object({
  page: z.coerce.number().int().min(1).max(maxCatalogPage),
  q: z.string().max(150),
  category: z.string().max(80),
  sort: z.enum(["games", "popular", "new", "trending", "quality"]),
});

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = requestSchema.safeParse({
    page: params.get("page") ?? "1",
    q: params.get("q") ?? "",
    category: params.get("category") ?? "",
    sort: params.get("sort") ?? "popular",
  });
  if (!parsed.success)
    return Response.json(
      { error: "Invalid collection request." },
      { status: 400 },
    );

  const { page, q, category, sort } = parsed.data;
  const games = await browse({
    query: q,
    category,
    sort,
    limit: catalogPageSize + 1,
    offset: (page - 1) * catalogPageSize,
  });
  return Response.json({
    games: games.slice(0, catalogPageSize),
    nextPage:
      games.length > catalogPageSize && page < maxCatalogPage ? page + 1 : null,
  });
}
