import { browse } from "../../../lib/db/repository";
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.slice(0, 150) || "";
  return Response.json({
    games: q.trim().length >= 2 ? await browse({ query: q, limit: 8 }) : [],
  });
}
