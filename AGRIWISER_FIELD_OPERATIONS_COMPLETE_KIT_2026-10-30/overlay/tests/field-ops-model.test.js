import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summaryFromLoaded, actionTiming, selectTopFindings, displayMetric, buildInvestigationDraftFromAlert, potentialTruncation, plusDaysISO } from '../src/lib/field-ops-model.js';

test('missing metric is unavailable, while a source zero is zero', () => {
  assert.equal(displayMetric(null, 't'), 'Unavailable');
  assert.equal(displayMetric(undefined, 'ha'), 'Unavailable');
  assert.equal(displayMetric(0, 'ha'), '0 ha');
  assert.equal(displayMetric(NaN, 't'), 'Unavailable');
});
test('overdue, due soon and past actions are distinct', () => {
  const date='2026-10-30';
  assert.equal(actionTiming({status:'pending',due_date:'2026-10-29'},date),'overdue');
  assert.equal(actionTiming({status:'in_progress',due_date:'2026-10-30'},date),'due-soon');
  assert.equal(actionTiming({status:'pending',due_date:'2026-11-06'},date),'due-soon');
  assert.equal(actionTiming({status:'pending',due_date:'2026-11-07'},date),'later');
  assert.equal(actionTiming({status:'completed',due_date:'2026-10-01'},date),'none');
  assert.equal(actionTiming({status:'pending',due_date:''},date),'none');
  assert.equal(actionTiming({status:'pending',due_date:'2026-02-31'},date),'none');
  assert.equal(plusDaysISO('2026-12-29',7),'2027-01-05');
});
test('assigned-to-me count only active cases, email matching is case-insensitive', () => {
  const x=summaryFromLoaded({
    userEmail:'OFFICER@example.org', dateISO:'2026-10-30',
    investigations:[{status:'in_progress',assignee_email:'officer@example.org'}, {status:'completed',assignee_email:'officer@example.org'}, {status:'awaiting_evidence',assignee_email:'Another@example.org'}],
    actions:[{status:'pending',due_date:'2026-10-29'}],
    alerts:[{status:'new'}, {status:'dismissed'}],
  });
  assert.deepEqual(x.counts,{assigned:1,open:2,evidence:1,overdue:1,dueSoon:0,signals:1});
});
test('priority review signals sorted before informational signals',()=>{
 const items=[{id:'z',severity:'info',status:'new'},{id:'b',severity:'priority',status:'new'},{id:'a',severity:'review',status:'new'},{id:'c',severity:'priority',status:'resolved'}];
 assert.deepEqual(selectTopFindings(items).map(x=>x.id),['b','a','z']);
});
test('investigation draft preserves provenance and missing measurements',()=>{
 const d=buildInvestigationDraftFromAlert({id:'signal-1',title:'Source review',indicator:'production',unit:'t',observed_value:null,previous_value:18,district:'Kirehe',crop:'Maize',status:'new',rule_id:'YOY-CHANGE',rule_version:1});
 const s=JSON.parse(d.metric_snapshot);
 assert.equal(s.current_value,null);
 assert.equal(s.baseline_value,18);
 assert.equal(s.source_dataset_name,null);
 assert.match(d.evidence,/Unavailable/);
 assert.throws(()=>buildInvestigationDraftFromAlert({}),/valid source alert/);
});
test('hook list limits signal non-authoritative counts',()=>{
 assert.equal(potentialTruncation({investigations:Array(300).fill({})}),true);
 assert.equal(potentialTruncation({alerts:[]}),false);
});
