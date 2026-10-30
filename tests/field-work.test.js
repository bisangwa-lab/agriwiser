import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { mutateFieldWork, validateFieldMutation } from "../src/lib/field-work-service.js";

const schema = readFileSync(new URL("../migrations/0002_local_data.sql", import.meta.url), "utf8");
const authSchema = readFileSync(new URL("../migrations/0001_local_auth.sql", import.meta.url), "utf8");
const officer = { id: "officer-1", email: "officer@example.com", full_name: "District Officer", workspace_role: "agricultural_officer" };
const viewer = { id: "viewer-1", email: "viewer@example.com", workspace_role: "public_viewer" };
const analyst = { id: "analyst-1", email: "analyst@example.com", workspace_role: "agricultural_analyst" };
const now = () => "2026-10-30T10:30:00.000Z";
function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(authSchema);
  sqlite.exec(schema);
  sqlite.prepare("INSERT INTO local_users(id,email,full_name,password_hash,workspace_role,created_date) VALUES(?,?,?,?,?,?)")
    .run("officer-1", officer.email, officer.full_name, "fixture-only", officer.workspace_role, "2026-01-01T00:00:00Z");
  const db = { prepare: sql => ({ bind: (...args) => ({
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    run: async () => sqlite.prepare(sql).run(...args),
  }) }) };
  const stored = (entity, id) => {
    const row = sqlite.prepare("SELECT data FROM local_records WHERE entity=? AND id=?").get(entity, id);
    return row ? JSON.parse(row.data) : null;
  };
  return { sqlite, db, stored };
}
const draft = {
  title: "Check maize production trend",
  reason: "District maize figures need source and field verification.",
  district: "Gasabo", crop: "Maize", indicator: "production",
  period: "2026 Season B", priority: "elevated",
  evidence: "Unverified question entered by an officer.",
  assignee_name: "District Officer", assignee_email: "officer@example.com",
};
test("officers can open investigations, add dated observations and assign actions", async () => {
  const {db,stored} = fixture();
  const caseFile = await mutateFieldWork(db, officer, {entity:"Investigation",operation:"create",data:draft},now);
  assert.equal(caseFile.status,"open");
  assert.equal(caseFile.requested_by, officer.email);
  assert.equal(caseFile.assignee_name, officer.full_name);
  assert.equal(caseFile.metric_snapshot, "");
  assert.equal(stored("Investigation",caseFile.id).evidence,draft.evidence);
  const note = await mutateFieldWork(db,officer,{entity:"InvestigationNote",operation:"create",data:{
    investigation_id:caseFile.id,note_type:"field_observation",content:"Checked district records; two source entries need reconciliation.",observed_on:"2026-10-29",author_name:"forged",
  }},now);
  assert.equal(note.author_name,officer.full_name);
  assert.equal(note.observed_on,"2026-10-29");
  const task = await mutateFieldWork(db,officer,{entity:"FollowUpAction",operation:"create",data:{
    investigation_id:caseFile.id,title:"Compare source totals",owner:"District Officer",due_date:"2026-11-03",status:"pending",
  }},now);
  assert.equal(task.status,"pending");
  assert.equal(stored("FollowUpAction",task.id).owner,"District Officer");
  await assert.rejects(mutateFieldWork(db,officer,{entity:"FollowUpAction",operation:"update",id:task.id,data:{status:"completed"}},now),/Record what was done/);
  const finished=await mutateFieldWork(db,officer,{entity:"FollowUpAction",operation:"update",id:task.id,data:{status:"completed",notes:"Compared the original cells and documented the discrepancy."}},now);
  assert.equal(finished.completion_date,"2026-10-30");
  assert.equal(finished.notes,"Compared the original cells and documented the discrepancy.");
  sqlite.close();
});
test("completing an investigation needs a written outcome; evidence never changes", async () => {
  const {db,stored,sqlite} = fixture();
  const created=await mutateFieldWork(db,officer,{entity:"Investigation",operation:"create",data:draft},now);
  await assert.rejects(mutateFieldWork(db,officer,{entity:"Investigation",operation:"update",id:created.id,data:{status:"completed"}},now),/Write an outcome/);
  assert.throws(()=>validateFieldMutation({entity:"Investigation",operation:"update",id:created.id,data:{evidence:"replace source"}}),/Unexpected/);
  assert.throws(()=>validateFieldMutation({entity:"Investigation",operation:"update",id:created.id,data:{metric_snapshot:"alter source"}}),/Unexpected/);
  const closed=await mutateFieldWork(db,officer,{entity:"Investigation",operation:"update",id:created.id,data:{
    status:"completed",outcome_summary:"Source discrepancy recorded; district verification is still needed.",closed_date:"2020-01-01T00:00:00Z"
  }},now);
  assert.equal(closed.closed_date,now());
  assert.equal(stored("Investigation",created.id).evidence,draft.evidence);
  const reopened=await mutateFieldWork(db,officer,{entity:"Investigation",operation:"update",id:created.id,data:{status:"in_progress"}},now);
  assert.equal(reopened.closed_date,"");
  sqlite.close();
});
test("field writes cannot be performed by public viewers or used to invent published measurements", async () => {
  const {db,sqlite} = fixture();
  await assert.rejects(mutateFieldWork(db,viewer,{entity:"Investigation",operation:"create",data:draft},now),/role cannot change/);
  await assert.rejects(mutateFieldWork(db,officer,{entity:"Investigation",operation:"create",data:{...draft,assignee_email:"unknown@example.com"}},now),/active field-work account/);
  assert.throws(()=>validateFieldMutation({entity:"AgriculturalObservation",operation:"create",data:draft}),/not available/);
  assert.throws(()=>validateFieldMutation({entity:"Investigation",operation:"create",data:{...draft,role:"super_admin"}}),/Unexpected/);
  await assert.rejects(mutateFieldWork(db,officer,{entity:"InvestigationNote",operation:"create",data:{investigation_id:"nonexistent",content:"A field observation.",note_type:"note"}},now),/not found/);
  sqlite.close();
});
test("analysts may start evidence checks but cannot change field investigation outcomes", async () => {
  const {db,sqlite} = fixture();
  const started=await mutateFieldWork(db,analyst,{entity:"Investigation",operation:"create",data:draft},now);
  assert.equal(started.requested_by,analyst.email);
  await assert.rejects(mutateFieldWork(db,analyst,{entity:"Investigation",operation:"update",id:started.id,data:{status:"completed",outcome_summary:"Attempted to close without field access."}},now),/role cannot change/);
  await assert.rejects(mutateFieldWork(db,analyst,{entity:"InvestigationNote",operation:"create",data:{investigation_id:started.id,note_type:"note",content:"A field note from an analyst."}},now),/role cannot change/);
  sqlite.close();
});
test("linked alerts preserve server-stored evidence, not client-supplied claims", async () => {
  const {db,sqlite} = fixture();
  const alert={id:"alert-42",title:"Maize trend review",dataset_id:"NISR-2026",dataset_name:"NISR",evidence_snapshot:"Actual preserved alert values",is_demo:true};
  sqlite.prepare("INSERT INTO local_records(entity,id,data,published) VALUES(?,?,?,0)").run("Alert",alert.id,JSON.stringify(alert));
  const created=await mutateFieldWork(db,officer,{entity:"Investigation",operation:"create",data:{
    ...draft,alert_id:"alert-42",dataset_name:"Fabricated provider",metric_snapshot:"Fabricated metric",calculation_snapshot:"Fabricated method",is_demo:false,
  }},now);
  assert.equal(created.metric_snapshot,alert.evidence_snapshot);
  assert.equal(created.dataset_name,alert.dataset_name);
  assert.equal(created.is_demo,true);
  sqlite.close();
});
test("action deadlines and completion notes are validated", async () => {
  const {db,sqlite} = fixture();
  const created=await mutateFieldWork(db,officer,{entity:"Investigation",operation:"create",data:draft},now);
  const partial={entity:"FollowUpAction",operation:"create",data:{investigation_id:created.id,title:"Check source",owner:"Officer"}};
  await assert.rejects(mutateFieldWork(db,officer,partial,now),/due date/);
  await assert.rejects(mutateFieldWork(db,officer,{...partial,data:{...partial.data,due_date:"2026-02-30"}},now),/valid action due date/);
  const task=await mutateFieldWork(db,officer,{...partial,data:{...partial.data,due_date:"2026-11-12"}},now);
  const result=await mutateFieldWork(db,officer,{entity:"FollowUpAction",operation:"update",id:task.id,data:{status:"in_progress"}},now);
  assert.equal(result.status,"in_progress");
  sqlite.close();
});
