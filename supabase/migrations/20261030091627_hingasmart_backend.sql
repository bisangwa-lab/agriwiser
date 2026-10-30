-- AgriWiser application schema. Existing project tables are not modified.
create schema if not exists hingasmart_private;
revoke all on schema hingasmart_private from public;
grant usage on schema hingasmart_private to authenticated, service_role;

create table if not exists public.hingasmart_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check (length(full_name)<=100),
 workspace_role text not null default 'public_viewer' check (workspace_role in ('super_admin','data_manager','agricultural_analyst','policy_maker','agricultural_officer','field_investigator','field_supervisor','farmer','cooperative','buyer','agribusiness','public_viewer')),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.hingasmart_profiles enable row level security;
revoke all on public.hingasmart_profiles from anon,authenticated;
grant select on public.hingasmart_profiles to authenticated;
grant update(full_name) on public.hingasmart_profiles to authenticated;
grant all on public.hingasmart_profiles to service_role;

-- Private, non-API lookup avoids recursive profile policies and stale JWT roles.
-- It can read only the current authenticated user's role; metadata is never trusted.
create or replace function hingasmart_private.current_role() returns text
language sql stable security definer set search_path='' as $$
 select p.workspace_role from public.hingasmart_profiles p
 where p.id=(select auth.uid()) and p.active and (select auth.uid()) is not null
$$;
revoke all on function hingasmart_private.current_role() from public,anon;
grant execute on function hingasmart_private.current_role() to authenticated,service_role;
drop policy if exists hs_profile_read on public.hingasmart_profiles;
create policy hs_profile_read on public.hingasmart_profiles for select to authenticated
 using (id=(select auth.uid()) or (select hingasmart_private.current_role())='super_admin');
drop policy if exists hs_profile_name on public.hingasmart_profiles;
create policy hs_profile_name on public.hingasmart_profiles for update to authenticated
 using (id=(select auth.uid()) and active) with check (id=(select auth.uid()) and active);

create table if not exists public.hingasmart_records (
 entity text not null check (entity in ('Dataset','AgriculturalObservation','ImportLog','SourceArchive','SourceTableIndex','SourceTable','SourceReportIndex','SourceReportPage','SurveyFile','Alert','Investigation','FollowUpAction','InvestigationNote','ReportFinding')),
 id text not null check (length(id) between 1 and 500),
 data jsonb not null check (jsonb_typeof(data)='object' and data->>'id'=id),
 published boolean not null default false,
 primary key(entity,id)
);
create index if not exists hs_records_json on public.hingasmart_records using gin(data jsonb_path_ops);
create index if not exists hs_records_year on public.hingasmart_records(entity,(data->>'year'),id);
create index if not exists hs_records_crop_scope on public.hingasmart_records(entity,(data->>'crop'),(data->>'geography'),(data->>'season'),id);
create index if not exists hs_records_parent on public.hingasmart_records(entity,(data->>'investigation_id'),id);
alter table public.hingasmart_records enable row level security;
revoke all on public.hingasmart_records from anon,authenticated;
grant select on public.hingasmart_records to authenticated;
grant all on public.hingasmart_records to service_role;
drop policy if exists hs_records_read on public.hingasmart_records;
create policy hs_records_read on public.hingasmart_records for select to authenticated using (
 (select auth.uid()) is not null and (select hingasmart_private.current_role()) is not null and (
  (entity in ('Dataset','AgriculturalObservation','SourceTableIndex','SourceTable','SourceReportIndex','SourceReportPage') and published)
  or (entity in ('ImportLog','SourceArchive','SurveyFile') and (select hingasmart_private.current_role()) in ('super_admin','data_manager'))
  or (entity in ('Alert','Investigation','FollowUpAction','InvestigationNote','ReportFinding') and (select hingasmart_private.current_role()) in ('super_admin','data_manager','agricultural_analyst','policy_maker','agricultural_officer','field_investigator','field_supervisor'))
 )
);
-- Writes use our server after fresh identity, role and payload checks. The secret
-- client is never returned to a browser; direct Data API writes are denied.

create or replace function public.hs_read_records(p_entity text,p_query jsonb default '{}'::jsonb,p_sort text default 'id',p_limit integer default 1000,p_offset integer default 0,p_view text default 'full') returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare order_field text; order_sql text; result jsonb; item_count integer;
begin
 if auth.uid() is null then raise exception 'Unauthorized'; end if;
 if p_limit<1 or p_limit>2000 or p_offset<0 or p_offset>10000000 or p_view not in ('full','metrics') or jsonb_typeof(p_query)<>'object' then raise exception 'Invalid read bounds'; end if;
 if exists(select 1 from jsonb_object_keys(p_query) k where k not in ('id','domain','crop','geography','season','year','indicator','dataset_id','investigation_id','status','aggregation_level','family','topic','archive','report_id','measure_group')) then raise exception 'Invalid filter'; end if;
 order_field:=ltrim(p_sort,'-');
 if order_field not in ('id','created_date','updated_date','completed_date','generated_date','due_date','year','name') then raise exception 'Invalid order'; end if;
 order_sql:=case when order_field='id' then 'r.id' else format('r.data->>%L',order_field) end || case when left(p_sort,1)='-' then ' desc nulls last' else ' asc nulls last' end || ',r.id asc';
 execute format('select coalesce(jsonb_agg(page.data),''[]''::jsonb) from (select r.data from public.hingasmart_records r where r.entity=$1 and r.data @> ($2-''measure_group'') and (not ($2 ? ''measure_group'') or r.data->>''indicator'' in (''production'',''harvested_area'')) order by %s limit $3 offset $4) page',order_sql)
 into result using p_entity,p_query,p_limit+1,p_offset;
 item_count:=jsonb_array_length(result);
 if item_count>p_limit then result:=result-p_limit; end if;
 if p_view='metrics' then
  select coalesce(jsonb_agg((select jsonb_object_agg(k,v) from jsonb_each(item) e(k,v) where k in ('id','domain','crop','geography','season','year','indicator','value','unit','dataset_id','is_demo','quality_status','quality_flags','aggregation_level'))),'[]'::jsonb) into result from jsonb_array_elements(result) item;
 end if;
 return jsonb_build_object('items',result,'has_more',item_count>p_limit,'next_cursor',case when item_count>p_limit then (p_offset+p_limit)::text else null end);
