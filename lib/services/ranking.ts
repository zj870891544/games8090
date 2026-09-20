/** Local engagement adjusts discovery. These are product signals, never revenue or gameplay telemetry. */
export async function recomputeRankings(db: D1Database) {
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  await db
    .prepare(
      `WITH activity AS (
 SELECT game_id,
 sum(CASE WHEN event='game_start' THEN count WHEN event='favorite_add' THEN count*3 ELSE 0 END) AS total,
 sum(CASE WHEN day>=? AND event='game_start' THEN count WHEN day>=? AND event='favorite_add' THEN count*3 ELSE 0 END) AS recent
 FROM game_metrics_daily GROUP BY game_id
 ), quality AS (
 SELECT s.game_id,max(s.provider_rank) AS score FROM game_sources s
 JOIN providers p ON s.provider_id=p.id JOIN provider_contract_config c ON c.provider_id=p.id
 WHERE s.is_active=1 AND s.manually_disabled=0 AND p.enabled=1 AND c.enabled=1 GROUP BY s.game_id
 )
 UPDATE games SET
 quality_score=coalesce((SELECT score FROM quality WHERE game_id=games.id),0),
 popularity_score=0.6*coalesce((SELECT score FROM quality WHERE game_id=games.id),0)+0.4*coalesce((SELECT 1.0*total/(total+50) FROM activity WHERE game_id=games.id),0),
 trending_score=0.4*coalesce((SELECT score FROM quality WHERE game_id=games.id),0)+0.6*coalesce((SELECT 1.0*recent/(recent+20) FROM activity WHERE game_id=games.id),0)
 `,
    )
    .bind(since, since)
    .run();
}
