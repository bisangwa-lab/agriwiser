/**
 * Security and correctness tests for local-mode write operations:
 * assertLocalWriteAccess, createLocalRecord, updateLocalRecord,
 * deleteLocalRecord, and bulkCreateLocalRecords.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  assertLocalWriteAccess,
  createLocalRecord,
  updateLocalRecord,
  deleteLocalRecord,
  bulkCreateLocalRecords,
} from "../src/lib/local-data-service.js";

// ---------------------------------------------------------------------------
// Test fixture helpers
// ---------------------------------------------------------------------------
function makeDb() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../migrations/0002_local_data.sql", import.meta.url), "utf8"));
  return {
    sqlite,
    db: {
      prepare: (sql) => ({
        bind: (...args) => ({
          first: async () => sqlite.prepare(sql).get(...args) ?? null,
          run: async () => sqlite.prepare(sql).run(...args),
          all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
        }),
      }),
      batch: async (stmts) => {
        for (const stmt of stmts) await stmt.run();
      },
    },
  };
}

// User stubs
const officer       = { workspace_role: "agricultural_officer",  email: "officer@test.local"  };
const supervisor    = { workspace_role: "field_supervisor",       email: "super@test.local"    };
const fieldInv      = { workspace_role: "field_investigator",     email: "finv@test.local"     };
const analyst       = { workspace_role: "agricultural_analyst",   email: "analyst@test.local"  };
const policy        = { workspace_role: "policy_maker",           email: "policy@test.local"   };
const viewer        = { workspace_role: "public_viewer",          email: "viewer@test.local"   };
const dataManager   = { workspace_role: "data_manager",           email: "dm@test.local",   role: "admin" };
const superAdmin    = { workspace_role: "super_admin",            email: "sa@test.local",   role: "admin" };

// ---------------------------------------------------------------------------
// assertLocalWriteAccess — authorization matrix
// ---------------------------------------------------------------------------
test("assertLocalWriteAccess — unauthenticated callers are rejected (401)", () => {
  assert.throws(() => assertLocalWriteAccess(null, "Investigation"), { status: 401 });
  assert.throws(() => assertLocalWriteAccess(undefined, "FollowUpAction"), { status: 401 });
});

test("assertLocalWriteAccess — public_viewer cannot write any entity", () => {
  for (const entity of ["Investigation", "FollowUpAction", "InvestigationNote", "Alert", "ReportFinding",
                         "Dataset", "AgriculturalObservation", "ImportLog"]) {
    assert.throws(() => assertLocalWriteAccess(viewer, entity), { status: 403 }, `${entity} should be denied for viewer`);
  }
});

test("assertLocalWriteAccess — agricultural_officer can write work-record entities", () => {
  for (const entity of ["Investigation", "FollowUpAction", "InvestigationNote", "Alert", "ReportFinding"]) {
    assert.doesNotThrow(() => assertLocalWriteAccess(officer, entity), `${entity} should be allowed for officer`);
  }
});

test("assertLocalWriteAccess — agricultural_officer cannot write official datasets", () => {
  for (const entity of ["Dataset", "AgriculturalObservation", "ImportLog", "SourceArchive",
                         "SourceTableIndex", "SourceTable", "SourceReportIndex", "SourceReportPage", "SurveyFile"]) {
    assert.throws(() => assertLocalWriteAccess(officer, entity), { status: 403 }, `${entity} must be denied for officer`);
  }
});

test("assertLocalWriteAccess — field_supervisor, field_investigator, analyst, policy_maker can write work records", () => {
  const staff = [supervisor, fieldInv, analyst, policy];
  const workEntities = ["Investigation", "FollowUpAction", "InvestigationNote", "Alert", "ReportFinding"];
  for (const user of staff) {
    for (const entity of workEntities) {
      assert.doesNotThrow(() => assertLocalWriteAccess(user, entity), `${entity} denied for ${user.workspace_role}`);
    }
  }
});

test("assertLocalWriteAccess — data_manager and super_admin can write all entities", () => {
  const managers = [dataManager, superAdmin];
  const allEntities = [
    "Dataset", "AgriculturalObservation", "ImportLog", "SourceArchive",
    "SourceTableIndex", "SourceTable", "SourceReportIndex", "SourceReportPage", "SurveyFile",
    "Investigation", "FollowUpAction", "InvestigationNote", "Alert", "ReportFinding",
  ];
  for (const user of managers) {
    for (const entity of allEntities) {
      assert.doesNotThrow(() => assertLocalWriteAccess(user, entity), `${entity} denied for ${user.workspace_role}`);
    }
  }
});

// ---------------------------------------------------------------------------
// createLocalRecord
// ---------------------------------------------------------------------------
test("createLocalRecord — officer can create an Investigation and it is persisted", async () => {
  const { db, sqlite } = makeDb();
  const record = await createLocalRecord(db, officer, {
    entity: "Investigation",
    record: {
      title: "Maize production anomaly — Gasabo",
      status: "open",
      district: "Gasabo",
      crop: "Maize",
      priority: "high",
      is_demo: false,
    },
  });
  assert.ok(record.id, "should have an id");
  assert.equal(record.created_by, officer.email);
  assert.ok(record.created_date, "should have created_date");
  assert.ok(record.updated_date, "should have updated_date");

  // Confirm D1 persistence
  const row = sqlite.prepare("SELECT data FROM local_records WHERE entity=? AND id=?").get("Investigation", record.id);
  assert.ok(row, "record should be in database");
  const parsed = JSON.parse(row.data);
  assert.equal(parsed.district, "Gasabo");
  assert.equal(parsed.is_demo, false);
});

test("createLocalRecord — viewer cannot create Investigation (403)", async () => {
  const { db } = makeDb();
  await assert.rejects(
    createLocalRecord(db, viewer, { entity: "Investigation", record: { title: "test" } }),
    { status: 403 },
  );
});

test("createLocalRecord — data_manager can create AgriculturalObservation", async () => {
  const { db, sqlite } = makeDb();
  const record = await createLocalRecord(db, dataManager, {
    entity: "AgriculturalObservation",
    record: {
      domain: "crop",
      geography: "Kigali",
      crop: "Rice",
      year: 2024,
      season: "Season A",
      indicator: "production",
      value: 500,
      unit: "MT",
      quality_status: "verified",
    },
  });
  assert.ok(record.id);
  // Official records must be published
  const row = sqlite.prepare("SELECT published FROM local_records WHERE entity=? AND id=?").get("AgriculturalObservation", record.id);
  assert.equal(row.published, 1, "AgriculturalObservation must be published=1");
});

test("createLocalRecord — officer creating Investigation gets published=0 (work record)", async () => {
  const { db, sqlite } = makeDb();
  const record = await createLocalRecord(db, officer, {
    entity: "Investigation",
    record: { title: "test investigation", status: "open" },
  });
  const row = sqlite.prepare("SELECT published FROM local_records WHERE entity=? AND id=?").get("Investigation", record.id);
  assert.equal(row.published, 0, "Investigation should be non-published (internal work record)");
});

test("createLocalRecord — respects caller-supplied id if provided", async () => {
  const { db } = makeDb();
  const customId = "investigation-custom-id-001";
  const record = await createLocalRecord(db, officer, {
    entity: "Investigation",
    record: { id: customId, title: "with supplied id", status: "open" },
  });
  assert.equal(record.id, customId);
});

// ---------------------------------------------------------------------------
// updateLocalRecord
// ---------------------------------------------------------------------------
test("updateLocalRecord — officer can update an existing Investigation", async () => {
  const { db } = makeDb();
  const created = await createLocalRecord(db, officer, {
    entity: "Investigation",
    record: { title: "Initial title", status: "open", district: "Kigali" },
  });

  const updated = await updateLocalRecord(db, officer, {
    entity: "Investigation",
    id: created.id,
    patch: { status: "in_progress", notes: "Field visit scheduled" },
  });

  assert.equal(updated.status, "in_progress");
  assert.equal(updated.notes, "Field visit scheduled");
  assert.equal(updated.title, "Initial title", "original title should be preserved");
  assert.equal(updated.district, "Kigali", "original district should be preserved");
});

test("updateLocalRecord — id field cannot be changed via patch", async () => {
  const { db } = makeDb();
  const created = await createLocalRecord(db, officer, {
    entity: "Investigation",
    record: { title: "Immutable id test", status: "open" },
  });
  const original_id = created.id;

  const updated = await updateLocalRecord(db, officer, {
    entity: "Investigation",
    id: created.id,
    patch: { id: "tampered-id", status: "in_progress" },
  });

  assert.equal(updated.id, original_id, "id must not be changed by patch");
});

test("updateLocalRecord — updating non-existent record throws 404", async () => {
  const { db } = makeDb();
  await assert.rejects(
    updateLocalRecord(db, officer, {
      entity: "Investigation",
      id: "does-not-exist",
      patch: { status: "closed" },
    }),
    { status: 404 },
  );
});

test("updateLocalRecord — viewer cannot update any record (403)", async () => {
  const { db } = makeDb();
  const created = await createLocalRecord(db, officer, {
    entity: "Investigation",
    record: { title: "protected", status: "open" },
  });

  await assert.rejects(
    updateLocalRecord(db, viewer, {
      entity: "Investigation",
      id: created.id,
      patch: { status: "in_progress" },
    }),
    { status: 403 },
  );
});

// ---------------------------------------------------------------------------
// deleteLocalRecord
// ---------------------------------------------------------------------------
test("deleteLocalRecord — super_admin can delete a record", async () => {
  const { db, sqlite } = makeDb();
  const created = await createLocalRecord(db, officer, {
    entity: "Investigation",
    record: { title: "to be deleted", status: "open" },
  });

  const result = await deleteLocalRecord(db, superAdmin, { entity: "Investigation", id: created.id });
  assert.equal(result.success, true);
  assert.equal(result.id, created.id);

  const remaining = sqlite.prepare("SELECT COUNT(*) AS n FROM local_records WHERE entity=? AND id=?").get("Investigation", created.id);
  assert.equal(remaining.n, 0, "record should be deleted from database");
});

test("deleteLocalRecord — viewer cannot delete records (403)", async () => {
  const { db } = makeDb();
  const created = await createLocalRecord(db, officer, {
    entity: "Investigation",
    record: { title: "viewer cannot delete", status: "open" },
  });

  await assert.rejects(
    deleteLocalRecord(db, viewer, { entity: "Investigation", id: created.id }),
    { status: 403 },
  );
});

// ---------------------------------------------------------------------------
// bulkCreateLocalRecords
// ---------------------------------------------------------------------------
test("bulkCreateLocalRecords — data_manager can bulk-import AgriculturalObservations", async () => {
  const { db, sqlite } = makeDb();
  const records = [
    { domain: "crop", geography: "Gasabo", crop: "Maize", year: 2023, season: "Season A", indicator: "production", value: 800, unit: "MT" },
    { domain: "crop", geography: "Gasabo", crop: "Maize", year: 2023, season: "Season A", indicator: "harvested_area", value: 320, unit: "HA" },
    { domain: "crop", geography: "Kicukiro", crop: "Wheat", year: 2023, season: "Season A", indicator: "production", value: 200, unit: "MT" },
  ];

  const inserted = await bulkCreateLocalRecords(db, dataManager, {
    entity: "AgriculturalObservation",
    records,
  });

  assert.equal(inserted.length, 3);
  assert.ok(inserted[0].id, "each record should have an id");
  assert.ok(inserted[0].created_date, "each record should have created_date");

  const count = sqlite.prepare("SELECT COUNT(*) AS n FROM local_records WHERE entity='AgriculturalObservation' AND published=1").get();
  assert.equal(count.n, 3);
});

test("bulkCreateLocalRecords — officer cannot bulk-import official observations (403)", async () => {
  const { db } = makeDb();
  await assert.rejects(
    bulkCreateLocalRecords(db, officer, {
      entity: "AgriculturalObservation",
      records: [{ domain: "crop", geography: "Gasabo", crop: "Maize", year: 2023, season: "Season A", indicator: "production", value: 100, unit: "MT" }],
    }),
    { status: 403 },
  );
});

test("bulkCreateLocalRecords — empty records array returns without error", async () => {
  const { db } = makeDb();
  const result = await bulkCreateLocalRecords(db, dataManager, { entity: "AgriculturalObservation", records: [] });
  assert.deepEqual(result, []);
});

test("bulkCreateLocalRecords — officer can bulk-create work records (FollowUpAction)", async () => {
  const { db, sqlite } = makeDb();
  const actions = [
    { investigation_id: "inv-001", title: "Verify field reports", status: "open", due_date: "2026-11-15" },
    { investigation_id: "inv-001", title: "Contact district officer", status: "open", due_date: "2026-11-20" },
  ];

  const inserted = await bulkCreateLocalRecords(db, officer, { entity: "FollowUpAction", records: actions });
  assert.equal(inserted.length, 2);
  const count = sqlite.prepare("SELECT COUNT(*) AS n FROM local_records WHERE entity='FollowUpAction'").get();
  assert.equal(count.n, 2);
});

// ---------------------------------------------------------------------------
// Missing id/patch validation
// ---------------------------------------------------------------------------
test("createLocalRecord — rejects missing or non-object record payload", async () => {
  const { db } = makeDb();
  await assert.rejects(createLocalRecord(db, officer, { entity: "Investigation", record: null }));
  await assert.rejects(createLocalRecord(db, officer, { entity: "Investigation", record: "string" }));
});

test("updateLocalRecord — rejects missing id or non-object patch", async () => {
  const { db } = makeDb();
  await assert.rejects(updateLocalRecord(db, officer, { entity: "Investigation", id: "", patch: {} }));
  await assert.rejects(updateLocalRecord(db, officer, { entity: "Investigation", id: "any", patch: null }));
});