end $$;
revoke all on function public.hs_read_records(text,jsonb,text,integer,integer,text) from public,anon;
grant execute on function public.hs_read_records(text,jsonb,text,integer,integer,text) to authenticated;

create table if not exists public.hs_weather_cache(cache_key text primary key,data jsonb not null,expires_at bigint not null,provider text,record_days integer not null default 0,rainfall_missing integer not null default 0,temperature_missing integer not null default 0);
create index if not exists hs_weather_expiry on public.hs_weather_cache(expires_at);
create table if not exists public.hs_weather_limits(limit_key text primary key,window_start bigint not null,used bigint not null);
create table if not exists public.hs_weather_events(id bigint generated always as identity primary key,occurred_at timestamptz not null,provider text not null,event text not null,code text);
alter table public.hs_weather_cache enable row level security;
alter table public.hs_weather_limits enable row level security;
alter table public.hs_weather_events enable row level security;
revoke all on public.hs_weather_cache,public.hs_weather_limits,public.hs_weather_events from anon,authenticated;
grant all on public.hs_weather_cache,public.hs_weather_limits,public.hs_weather_events to service_role;
grant usage,select on sequence public.hs_weather_events_id_seq to service_role;

create or replace function public.hs_consume_weather_budget(p_key text,p_limit bigint,p_cost bigint,p_window_ms bigint) returns boolean
language plpgsql security invoker set search_path='' as $$
declare window_start_ms bigint; consumed bigint;
begin
 if p_limit<1 or p_cost<1 or p_cost>p_limit or p_window_ms<1000 or p_window_ms>172800000 or length(p_key)>200 then raise exception 'Invalid budget'; end if;
 window_start_ms:=floor(extract(epoch from clock_timestamp())*1000/p_window_ms)*p_window_ms;
 insert into public.hs_weather_limits as limits(limit_key,window_start,used) values(p_key,window_start_ms,p_cost)
 on conflict(limit_key) do update set window_start=excluded.window_start,used=case when limits.window_start=excluded.window_start then limits.used+p_cost else p_cost end
 where limits.window_start<>excluded.window_start or limits.used<=p_limit-p_cost returning used into consumed;
 delete from public.hs_weather_limits where window_start<window_start_ms-172800000;
 return consumed is not null;
end $$;
revoke all on function public.hs_consume_weather_budget(text,bigint,bigint,bigint) from public,anon,authenticated;
grant execute on function public.hs_consume_weather_budget(text,bigint,bigint,bigint) to service_role;

create or replace function public.hs_weather_inventory() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'entries',coalesce((select jsonb_agg(jsonb_build_object('cache_key',cache_key,'source',data->'source','days',record_days,'expires_at',expires_at,'rainfall_missing',rainfall_missing,'temperature_missing',temperature_missing)) from public.hs_weather_cache where cache_key like 'weather-v1|%'),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(e) from (select occurred_at as at,provider,event,code from public.hs_weather_events order by id desc limit 20) e),'[]'::jsonb))
$$;
revoke all on function public.hs_weather_inventory() from public,anon,authenticated;
grant execute on function public.hs_weather_inventory() to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('hingasmart-weather','hingasmart-weather',false,8388608,array['application/json']) on conflict(id) do nothing;
notify pgrst,'reload schema';

create or replace function public.hs_record_weather_event(p_at timestamptz,p_provider text,p_event text,p_code text default null) returns void language plpgsql security invoker set search_path='' as $$
begin
 insert into public.hs_weather_events(occurred_at,provider,event,code) values(p_at,left(p_provider,100),left(p_event,30),left(p_code,100));
 delete from public.hs_weather_events where id not in (select id from public.hs_weather_events order by id desc limit 100);
end $$;
revoke all on function public.hs_record_weather_event(timestamptz,text,text,text) from public,anon,authenticated;
grant execute on function public.hs_record_weather_event(timestamptz,text,text,text) to service_role;
notify pgrst,'reload schema';

create or replace function public.hs_assign_account_role(p_id uuid,p_role text) returns void language plpgsql security invoker set search_path='' as $$
declare previous_role text;
begin
 perform pg_advisory_xact_lock(hashtext('hingasmart-account-roles'));
 select workspace_role into previous_role from public.hingasmart_profiles where id=p_id for update;
 if previous_role is null then raise exception 'Unknown account'; end if;
 if previous_role='super_admin' and p_role<>'super_admin' and (select count(*) from public.hingasmart_profiles where workspace_role='super_admin' and active)<=1 then raise exception 'The last administrator cannot be demoted'; end if;
 update public.hingasmart_profiles set workspace_role=p_role where id=p_id;
end $$;
revoke all on function public.hs_assign_account_role(uuid,text) from public,anon,authenticated;
grant execute on function public.hs_assign_account_role(uuid,text) to service_role;
notify pgrst,'reload schema';
