-- Indexes and tables added for scaling (see README "Architecture").
-- Expired-session cleanup (cron in workers/jobs) deletes by expiry time.
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);
-- Saved recipes are listed newest first per user.
CREATE INDEX IF NOT EXISTS saved_recipes_user_created_idx ON saved_recipes(user_id, created_at);
-- Ingredient names people typed that the lexicon did not recognise (written asynchronously).
CREATE TABLE IF NOT EXISTS ingredient_misses (
  name TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ingredient_misses_count_idx ON ingredient_misses(count DESC);
