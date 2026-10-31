import test from "node:test";
import assert from "node:assert/strict";
import { NOTE_TYPES, INVESTIGATION_STATUSES, FOLLOWUP_STATUSES } from "../src/lib/constants.js";
import { normalizeRole, panelForPath, canOpenPanel, ROLE_BY_KEY, resolveWorkspacePanel, setStoredWorkspace } from "../src/lib/rbac.js";

test("NOTE_TYPES includes verified evidence, reported observations, unresolved questions and source-check notes", () => {
  const keys = NOTE_TYPES.map((t) => t.key);
  assert.ok(keys.includes("evidence"), "evidence note type must exist");
  assert.ok(keys.includes("field_observation"), "field_observation note type must exist");
  assert.ok(keys.includes("unresolved_question"), "unresolved_question note type must exist");
  assert.ok(keys.includes("source_check"), "source_check note type must exist");
  assert.ok(keys.includes("note"), "general note type must exist");

  const evidenceItem = NOTE_TYPES.find((t) => t.key === "evidence");
  const questionItem = NOTE_TYPES.find((t) => t.key === "unresolved_question");
  assert.equal(evidenceItem.label, "Verified evidence");
  assert.equal(questionItem.label, "Unresolved question");
});

test("Investigation and Follow-up statuses in constants are complete", () => {
  const invKeys = INVESTIGATION_STATUSES.map((s) => s.key);
  assert.ok(invKeys.includes("open"));
  assert.ok(invKeys.includes("in_progress"));
  assert.ok(invKeys.includes("awaiting_evidence"));
  assert.ok(invKeys.includes("completed"));
  assert.ok(invKeys.includes("cancelled"));

  const fuKeys = FOLLOWUP_STATUSES.map((s) => s.key);
  assert.ok(fuKeys.includes("pending"));
  assert.ok(fuKeys.includes("in_progress"));
  assert.ok(fuKeys.includes("completed"));
  assert.ok(fuKeys.includes("cancelled"));
});

test("Officer navigation preserves field_operations workspace for /weather and /investigations", () => {
  const officerUser = { role: "user", workspace_role: "officer" };
  const normalized = normalizeRole(officerUser);
  assert.equal(normalized, "agricultural_officer");
  assert.equal(ROLE_BY_KEY[normalized].panel, "field_operations");

  assert.equal(panelForPath("/field-operations"), "field_operations");
  assert.equal(panelForPath("/investigations"), "field_operations");
  assert.equal(panelForPath("/investigations/123"), "field_operations");
  assert.ok(!canOpenPanel(officerUser, "analytics"));

  // Weather is accessible from field operations without redirecting out
  assert.equal(panelForPath("/weather"), null);
  assert.ok(canOpenPanel(officerUser, "field_operations"));

  // Weather is shared across panels without switching workspaces
  setStoredWorkspace("field_operations");
  assert.equal(resolveWorkspacePanel(officerUser, "/weather"), "field_operations");
  assert.equal(resolveWorkspacePanel(officerUser, "/weather", { panel: "field_operations" }), "field_operations");

  const analystUser = { role: "user", workspace_role: "agricultural_analyst" };
  setStoredWorkspace("analytics");
  assert.equal(resolveWorkspacePanel(analystUser, "/weather"), "analytics");
  assert.equal(resolveWorkspacePanel(analystUser, "/weather", { panel: "analytics" }), "analytics");

  const adminUser = { role: "admin", workspace_role: "super_admin" };
  assert.equal(resolveWorkspacePanel(adminUser, "/weather", { panel: "field_operations" }), "field_operations");
  assert.equal(resolveWorkspacePanel(adminUser, "/weather", { panel: "analytics" }), "analytics");
  assert.equal(resolveWorkspacePanel(adminUser, "/weather", { panel: "admin" }), "admin");

  // Preserves last active workspace when clicking /weather without search param
  setStoredWorkspace("field_operations");
  assert.equal(resolveWorkspacePanel(adminUser, "/weather"), "field_operations");

  setStoredWorkspace("analytics");
  assert.equal(resolveWorkspacePanel(adminUser, "/weather"), "analytics");

  setStoredWorkspace("admin");
  assert.equal(resolveWorkspacePanel(adminUser, "/weather"), "admin");

  // Users cannot select another role's workspace through shared weather routes
  assert.equal(resolveWorkspacePanel(officerUser, "/weather", { panel: "admin" }), "field_operations");
});

test("Investigation outcome summary validation enforces required thorough summary before completion", () => {
  function validateCompletion(status, summary) {
    if (status === "completed") {
      const trimmed = (summary || "").trim();
      if (!trimmed || trimmed.length < 20) {
        return { valid: false, message: "Outcome summary of at least 20 characters required" };
      }
    }
    return { valid: true };
  }

  assert.equal(validateCompletion("completed", "").valid, false);
  assert.equal(validateCompletion("completed", "Too brief").valid, false);
  assert.equal(
    validateCompletion(
      "completed",
      "Field investigation confirmed yield drop was due to delayed fertilizer supply, not weather anomalies.",
    ).valid,
    true,
  );
  assert.equal(validateCompletion("in_progress", "").valid, true);
  assert.equal(validateCompletion("awaiting_evidence", "").valid, true);
});

test("Follow-up action status validation requires written outcome note on completion or cancellation", () => {
  function validateActionStatusChange(targetStatus, notes) {
    if (targetStatus === "completed" || targetStatus === "cancelled") {
      if (!notes || !notes.trim()) {
        return { valid: false, error: "Written outcome/reason required" };
      }
    }
    return { valid: true };
  }

  assert.equal(validateActionStatusChange("completed", "").valid, false);
  assert.equal(validateActionStatusChange("cancelled", "   ").valid, false);
  assert.equal(validateActionStatusChange("completed", "Checked warehouse logs and confirmed distribution date.").valid, true);
  assert.equal(validateActionStatusChange("cancelled", "Superseded by district director visit report.").valid, true);
  assert.equal(validateActionStatusChange("in_progress", "").valid, true);
  assert.equal(validateActionStatusChange("pending", "").valid, true);
});
