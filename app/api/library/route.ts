import { browse } from "../../../lib/db/repository";
export async function GET(request: Request) {
  const slugs = (new URL(request.url).searchParams.get("slugs") || "")
    .split(",")
    .filter((s) => /^[\p{L}\p{N}-]{1,200}$/u.test(s))
    .slice(0, 100);
  return Response.json({ games: await browse({ slugs, limit: 100 }) });
}
