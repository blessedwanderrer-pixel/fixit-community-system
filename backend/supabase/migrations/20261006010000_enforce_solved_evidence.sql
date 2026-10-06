-- Require exact-report Before and After objects to exist in private Storage
-- before any report can transition from In Progress to Solved.

begin;

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
    or (old.status in ('Submitted', 'Approved', 'Scheduled', 'In Progress')
        and new.status = 'Cancelled' and new.merged_into_report_id is not null)
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_STATUS_TRANSITION';
  end if;

  if new.status = 'Solved' and not (
    exists (
      select 1
      from public.report_media as rm
      join storage.objects as so
        on so.bucket_id = rm.storage_bucket
       and so.name = rm.storage_object_path
      where rm.report_id = new.id
        and rm.stage = 'before'
        and rm.storage_bucket = 'report-media'
        and split_part(rm.storage_object_path, '/', 1) = new.id::text
    )
    and exists (
      select 1
      from public.report_media as rm
      join storage.objects as so
        on so.bucket_id = rm.storage_bucket
       and so.name = rm.storage_object_path
      where rm.report_id = new.id
        and rm.stage = 'after'
        and rm.storage_bucket = 'report-media'
        and split_part(rm.storage_object_path, '/', 1) = new.id::text
    )
  ) then
    raise exception using errcode = 'P0001', message = 'MISSING_BEFORE_AFTER_EVIDENCE';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_problem_report_workflow on public.problem_reports;
create trigger enforce_problem_report_workflow
before update of status on public.problem_reports
for each row execute function private.enforce_report_workflow();

create or replace function public.fixit_advance_report(
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
    select 1
    from public.work_records
    where report_id = p_report_id
      and coordinator_id = p_coordinator_id
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

  if p_target_status = 'Solved' and not (
    exists (
      select 1
      from public.report_media as rm
      join storage.objects as so
        on so.bucket_id = rm.storage_bucket
       and so.name = rm.storage_object_path
      where rm.report_id = p_report_id
        and rm.stage = 'before'
        and rm.storage_bucket = 'report-media'
        and split_part(rm.storage_object_path, '/', 1) = p_report_id::text
    )
    and exists (
      select 1
      from public.report_media as rm
      join storage.objects as so
        on so.bucket_id = rm.storage_bucket
       and so.name = rm.storage_object_path
      where rm.report_id = p_report_id
        and rm.stage = 'after'
        and rm.storage_bucket = 'report-media'
        and split_part(rm.storage_object_path, '/', 1) = p_report_id::text
    )
  ) then
    raise exception using errcode = 'P0001', message = 'MISSING_BEFORE_AFTER_EVIDENCE';
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
  where report_id = p_report_id
    and coordinator_id = p_coordinator_id;

  update public.problem_reports
  set status = p_target_status,
      status_changed_by = p_coordinator_id,
      status_changed_at = now()
  where id = p_report_id
  returning * into target_report;

  return to_jsonb(target_report);
end;
$$;

revoke all on function public.fixit_advance_report(uuid, uuid, public.report_status, text)
from public, anon, authenticated;
grant execute on function public.fixit_advance_report(uuid, uuid, public.report_status, text)
to service_role;

commit;
