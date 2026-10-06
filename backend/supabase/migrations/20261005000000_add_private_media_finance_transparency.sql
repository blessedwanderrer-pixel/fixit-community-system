-- Sanitized private media, manual donation verification, expense approval, and safe transparency data.

-- This migration is intentionally rerunnable. The first released version could
-- stop on installations that already had one or more donation media columns.
-- An explicit transaction ensures any future error rolls this whole run back.
begin;

alter table public.donations
  add column if not exists transaction_at timestamptz,
  add column if not exists screenshot_storage_bucket text,
  add column if not exists screenshot_storage_object_path text;

update public.donations
set transaction_at = created_at
where transaction_at is null;

alter table public.donations alter column transaction_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.donations'::regclass
      and conname = 'donation_screenshot_bucket'
  ) then
    alter table public.donations
      add constraint donation_screenshot_bucket
      check (screenshot_storage_bucket = 'donation-proofs');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.donations'::regclass
      and conname = 'donation_screenshot_path_unique'
  ) then
    alter table public.donations
      add constraint donation_screenshot_path_unique
      unique (screenshot_storage_object_path);
  end if;
end
$$;

drop policy if exists donations_insert_own_pending on public.donations;
create policy donations_insert_own_pending
on public.donations for insert to authenticated
with check (
  donor_id = (select auth.uid())
  and (select private.current_user_role()) = 'citizen'
  and status = 'Pending'
  and verified_by is null and verified_at is null
  and screenshot_storage_bucket = 'donation-proofs'
  and screenshot_storage_object_path is not null
);

drop policy if exists expenses_insert_coordinator_or_admin on public.expenses;
drop policy if exists expenses_insert_assigned_coordinator on public.expenses;
create policy expenses_insert_assigned_coordinator
on public.expenses for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and status = 'Pending' and approved_by is null and approved_at is null
  and (select private.current_user_role()) = 'coordinator'
  and exists (
    select 1 from public.work_records wr
    where wr.report_id = expenses.report_id
      and wr.coordinator_id = (select auth.uid())
  )
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.expenses'::regclass
      and conname = 'expense_receipt_path_unique'
  ) then
    alter table public.expenses
      add constraint expense_receipt_path_unique unique (receipt_storage_object_path);
  end if;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('donation-proofs', 'donation-proofs', false, 8388608,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('report-media', 'report-media', false, 8388608,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('expense-receipts', 'expense-receipts', false, 8388608,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists donation_proofs_select on storage.objects;
create policy donation_proofs_select
on storage.objects for select to authenticated
using (
  bucket_id = 'donation-proofs'
  and (owner_id = (select auth.uid()::text) or (select private.is_admin()))
);

drop policy if exists donation_proofs_insert on storage.objects;
create policy donation_proofs_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'donation-proofs'
  and owner_id = (select auth.uid()::text)
  and (select private.current_user_role()) = 'citizen'
);

create or replace function private.enforce_report_workflow()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status is not distinct from new.status then return new; end if;
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
      select 1 from public.report_media rm join storage.objects so
        on so.bucket_id = rm.storage_bucket and so.name = rm.storage_object_path
      where rm.report_id = new.id and rm.stage = 'before'
    ) and exists (
      select 1 from public.report_media rm join storage.objects so
        on so.bucket_id = rm.storage_bucket and so.name = rm.storage_object_path
      where rm.report_id = new.id and rm.stage = 'after'
    )
  ) then
    raise exception using errcode = 'P0001', message = 'MISSING_BEFORE_AFTER_EVIDENCE';
  end if;
  return new;
end;
$$;

