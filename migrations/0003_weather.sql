CREATE TABLE IF NOT EXISTS weather_cache (
 cache_key TEXT PRIMARY KEY,
 data TEXT NOT NULL CHECK(json_valid(data)),
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS weather_cache_expiry ON weather_cache(expires_at);
CREATE TABLE IF NOT EXISTS weather_request_limits (
 limit_key TEXT PRIMARY KEY,
 window_start INTEGER NOT NULL,
 used INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS weather_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 occurred_at TEXT NOT NULL,
 provider TEXT NOT NULL,
 event TEXT NOT NULL,
 code TEXT
);
