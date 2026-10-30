const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const list = (items, render) => (items?.length ? items.map(render).join("") : "<p><em>None recorded.</em></p>");
const paragraph = (value) => (value ? `<p>${escapeHtml(value).replaceAll("\n", "<br />")}</p>` : "<p><em>Not recorded.</em></p>");

/**
 * Builds a self-contained printable HTML document from an authorized field
 * report payload. Every interpolated value is escaped: audit text can contain
 * angle brackets from stored notes, and the report must never execute it.
 */
export function buildFieldReportHtml(report) {
  const investigation = report?.investigation ?? {};
  const notes = report?.InvestigationNote ?? [];
  const tasks = report?.FollowUpAction ?? [];
  const visits = report?.FieldVisit ?? [];
  const evidence = report?.EvidenceAttachment ?? [];
  const verifications = report?.EvidenceVerification ?? [];
  const reviews = report?.ReviewDecision ?? [];
  const audit = report?.AuditEvent ?? [];

  const verificationFor = (attachmentId) =>
    verifications
      .filter((item) => item.attachment_id === attachmentId)
      .sort((a, b) => String(b.created_date ?? "").localeCompare(String(a.created_date ?? "")))[0];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="robots" content="noindex,nofollow" />
<title>${escapeHtml(investigation.title || "Investigation report")} · AgriWiser</title>
<style>
 body{font-family:Georgia,"Times New Roman",serif;color:#1f2937;max-width:820px;margin:32px auto;padding:0 24px;line-height:1.5}
 h1{font-size:24px;margin:0 0 4px} h2{font-size:16px;margin:26px 0 8px;border-bottom:1px solid #d1d5db;padding-bottom:4px}
 .meta{color:#4b5563;font-size:12px} .warning{border:1px solid #f59e0b;background:#fffbeb;padding:10px;font-size:12px;margin:16px 0}
 table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px} th,td{border:1px solid #d1d5db;padding:6px;text-align:left;vertical-align:top}
 th{background:#f3f4f6} ul{margin:6px 0;padding-left:20px} .muted{color:#6b7280;font-size:11px}
 @media print{body{margin:0;max-width:none}}
</style>
</head>
<body>
<h1>${escapeHtml(investigation.title || "Investigation report")}</h1>
<p class="meta">${escapeHtml(report?.classification || "Private staff report")} · Generated ${escapeHtml(report?.generated_at || "")}</p>
<p class="meta">${escapeHtml([investigation.crop, investigation.district, investigation.period].filter(Boolean).join(" · "))}</p>
<div class="warning">${escapeHtml(report?.limitations || "")}</div>

<h2>Case scope</h2>
<p><strong>Status:</strong> ${escapeHtml(investigation.status || "")} · <strong>Review:</strong> ${escapeHtml(investigation.review_status || "")} · <strong>Priority:</strong> ${escapeHtml(investigation.priority || "")}</p>
<p><strong>Reason:</strong></p>${paragraph(investigation.reason)}
<p><strong>Questions to check:</strong></p>${paragraph(investigation.questions)}
<p><strong>Source dataset:</strong> ${escapeHtml(investigation.dataset_name || "Not recorded")}</p>
<p><strong>Outcome and limitations:</strong></p>${paragraph(investigation.outcome_summary)}

<h2>Observations and source checks (${notes.length})</h2>
${list(notes, (note) => `<p><strong>${escapeHtml(note.note_type)}</strong> · ${escapeHtml(note.source_class || "")} · ${escapeHtml(note.observed_on || note.created_date || "")} · ${escapeHtml(note.author_name || "")}</p>${paragraph(note.content)}${note.measurement != null ? `<p class="muted">Measured: ${escapeHtml(note.measurement)} ${escapeHtml(note.unit || "")} (${escapeHtml(note.quality_status || "unreviewed")})</p>` : ""}`)}

<h2>Evidence references (${evidence.length})</h2>
${evidence.length ? `<table><thead><tr><th>Title</th><th>Type</th><th>Reference</th><th>Collected</th><th>Verification</th></tr></thead><tbody>${evidence.map((item) => {
    const verification = verificationFor(item.id);
    return `<tr><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.evidence_type)}</td><td>${escapeHtml(item.reference)}</td><td>${escapeHtml(item.collected_on)}</td><td>${escapeHtml(verification ? `${verification.decision}: ${verification.reason}` : "Unverified")}</td></tr>`;
  }).join("")}</tbody></table><p class="muted">Only references and metadata are stored. No file content is uploaded, scanned or analysed by this application.</p>` : "<p><em>None recorded.</em></p>"}

<h2>Follow-up actions (${tasks.length})</h2>
${list(tasks, (task) => `<p><strong>${escapeHtml(task.title)}</strong> · ${escapeHtml(task.status)} · owner ${escapeHtml(task.owner || "unassigned")} · due ${escapeHtml(task.due_date || "not set")}</p>${task.notes ? paragraph(task.notes) : ""}`)}

<h2>Field visits (${visits.length})</h2>
${list(visits, (visit) => `<p><strong>${escapeHtml(visit.purpose)}</strong> · ${escapeHtml(visit.status)} · ${escapeHtml(visit.scheduled_for || "")}</p>`)} 

<h2>Review decisions (${reviews.length})</h2>
${list(reviews, (review) => `<p><strong>${escapeHtml(review.decision)}</strong> · ${escapeHtml(review.actor_name || "")} · ${escapeHtml(review.created_date || "")}</p>${paragraph(review.reason)}`)}

<h2>Audit trail (${audit.length})</h2>
${audit.length ? `<table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Record</th><th>Reason</th></tr></thead><tbody>${audit.map((event) => `<tr><td>${escapeHtml(event.created_date)}</td><td>${escapeHtml(event.actor_name || event.actor_id)}</td><td>${escapeHtml(event.action)}</td><td>${escapeHtml(event.entity)} ${escapeHtml(event.record_id)}</td><td>${escapeHtml(event.reason || "")}</td></tr>`).join("")}</tbody></table>` : "<p><em>None recorded.</em></p>"}
<p class="muted">Statistical signals and climate estimates do not establish causation. Missing source values remain unavailable rather than zero.</p>
</body>
</html>`;
}

export { escapeHtml };
