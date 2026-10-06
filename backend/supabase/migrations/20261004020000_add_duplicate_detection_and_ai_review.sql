-- Exact 100-meter duplicate candidates and Admin merge review.

create schema if not exists extensions;
create extension if not exists postgis schema extensions;

create type public.duplicate_review_status as enum (
  'Possible Duplicate',
  'Merged',
  'Dismissed'
);

alter table public.problem_reports
add column location extensions.geography(Point, 4326)
generated always as (
  extensions.st_setsrid(
    extensions.st_makepoint(longitude, latitude),
    4326
  )::extensions.geography
) stored;

create index problem_reports_location_gist_idx
on public.problem_reports using gist (location);

create table public.report_duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.problem_reports (id) on delete cascade,
  candidate_report_id uuid not null references public.problem_reports (id) on delete cascade,
  distance_meters double precision not null check (
    distance_meters >= 0 and distance_meters <= 100
  ),
  status public.duplicate_review_status not null default 'Possible Duplicate',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint duplicate_candidate_distinct_reports check (report_id <> candidate_report_id),
  unique (report_id, candidate_report_id)
);

create index report_duplicate_candidates_report_idx
on public.report_duplicate_candidates (report_id, status);
create index report_duplicate_candidates_candidate_idx
on public.report_duplicate_candidates (candidate_report_id, status);

create trigger report_duplicate_candidates_set_updated_at
before update on public.report_duplicate_candidates
for each row execute function private.set_updated_at();

alter table public.report_duplicate_candidates enable row level security;
revoke all on table public.report_duplicate_candidates from anon, authenticated;
grant select, update on table public.report_duplicate_candidates to authenticated;
grant all on table public.report_duplicate_candidates to service_role;

create policy duplicate_candidates_select_admin_only
on public.report_duplicate_candidates for select to authenticated
using ((select private.is_admin()));

create policy duplicate_candidates_update_admin_only
on public.report_duplicate_candidates for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create or replace function private.enforce_report_workflow()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if not (
    (old.status = 'Submitted' and new.status in ('Approved', 'Rejected', 'Cancelled'))
    or (old.status = 'Approved' and new.status = 'Scheduled')
    or (old.status = 'Scheduled' and new.status = 'In Progress')
    or (old.status = 'In Progress' and new.status = 'Solved')
    or (
      old.status in ('Submitted', 'Approved', 'Scheduled', 'In Progress')
      and new.status = 'Cancelled'
      and new.merged_into_report_id is not null
    )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_STATUS_TRANSITION';
  end if;

  if new.status = 'Solved' and not (
    exists (
      select 1 from public.report_media
      where report_id = new.id and stage = 'before'
    )
    and exists (
      select 1 from public.report_media
      where report_id = new.id and stage = 'after'
    )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'MISSING_BEFORE_AFTER_EVIDENCE';
  end if;

  return new;
end;
$$;

create or replace function public.fixit_create_report(
  p_citizen_id uuid,
  p_description text,
  p_category text,
  p_latitude double precision,
  p_longitude double precision,
  p_photo_reference text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_report public.problem_reports;
  candidate_count integer;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_citizen_id and role = 'citizen'
  ) then
    raise exception using errcode = 'P0001', message = 'CITIZEN_REQUIRED';
  end if;

  if length(btrim(p_description)) = 0
     or length(btrim(p_category)) = 0
     or length(btrim(p_photo_reference)) = 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_REPORT_INPUT';
  end if;

  insert into public.problem_reports (
    created_by, description, category, latitude, longitude
  ) values (
    p_citizen_id, btrim(p_description), btrim(p_category), p_latitude, p_longitude
  )
  returning * into created_report;

  insert into public.report_media (
    report_id, uploaded_by, stage, storage_object_path
  ) values (
    created_report.id, p_citizen_id, 'report', p_photo_reference
  );

  insert into public.report_duplicate_candidates (
    report_id, candidate_report_id, distance_meters
  )
  select
    created_report.id,
    existing.id,
    extensions.st_distance(created_report.location, existing.location)
  from public.problem_reports as existing
  where existing.id <> created_report.id
    and existing.category = created_report.category
    and existing.status in ('Submitted', 'Approved', 'Scheduled', 'In Progress')
    and existing.merged_into_report_id is null
    and extensions.st_dwithin(created_report.location, existing.location, 100)
  on conflict (report_id, candidate_report_id) do nothing;

  get diagnostics candidate_count = row_count;

  return to_jsonb(created_report) || jsonb_build_object(
    'possible_duplicate', candidate_count > 0,
    'duplicate_candidate_count', candidate_count,
    'media', jsonb_build_array(jsonb_build_object(
      'stage', 'report',
      'storage_bucket', 'report-media',
      'storage_object_path', p_photo_reference
    ))
  );
end;
$$;

create function public.fixit_merge_duplicate_report(
  p_report_id uuid,
  p_target_report_id uuid,
  p_admin_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_report public.problem_reports;
  target_report public.problem_reports;
begin
  if not exists (
    select 1 from public.profiles where id = p_admin_id and role = 'admin'
  ) then
    raise exception using errcode = 'P0001', message = 'ADMIN_REQUIRED';
  end if;
  if p_report_id = p_target_report_id then
    raise exception using errcode = 'P0001', message = 'INVALID_MERGE_TARGET';
  end if;

  select * into source_report
  from public.problem_reports
  where id = p_report_id
  for update;
  select * into target_report
  from public.problem_reports
  where id = p_target_report_id
  for update;

  if source_report.id is null or target_report.id is null then
    raise exception using errcode = 'P0001', message = 'REPORT_NOT_FOUND';
  end if;
  if source_report.merged_into_report_id is not null
     or target_report.merged_into_report_id is not null then
    raise exception using errcode = 'P0001', message = 'REPORT_ALREADY_MERGED';
  end if;
  if target_report.status not in ('Submitted', 'Approved', 'Scheduled', 'In Progress') then
    raise exception using errcode = 'P0001', message = 'MERGE_TARGET_NOT_ACTIVE';
  end if;
  if not exists (
    select 1 from public.report_duplicate_candidates
    where report_id = p_report_id
      and candidate_report_id = p_target_report_id
      and status = 'Possible Duplicate'
  ) then
    raise exception using errcode = 'P0001', message = 'DUPLICATE_CANDIDATE_REQUIRED';
  end if;

  update public.problem_reports
  set merged_into_report_id = p_target_report_id,
      status = 'Cancelled',
      status_changed_by = p_admin_id,
      status_changed_at = now()
  where id = p_report_id;

  update public.report_duplicate_candidates
  set status = 'Merged', reviewed_by = p_admin_id, reviewed_at = now()
  where report_id = p_report_id and candidate_report_id = p_target_report_id;

  select * into target_report
  from public.problem_reports
  where id = p_target_report_id;

  return to_jsonb(target_report) || jsonb_build_object(
    'merged_report_id', p_report_id,
    'reporters_preserved', (
      select count(*) from public.report_reporters
      where report_id = p_target_report_id
    )
  );
end;
$$;

revoke all on function public.fixit_merge_duplicate_report(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.fixit_merge_duplicate_report(uuid, uuid, uuid)
to service_role;
