CREATE INDEX games_new_idx ON games(publish_status,created_at DESC);
CREATE INDEX games_trending_idx ON games(publish_status,trending_score DESC);
CREATE INDEX games_quality_idx ON games(publish_status,quality_score DESC);
CREATE INDEX metrics_day_idx ON game_metrics_daily(day,event);
CREATE INDEX dedupe_status_idx ON dedupe_candidates(status,confidence DESC);
CREATE INDEX sync_started_idx ON sync_runs(started_at DESC);
