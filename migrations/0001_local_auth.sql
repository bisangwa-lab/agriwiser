CREATE TABLE IF NOT EXISTS local_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  workspace_role TEXT NOT NULL DEFAULT 'public_viewer',
  active INTEGER NOT NULL DEFAULT 1,
  created_date TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS local_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES local_users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS local_sessions_user ON local_sessions(user_id);
CREATE TABLE IF NOT EXISTS local_login_attempts (
  email TEXT PRIMARY KEY,
  failures INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
