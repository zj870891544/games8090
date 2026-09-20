CREATE TABLE sync_staging (
 sync_id TEXT NOT NULL REFERENCES sync_runs(id) ON DELETE CASCADE,
 provider_game_id TEXT NOT NULL,
 payload TEXT NOT NULL,
 percentile REAL NOT NULL,
 is_new INTEGER NOT NULL,
 imported INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(sync_id,provider_game_id)
);
CREATE INDEX sync_staging_pending_idx ON sync_staging(sync_id,imported);
