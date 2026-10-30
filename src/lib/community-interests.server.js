import { CROPS, DISTRICT_NAMES } from "./constants.js";

// In-memory fallback for test environments or when D1 is unavailable
const memoryStore = new Map();

async function getWorkerEnv() {
  try {
    const cf = await import("cloudflare:workers");
    return cf.env;
  } catch {
    return globalThis.env || null;
  }
}

function validateInterestInput(input) {
  if (!input || typeof input !== "object") {
    throw Object.assign(new Error("Invalid saved interest payload."), { status: 400 });
  }
  const { type, value, notes } = input;
  if (!type || !["crop", "district"].includes(type)) {
    throw Object.assign(new Error("Saved interest type must be either 'crop' or 'district'."), { status: 400 });
  }
  if (!value || typeof value !== "string" || !value.trim()) {
    throw Object.assign(new Error("Saved interest value must be a valid non-empty string."), { status: 400 });
  }

  const trimmed = value.trim();
  if (type === "crop" && !CROPS.includes(trimmed)) {
    throw Object.assign(new Error(`Crop '${trimmed}' is not in the recognized agricultural crop catalog.`), { status: 400 });
  }
  if (type === "district" && !DISTRICT_NAMES.includes(trimmed)) {
    throw Object.assign(new Error(`District '${trimmed}' is not recognized among Rwanda's 30 official districts.`), { status: 400 });
  }

  const sanitizedNotes = notes && typeof notes === "string" ? notes.slice(0, 500).trim() : "";
  return { type, value: trimmed, notes: sanitizedNotes };
}

export async function fetchUserSavedInterests(user) {
  if (!user || !user.id) {
    throw Object.assign(new Error("Authentication required to access saved interests."), { status: 401 });
  }

  const userId = String(user.id);
  const workerEnv = await getWorkerEnv();
  const db = workerEnv?.LOCAL_AUTH_DB;

  if (db && typeof db.prepare === "function") {
    try {
      const rows = await db
        .prepare("SELECT data FROM local_records WHERE entity = 'CommunitySavedInterest' AND json_extract(data, '$.user_id') = ? ORDER BY json_extract(data, '$.created_at') DESC")
        .bind(userId)
        .all();
      return (rows.results || []).map((row) => JSON.parse(row.data));
    } catch {
      // Fallback to memory store if table has issue
    }
  }

  // Memory fallback
  const userInterests = [];
  for (const [key, record] of memoryStore.entries()) {
    if (key.startsWith(`${userId}:`)) {
      userInterests.push(record);
    }
  }
  return userInterests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addUserSavedInterest(user, rawInput) {
  if (!user || !user.id) {
    throw Object.assign(new Error("Authentication required to save interests."), { status: 401 });
  }

  const { type, value, notes } = validateInterestInput(rawInput);
  const userId = String(user.id);
  const id = `interest-${userId}-${type}-${encodeURIComponent(value.toLowerCase())}`;
  const now = new Date().toISOString();

  const record = {
    id,
    user_id: userId,
    userId,
    type,
    value,
    name: value,
    notes,
    created_at: now,
    createdAt: now,
  };

  const workerEnv = await getWorkerEnv();
  const db = workerEnv?.LOCAL_AUTH_DB;
  if (db && typeof db.prepare === "function") {
    try {
      await db
        .prepare("INSERT INTO local_records (entity, id, data, published) VALUES ('CommunitySavedInterest', ?, ?, 0) ON CONFLICT(entity, id) DO UPDATE SET data = excluded.data")
        .bind(id, JSON.stringify(record))
        .run();
      return record;
    } catch {
      // Fallback to memory store
    }
  }

  memoryStore.set(`${userId}:${type}:${value.toLowerCase()}`, record);
  return record;
}

export async function deleteUserSavedInterest(user, id) {
  if (!user || !user.id) {
    throw Object.assign(new Error("Authentication required to remove saved interests."), { status: 401 });
  }
  if (!id || typeof id !== "string") {
    throw Object.assign(new Error("Invalid interest identifier."), { status: 400 });
  }

  const userId = String(user.id);
  const workerEnv = await getWorkerEnv();
  const db = workerEnv?.LOCAL_AUTH_DB;

  if (db && typeof db.prepare === "function") {
    try {
      await db
        .prepare("DELETE FROM local_records WHERE entity = 'CommunitySavedInterest' AND id = ? AND json_extract(data, '$.user_id') = ?")
        .bind(id, userId)
        .run();
      return { ok: true, id };
    } catch {
      // Fallback
    }
  }

  for (const [key, record] of memoryStore.entries()) {
    if (record.id === id && record.userId === userId) {
      memoryStore.delete(key);
      break;
    }
  }

  return { ok: true, id };
}

export function clearMemoryInterestsForTesting() {
  memoryStore.clear();
}
