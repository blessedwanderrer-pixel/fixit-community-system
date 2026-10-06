-- Core problem-report workflow. Apply after the initial foundation migration.

alter table public.problem_reports
add column category text;

alter table public.problem_reports
add constraint problem_reports_category_not_blank
check (category is null or length(btrim(category)) > 0);

-- A report is created after the client has uploaded or otherwise obtained a
-- photo reference, so the referenced object path is not required to start with
-- the newly generated report UUID.
alter table public.report_media
drop constraint report_media_path_belongs_to_report;

-- The original foundation constrained actual start time to be after the planned
-- schedule. The PRD does not require that restriction; only chronological work
-- completion is enforced.
alter table public.work_records
drop constraint work_record_time_order;

alter table public.work_records
add constraint work_record_completion_order
check (completed_at is null or started_at is null or completed_at >= started_at);

create function private.enforce_report_workflow()
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

create trigger enforce_problem_report_workflow
before update of status on public.problem_reports
for each row execute function private.enforce_report_workflow();

create function public.fixit_create_report(
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

  return to_jsonb(created_report) || jsonb_build_object(
    'media', jsonb_build_array(jsonb_build_object(
      'stage', 'report',
      'storage_bucket', 'report-media',
      'storage_object_path', p_photo_reference
    ))
  );
end;
$$;

create function public.fixit_cancel_report(p_report_id uuid, p_citizen_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_report public.problem_reports;
begin
  select * into target_report
  from public.problem_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'REPORT_NOT_FOUND';
  end if;
  if target_report.created_by is distinct from p_citizen_id then
    raise exception using errcode = 'P0001', message = 'REPORT_FORBIDDEN';
  end if;
  if target_report.status <> 'Submitted' then
    raise exception using errcode = 'P0001', message = 'CANCEL_REQUIRES_SUBMITTED';
  end if;

  update public.problem_reports
  set status = 'Cancelled',
      status_changed_by = p_citizen_id,
      status_changed_at = now()
  where id = p_report_id
  returning * into target_report;

  return to_jsonb(target_report);
end;
$$;

create function public.fixit_admin_decide_report(
  p_report_id uuid,
  p_admin_id uuid,
  p_decision public.report_status
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_report public.problem_reports;
begin
  if not exists (
    select 1 from public.profiles where id = p_admin_id and role = 'admin'
  ) then
    raise exception using errcode = 'P0001', message = 'ADMIN_REQUIRED';
  end if;
  if p_decision not in ('Approved', 'Rejected') then
    raise exception using errcode = 'P0001', message = 'INVALID_ADMIN_DECISION';
  end if;

  select * into target_report
  from public.problem_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'REPORT_NOT_FOUND';
  end if;
  if target_report.status <> 'Submitted' then
    raise exception using errcode = 'P0001', message = 'DECISION_REQUIRES_SUBMITTED';
  end if;

  update public.problem_reports
  set status = p_decision,
      status_changed_by = p_admin_id,
      status_changed_at = now()
  where id = p_report_id
  returning * into target_report;

  return to_jsonb(target_report);
end;
$$;

create function public.fixit_schedule_report(
  p_report_id uuid,
  p_coordinator_id uuid,
  p_scheduled_for timestamptz,
  p_work_details text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_report public.problem_reports;
  created_work public.work_records;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_coordinator_id and role = 'coordinator'
  ) then
    raise exception using errcode = 'P0001', message = 'COORDINATOR_REQUIRED';
  end if;

  select * into target_report
  from public.problem_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'REPORT_NOT_FOUND';
  end if;
  if target_report.status <> 'Approved' then
    raise exception using errcode = 'P0001', message = 'SCHEDULE_REQUIRES_APPROVED';
  end if;

  insert into public.work_records (
    report_id, coordinator_id, scheduled_for, notes
  ) values (
    p_report_id, p_coordinator_id, p_scheduled_for, p_work_details
  )
  returning * into created_work;

  update public.problem_reports
  set status = 'Scheduled',
      status_changed_by = p_coordinator_id,
      status_changed_at = now()
  where id = p_report_id
  returning * into target_report;

  return to_jsonb(target_report) || jsonb_build_object('work_record', to_jsonb(created_work));
end;
$$;

create function public.fixit_add_work_evidence(
  p_report_id uuid,
  p_coordinator_id uuid,
  p_stage public.media_stage,
  p_photo_reference text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_media public.report_media;
  current_status public.report_status;
begin
  if p_stage not in ('before', 'after') then
    raise exception using errcode = 'P0001', message = 'INVALID_EVIDENCE_STAGE';
  end if;
  if length(btrim(p_photo_reference)) = 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_PHOTO_REFERENCE';
  end if;
  if not exists (
    select 1 from public.work_records
    where report_id = p_report_id and coordinator_id = p_coordinator_id
  ) then
    raise exception using errcode = 'P0001', message = 'REPORT_FORBIDDEN';
  end if;

  select status into current_status
  from public.problem_reports
  where id = p_report_id;

  if current_status not in ('Scheduled', 'In Progress') then
    raise exception using errcode = 'P0001', message = 'EVIDENCE_REQUIRES_ACTIVE_WORK';
  end if;

  insert into public.report_media (
    report_id, uploaded_by, stage, storage_object_path
  ) values (
    p_report_id, p_coordinator_id, p_stage, p_photo_reference
  )
  returning * into created_media;

  return to_jsonb(created_media);
end;
$$;

create function public.fixit_advance_report(
  p_report_id uuid,
  p_coordinator_id uuid,
  p_target_status public.report_status,
  p_work_details text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_report public.problem_reports;
begin
  if not exists (
    select 1 from public.work_records
    where report_id = p_report_id and coordinator_id = p_coordinator_id
  ) then
    raise exception using errcode = 'P0001', message = 'REPORT_FORBIDDEN';
  end if;

  select * into target_report
  from public.problem_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'REPORT_NOT_FOUND';
  end if;
  if not (
    (target_report.status = 'Scheduled' and p_target_status = 'In Progress')
    or (target_report.status = 'In Progress' and p_target_status = 'Solved')
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_STATUS_TRANSITION';
  end if;

  update public.work_records
  set started_at = case
        when p_target_status = 'In Progress' then coalesce(started_at, now())
        else started_at
      end,
      completed_at = case
        when p_target_status = 'Solved' then now()
        else completed_at
      end,
      notes = coalesce(p_work_details, notes)
  where report_id = p_report_id and coordinator_id = p_coordinator_id;

  update public.problem_reports
  set status = p_target_status,
      status_changed_by = p_coordinator_id,
      status_changed_at = now()
  where id = p_report_id
  returning * into target_report;

  return to_jsonb(target_report);
end;
$$;

revoke all on function public.fixit_create_report(uuid, text, text, double precision, double precision, text)
from public, anon, authenticated;
revoke all on function public.fixit_cancel_report(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.fixit_admin_decide_report(uuid, uuid, public.report_status)
from public, anon, authenticated;
revoke all on function public.fixit_schedule_report(uuid, uuid, timestamptz, text)
from public, anon, authenticated;
revoke all on function public.fixit_add_work_evidence(uuid, uuid, public.media_stage, text)
from public, anon, authenticated;
revoke all on function public.fixit_advance_report(uuid, uuid, public.report_status, text)
from public, anon, authenticated;

grant execute on function public.fixit_create_report(uuid, text, text, double precision, double precision, text)
to service_role;
grant execute on function public.fixit_cancel_report(uuid, uuid)
to service_role;
grant execute on function public.fixit_admin_decide_report(uuid, uuid, public.report_status)
to service_role;
grant execute on function public.fixit_schedule_report(uuid, uuid, timestamptz, text)
to service_role;
grant execute on function public.fixit_add_work_evidence(uuid, uuid, public.media_stage, text)
to service_role;
grant execute on function public.fixit_advance_report(uuid, uuid, public.report_status, text)
to service_role;
