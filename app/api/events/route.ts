import { z } from "zod";
import { getBinding, getEnv } from "../../../lib/db/client";
const schema = z.object({
  event: z.enum([
    "game_card_click",
    "game_page_view",
    "game_start",
    "game_iframe_load",
    "game_reload",
    "game_source_fallback",
    "favorite_add",
    "search",
    "category_view",
    "active_page_time",
  ]),
  gameId: z.string().max(100).optional(),
  sourceId: z.string().max(200).optional(),
  value: z.number().int().min(1).max(60).optional(),
});
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 2048)
    return new Response(null, { status: 413 });
  let body;
  try {
    body = schema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid event" }, { status: 400 });
  }
  const db = getBinding();
  const day = new Date().toISOString().slice(0, 10);
  if (["search", "category_view"].includes(body.event)) {
    await db
      .prepare(
        "INSERT INTO site_metrics_daily(day,event,count) VALUES (?,?,1) ON CONFLICT(day,event) DO UPDATE SET count=count+1",
      )
      .bind(day, body.event)
      .run();
    return new Response(null, { status: 204 });
  }
  if (!body.gameId) return new Response(null, { status: 400 });
  const game = await db
    .prepare("SELECT id FROM games WHERE id=? AND publish_status='published'")
    .bind(body.gameId)
    .first();
  if (!game) return new Response(null, { status: 404 });
  if (body.sourceId) {
    const source = await db
      .prepare("SELECT id FROM game_sources WHERE id=? AND game_id=?")
      .bind(body.sourceId, body.gameId)
      .first();
    if (!source) return new Response(null, { status: 400 });
  } else if (
    [
      "game_start",
      "game_iframe_load",
      "game_reload",
      "game_source_fallback",
    ].includes(body.event)
  )
    return new Response(null, { status: 400 });
  const statements = [
    db
      .prepare(
        "INSERT INTO game_metrics_daily(game_id,day,event,count,active_seconds) VALUES (?,?,?,1,?) ON CONFLICT(game_id,day,event) DO UPDATE SET count=count+1,active_seconds=active_seconds+excluded.active_seconds",
      )
      .bind(
        body.gameId,
        day,
        body.event,
        body.event === "active_page_time" ? body.value || 0 : 0,
      ),
  ];
  if (body.sourceId) {
    const field =
      body.event === "game_start" || body.event === "game_reload"
        ? "iframe_attempts"
        : body.event === "game_iframe_load"
          ? "iframe_loads"
          : body.event === "game_source_fallback"
            ? "fallback_events"
            : null;
    if (field)
      statements.push(
        db
          .prepare(
            `INSERT INTO game_health(source_id,${field}) VALUES (?,1) ON CONFLICT(source_id) DO UPDATE SET ${field}=${field}+1`,
          )
          .bind(body.sourceId),
      );
  }
  await db.batch(statements);
  getEnv().ANALYTICS?.writeDataPoint({
    indexes: [body.gameId],
    blobs: [body.event],
    doubles: [body.value || 0],
  });
  return new Response(null, { status: 204 });
}
