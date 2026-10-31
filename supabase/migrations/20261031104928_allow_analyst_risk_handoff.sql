-- Analysts may submit only the audited risk-engine handoff that the application
-- already exposes to them. All other workflow writes remain field-staff-only.
create or replace function public.hs_commit_field_work(p_changes jsonb,p_actor uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare change jsonb; previous jsonb; actor_role text; analyst_handoff boolean;
begin
 if jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes) not between 2 and 5 or octet_length(p_changes::text)>5000000 then raise exception 'Invalid workflow batch'; end if;
 select workspace_role into actor_role from public.hingasmart_profiles where id=p_actor and active for share;
 analyst_handoff := actor_role in ('agricultural_analyst','policy_maker')
  and jsonb_array_length(p_changes)=2
  and not exists(select 1 from jsonb_array_elements(p_changes) c where c->>'entity' not in ('Investigation','AuditEvent'))
  and exists(select 1 from jsonb_array_elements(p_changes) c where c->>'entity'='Investigation' and c->'data'->>'source'='risk_engine' and c->'data'->>'created_by_id'=p_actor::text)
  and exists(select 1 from jsonb_array_elements(p_changes) c where c->>'entity'='AuditEvent' and c->'data'->>'actor_id'=p_actor::text);
 if actor_role is null or not (actor_role in ('super_admin','field_supervisor','agricultural_officer','field_investigator') or coalesce(analyst_handoff,false)) then raise exception 'Forbidden' using errcode='42501'; end if;
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
notify pgrst,'reload schema';