create or replace function public.fixit_create_report_uploaded(
  p_report_id uuid,
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
  if not exists (select 1 from public.profiles where id = p_citizen_id and role = 'citizen') then
    raise exception using errcode = 'P0001', message = 'CITIZEN_REQUIRED';
  end if;
  if split_part(p_photo_reference, '/', 1) <> p_report_id::text
     or not exists (
       select 1 from storage.objects
       where bucket_id = 'report-media' and name = p_photo_reference
     ) then
    raise exception using errcode = 'P0001', message = 'SANITIZED_MEDIA_REQUIRED';
  end if;

  insert into public.problem_reports (
    id, created_by, description, category, latitude, longitude
  ) values (
    p_report_id, p_citizen_id, btrim(p_description), btrim(p_category), p_latitude, p_longitude
  ) returning * into created_report;

  insert into public.report_media (report_id, uploaded_by, stage, storage_object_path)
  values (created_report.id, p_citizen_id, 'report', p_photo_reference);

  insert into public.report_duplicate_candidates (report_id, candidate_report_id, distance_meters)
  select created_report.id, existing.id,
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
      'stage', 'report', 'storage_bucket', 'report-media',
      'storage_object_path', p_photo_reference
    ))
  );
end;
$$;

create or replace function public.fixit_add_work_evidence(
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
  if split_part(p_photo_reference, '/', 1) <> p_report_id::text
     or not exists (
       select 1 from storage.objects
       where bucket_id = 'report-media' and name = p_photo_reference
     ) then
    raise exception using errcode = 'P0001', message = 'SANITIZED_MEDIA_REQUIRED';
  end if;
  if not exists (
    select 1 from public.work_records
    where report_id = p_report_id and coordinator_id = p_coordinator_id
  ) then
    raise exception using errcode = 'P0001', message = 'REPORT_FORBIDDEN';
  end if;
  select status into current_status from public.problem_reports where id = p_report_id;
  if current_status not in ('Scheduled', 'In Progress') then
    raise exception using errcode = 'P0001', message = 'EVIDENCE_REQUIRES_ACTIVE_WORK';
  end if;
  insert into public.report_media (report_id, uploaded_by, stage, storage_object_path)
  values (p_report_id, p_coordinator_id, p_stage, p_photo_reference)
  returning * into created_media;
  return to_jsonb(created_media);
end;
$$;

create or replace function public.fixit_review_donation(
  p_donation_id uuid, p_admin_id uuid, p_status public.donation_status
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare reviewed public.donations;
begin
  if not exists (select 1 from public.profiles where id = p_admin_id and role = 'admin') then
    raise exception using errcode = 'P0001', message = 'ADMIN_REQUIRED';
  end if;
  if p_status not in ('Verified', 'Rejected') then
    raise exception using errcode = 'P0001', message = 'INVALID_DONATION_DECISION';
  end if;
  update public.donations set status = p_status, verified_by = p_admin_id, verified_at = now()
  where id = p_donation_id and status = 'Pending' returning * into reviewed;
  if not found then raise exception using errcode = 'P0001', message = 'DONATION_NOT_PENDING'; end if;
  return to_jsonb(reviewed);
end; $$;

create or replace function public.fixit_review_expense(
  p_expense_id uuid, p_admin_id uuid, p_status public.review_status
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare reviewed public.expenses;
begin
  if not exists (select 1 from public.profiles where id = p_admin_id and role = 'admin') then
    raise exception using errcode = 'P0001', message = 'ADMIN_REQUIRED';
  end if;
  if p_status not in ('Approved', 'Rejected') then
    raise exception using errcode = 'P0001', message = 'INVALID_EXPENSE_DECISION';
  end if;
  update public.expenses set status = p_status, approved_by = p_admin_id, approved_at = now()
  where id = p_expense_id and status = 'Pending' returning * into reviewed;
  if not found then raise exception using errcode = 'P0001', message = 'EXPENSE_NOT_PENDING'; end if;
  return to_jsonb(reviewed);
end; $$;

revoke all on function public.fixit_create_report_uploaded(uuid, uuid, text, text, double precision, double precision, text) from public, anon, authenticated;
revoke all on function public.fixit_review_donation(uuid, uuid, public.donation_status) from public, anon, authenticated;
revoke all on function public.fixit_review_expense(uuid, uuid, public.review_status) from public, anon, authenticated;
grant execute on function public.fixit_create_report_uploaded(uuid, uuid, text, text, double precision, double precision, text) to service_role;
grant execute on function public.fixit_review_donation(uuid, uuid, public.donation_status) to service_role;
grant execute on function public.fixit_review_expense(uuid, uuid, public.review_status) to service_role;

commit;
