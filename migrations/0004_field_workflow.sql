-- CHECK failure aborts an atomic D1 batch before changes/audit can diverge.
CREATE TABLE IF NOT EXISTS field_write_guards(token TEXT PRIMARY KEY, ok INTEGER NOT NULL CHECK(ok=1));
