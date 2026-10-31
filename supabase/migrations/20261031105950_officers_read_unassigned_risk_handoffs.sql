-- Field staff can read unassigned investigations created from verified risk signals.
-- Analysts and policy makers already have broader read access through hs_records_read.
create or replace function hingasmart_private.can_read_case(p_id text) returns boolean
language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists (
  select 1
  from public.hingasmart_profiles p
  join public.hingasmart_records r on r.entity='Investigation' and r.id=p_id
  where p.id=(select auth.uid()) and p.active and (
   p.workspace_role in ('super_admin','field_supervisor')
   or (
    p.workspace_role in ('agricultural_officer','field_investigator')
    and (
     r.data->>'assignee_id'=p.id::text
     or r.data->>'created_by_id'=p.id::text
     or lower(r.data->>'assignee_email')=lower((select auth.jwt()->>'email'))
     or lower(r.data->>'created_by')=lower((select auth.jwt()->>'email'))
     or (
      r.data->>'source'='risk_engine'
      and coalesce(r.data->>'assignee_id','')=''
      and coalesce(r.data->>'assignee_email','')=''
     )
    )
   )
  )
 )
$$;

revoke all on function hingasmart_private.can_read_case(text) from public,anon;
grant execute on function hingasmart_private.can_read_case(text) to authenticated;
notify pgrst,'reload schema';
