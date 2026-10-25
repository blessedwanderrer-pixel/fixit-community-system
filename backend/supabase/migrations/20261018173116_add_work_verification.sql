-- Add an Admin verification gate between Coordinator completion and the
-- public Solved state. Evidence stays private until Admin approval.

alter table public.work_records
  add column verification_status text,
  add column verification_reason text,
  add column public_summary text,
  add column submitted_for_verification_at timestamptz,
  add column verified_by uuid references public.profiles(id),
  add column verified_at timestamptz;

alter table public.work_records
  add constraint work_records_verification_status_check
  check (verification_status is null or verification_status in ('Pending', 'Approved', 'Objected')),
  add constraint work_records_verification_reason_check
  check (verification_status <> 'Objected' or length(btrim(verification_reason)) > 0),
  add constraint work_records_public_summary_check
  check (public_summary is null or length(btrim(public_summary)) > 0);

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
  if target_report.status <> 'Scheduled' or p_target_status <> 'In Progress' then
    raise exception using errcode = 'P0001', message = 'INVALID_STATUS_TRANSITION';
  end if;

  update public.work_records
  set started_at = coalesce(started_at, now()),
      notes = coalesce(nullif(btrim(p_work_details), ''), notes),
      updated_at = now()
  where report_id = p_report_id and coordinator_id = p_coordinator_id;

  update public.problem_reports
  set status = 'In Progress',
      status_changed_by = p_coordinator_id,
      status_changed_at = now()
  where id = p_report_id
  returning * into target_report;

  return to_jsonb(target_report);
end;
$$;

create function public.fixit_submit_work_verification(
  p_report_id uuid,
  p_coordinator_id uuid,
  p_public_summary text,
  p_work_details text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_work public.work_records;
begin
  if length(btrim(p_public_summary)) = 0 then
    raise exception using errcode = 'P0001', message = 'PUBLIC_SUMMARY_REQUIRED';
  end if;
  if not exists (
    select 1 from public.problem_reports
    where id = p_report_id and status = 'In Progress'
  ) then
    raise exception using errcode = 'P0001', message = 'VERIFICATION_REQUIRES_IN_PROGRESS';
  end if;
  if not exists (
    select 1 from public.report_media rm
    join storage.objects so
      on so.bucket_id = rm.storage_bucket and so.name = rm.storage_object_path
    where rm.report_id = p_report_id and rm.stage = 'before'
      and rm.storage_bucket = 'report-media'
      and rm.storage_object_path like p_report_id::text || '/%'
  ) or not exists (
    select 1 from public.report_media rm
    join storage.objects so
      on so.bucket_id = rm.storage_bucket and so.name = rm.storage_object_path
    where rm.report_id = p_report_id and rm.stage = 'after'
      and rm.storage_bucket = 'report-media'
      and rm.storage_object_path like p_report_id::text || '/%'
  ) then
    raise exception using errcode = 'P0001', message = 'MISSING_BEFORE_AFTER_EVIDENCE';
  end if;

  update public.work_records
  set verification_status = 'Pending',
      verification_reason = null,
      public_summary = btrim(p_public_summary),
      submitted_for_verification_at = now(),
      verified_by = null,
      verified_at = null,
      completed_at = null,
      notes = coalesce(nullif(btrim(p_work_details), ''), notes),
      updated_at = now()
  where report_id = p_report_id and coordinator_id = p_coordinator_id
  returning * into target_work;

  if not found then
    raise exception using errcode = 'P0001', message = 'REPORT_FORBIDDEN';
  end if;
  return to_jsonb(target_work);
end;
$$;

create function public.fixit_review_work_verification(
  p_report_id uuid,
  p_admin_id uuid,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_report public.problem_reports;
  target_work public.work_records;
begin
  if not exists (
    select 1 from public.profiles where id = p_admin_id and role = 'admin'
  ) then
    raise exception using errcode = 'P0001', message = 'ADMIN_REQUIRED';
  end if;
  if p_decision not in ('Approved', 'Objected') then
    raise exception using errcode = 'P0001', message = 'INVALID_VERIFICATION_DECISION';
  end if;
  if p_decision = 'Objected' and length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception using errcode = 'P0001', message = 'OBJECTION_REASON_REQUIRED';
  end if;

  select * into target_report
  from public.problem_reports where id = p_report_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'REPORT_NOT_FOUND';
  end if;

  select * into target_work
  from public.work_records
  where report_id = p_report_id and verification_status = 'Pending'
  order by updated_at desc limit 1 for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'PENDING_VERIFICATION_NOT_FOUND';
  end if;

  update public.work_records
  set verification_status = p_decision,
      verification_reason = case when p_decision = 'Objected' then btrim(p_reason) else null end,
      verified_by = p_admin_id,
      verified_at = now(),
      completed_at = case when p_decision = 'Approved' then now() else null end,
      updated_at = now()
  where id = target_work.id
  returning * into target_work;

  if p_decision = 'Approved' then
    update public.problem_reports
    set status = 'Solved', status_changed_by = p_admin_id, status_changed_at = now()
    where id = p_report_id;
  end if;

  return to_jsonb(target_work);
end;
$$;

revoke all on function public.fixit_submit_work_verification(uuid, uuid, text, text)
from public, anon, authenticated;
revoke all on function public.fixit_review_work_verification(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.fixit_submit_work_verification(uuid, uuid, text, text)
to authenticated;
grant execute on function public.fixit_review_work_verification(uuid, uuid, text, text)
to authenticated;
