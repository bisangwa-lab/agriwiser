-- Additive evidence-verification support. Not applied to production in this change.
-- Verification decisions are immutable: a correction is another verification row
-- plus an investigation note, never an overwrite of the earlier decision.
alter table public.hingasmart_records drop constraint if exists hingasmart_records_entity_check;
alter table public.hingasmart_records add constraint hingasmart_records_entity_check check(entity in ('Dataset','AgriculturalObservation','ImportLog','SourceArchive','SourceTableIndex','SourceTable','SourceReportIndex','SourceReportPage','SurveyFile','Alert','Investigation','FollowUpAction','InvestigationNote','ReportFinding','FieldVisit','ReviewDecision','AuditEvent','EvidenceAttachment','EvidenceVerification'));

drop policy if exists hs_records_read on public.hingasmart_records;
create policy hs_records_read on public.hingasmart_records for select to authenticated using (
 (select auth.uid()) is not null and (select hingasmart_private.current_role()) is not null and (
 (entity in ('Dataset','AgriculturalObservation','SourceTableIndex','SourceTable','SourceReportIndex','SourceReportPage') and published)
 or (entity in ('ImportLog','SourceArchive','SurveyFile') and (select hingasmart_private.current_role()) in ('super_admin','data_manager'))
 or (entity='Alert' and (select hingasmart_private.current_role()) in ('super_admin','data_manager','agricultural_analyst','policy_maker','agricultural_officer','field_investigator','field_supervisor'))
 or (entity='ReportFinding' and (data->>'created_by_id'=(select auth.uid())::text or data->>'created_by'=lower((select auth.jwt()->>'email')) or (select hingasmart_private.current_role())='super_admin'))
 or (entity='Investigation' and (
   hingasmart_private.can_read_case(id)
   or (select hingasmart_private.current_role()) in ('agricultural_analyst','policy_maker','data_manager')
 ))
 or (entity in ('InvestigationNote','FollowUpAction','FieldVisit','ReviewDecision','AuditEvent','EvidenceAttachment','EvidenceVerification') and (
   hingasmart_private.can_read_case(data->>'investigation_id')
   or (select hingasmart_private.current_role()) in ('agricultural_analyst','policy_maker','data_manager')
 ))
 ));

create or replace function public.hs_commit_field_work(p_changes jsonb,p_actor uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare change jsonb; previous jsonb; actor_role text;
begin
 if jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes) not between 2 and 5 or octet_length(p_changes::text)>5000000 then raise exception 'Invalid workflow batch'; end if;
 select workspace_role into actor_role from public.hingasmart_profiles where id=p_actor and active for share;
 if actor_role is null or actor_role not in ('super_admin','field_supervisor','agricultural_officer','field_investigator') then raise exception 'Forbidden' using errcode='42501'; end if;
 if not exists(select 1 from jsonb_array_elements(p_changes) c where c->>'entity'='AuditEvent' and c->'data'->>'actor_id'=p_actor::text) then raise exception 'Audit required'; end if;
 for change in select value from jsonb_array_elements(p_changes) order by value->>'entity',value->>'id' loop
  perform pg_advisory_xact_lock(hashtextextended((change->>'entity')||':'||(change->>'id'),0));
 end loop;
 for change in select value from jsonb_array_elements(p_changes) loop
  if change->>'entity' not in ('Investigation','InvestigationNote','FollowUpAction','FieldVisit','ReviewDecision','AuditEvent','EvidenceAttachment','EvidenceVerification','Alert') or jsonb_typeof(change->'data')<>'object' or change->'data'->>'id'<>change->>'id' then raise exception 'Invalid workflow record'; end if;
  select data into previous from public.hingasmart_records where entity=change->>'entity' and id=change->>'id' for update;
  if ((change->>'expected')::integer=-1 and previous is not null) or ((change->>'expected')::integer>=0 and (previous is null or coalesce((previous->>'version')::integer,0)<>(change->>'expected')::integer)) then raise exception 'Workflow version conflict' using errcode='40001'; end if;
  if change->>'entity' in ('AuditEvent','ReviewDecision','InvestigationNote','EvidenceAttachment','EvidenceVerification') and previous is not null then raise exception 'Immutable history'; end if;
  insert into public.hingasmart_records(entity,id,data,published) values(change->>'entity',change->>'id',change->'data',false)
  on conflict(entity,id) do update set data=excluded.data;
 end loop;
end $$;
revoke all on function public.hs_commit_field_work(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.hs_commit_field_work(jsonb,uuid) to service_role;

create index if not exists hs_case_finding on public.hingasmart_records((data->>'finding_group_id'),id) where entity='Investigation';
create index if not exists hs_evidence_attachment on public.hingasmart_records((data->>'investigation_id'),id) where entity='EvidenceAttachment';
create index if not exists hs_evidence_verification on public.hingasmart_records((data->>'attachment_id'),id) where entity='EvidenceVerification';
notify pgrst,'reload schema';
