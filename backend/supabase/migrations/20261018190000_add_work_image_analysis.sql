-- Store advisory AI comparison of private before/after evidence for Admin review.
alter table public.work_records
  add column image_analysis jsonb;

drop function if exists public.fixit_submit_work_verification(uuid, uuid, text, text);

create function public.fixit_submit_work_verification(
  p_report_id uuid,
  p_coordinator_id uuid,
  p_public_summary text,
  p_work_details text default null,
  p_image_analysis jsonb default null
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
  if not exists (select 1 from public.problem_reports where id = p_report_id and status = 'In Progress') then
    raise exception using errcode = 'P0001', message = 'VERIFICATION_REQUIRES_IN_PROGRESS';
  end if;
  if not exists (
    select 1 from public.report_media rm join storage.objects so
      on so.bucket_id = rm.storage_bucket and so.name = rm.storage_object_path
    where rm.report_id = p_report_id and rm.stage = 'before' and rm.storage_bucket = 'report-media'
      and rm.storage_object_path like p_report_id::text || '/%'
  ) or not exists (
    select 1 from public.report_media rm join storage.objects so
      on so.bucket_id = rm.storage_bucket and so.name = rm.storage_object_path
    where rm.report_id = p_report_id and rm.stage = 'after' and rm.storage_bucket = 'report-media'
      and rm.storage_object_path like p_report_id::text || '/%'
  ) then
    raise exception using errcode = 'P0001', message = 'MISSING_BEFORE_AFTER_EVIDENCE';
  end if;

  update public.work_records
  set verification_status = 'Pending', verification_reason = null,
      public_summary = btrim(p_public_summary), image_analysis = p_image_analysis,
      submitted_for_verification_at = now(), verified_by = null, verified_at = null,
      completed_at = null, notes = coalesce(nullif(btrim(p_work_details), ''), notes), updated_at = now()
  where report_id = p_report_id and coordinator_id = p_coordinator_id
  returning * into target_work;
  if not found then raise exception using errcode = 'P0001', message = 'REPORT_FORBIDDEN'; end if;
  return to_jsonb(target_work);
end;
$$;

revoke all on function public.fixit_submit_work_verification(uuid, uuid, text, text, jsonb)
from public, anon, authenticated;
grant execute on function public.fixit_submit_work_verification(uuid, uuid, text, text, jsonb)
to authenticated;
