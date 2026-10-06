-- FixIt Community System: initial Supabase schema, grants, and RLS foundation.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum ('citizen', 'admin', 'coordinator');
create type public.report_status as enum (
  'Submitted',
  'Approved',
  'Rejected',
  'Scheduled',
  'In Progress',
  'Solved',
  'Cancelled'
);
create type public.review_status as enum ('Pending', 'Approved', 'Rejected');
create type public.donation_status as enum ('Pending', 'Verified', 'Rejected');
create type public.media_stage as enum ('report', 'before', 'after');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'citizen',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.problem_reports (
  id uuid primary key default gen_random_uuid(),
  tracking_id text not null unique default (
    'FIX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  ),
  created_by uuid references public.profiles (id) on delete set null,
  description text not null check (length(btrim(description)) > 0),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status public.report_status not null default 'Submitted',
  status_changed_by uuid references public.profiles (id) on delete set null,
  status_changed_at timestamptz not null default now(),
  merged_into_report_id uuid references public.problem_reports (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint problem_reports_not_merged_into_self
    check (merged_into_report_id is null or merged_into_report_id <> id)
);

create table public.report_reporters (
  report_id uuid not null references public.problem_reports (id) on delete cascade,
  citizen_id uuid not null references public.profiles (id) on delete cascade,
  source_report_id uuid references public.problem_reports (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (report_id, citizen_id)
);

create table public.ai_triage_results (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.problem_reports (id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.work_records (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.problem_reports (id) on delete cascade,
  coordinator_id uuid not null references public.profiles (id) on delete restrict,
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_record_time_order check (
    (started_at is null or scheduled_for is null or started_at >= scheduled_for)
    and (completed_at is null or started_at is null or completed_at >= started_at)
  )
);

create table public.report_media (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.problem_reports (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  stage public.media_stage not null,
  storage_bucket text not null default 'report-media',
  storage_object_path text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_media_bucket check (storage_bucket = 'report-media'),
  constraint report_media_path_belongs_to_report check (
    split_part(storage_object_path, '/', 1) = report_id::text
  )
);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references public.profiles (id) on delete set null,
  transaction_id text not null unique,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status public.donation_status not null default 'Pending',
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint donation_review_fields check (
    (status = 'Pending' and verified_by is null and verified_at is null)
    or (status in ('Verified', 'Rejected') and verified_by is not null and verified_at is not null)
  )
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.problem_reports (id) on delete restrict,
  submitted_by uuid not null references public.profiles (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  description text not null check (length(btrim(description)) > 0),
  receipt_storage_bucket text not null default 'expense-receipts',
  receipt_storage_object_path text not null,
  status public.review_status not null default 'Pending',
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_review_fields check (
    (status = 'Pending' and approved_by is null and approved_at is null)
    or (status in ('Approved', 'Rejected') and approved_by is not null and approved_at is not null)
  )
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  body text not null check (length(btrim(body)) > 0),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (length(btrim(action)) > 0),
  entity_table text not null check (length(btrim(entity_table)) > 0),
  entity_id text not null check (length(btrim(entity_id)) > 0),
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index problem_reports_created_by_idx on public.problem_reports (created_by);
create index problem_reports_status_idx on public.problem_reports (status);
create index problem_reports_location_idx on public.problem_reports (latitude, longitude);
create index problem_reports_merged_into_idx on public.problem_reports (merged_into_report_id);
create index report_reporters_citizen_idx on public.report_reporters (citizen_id);
create index ai_triage_results_report_idx on public.ai_triage_results (report_id);
create index work_records_report_idx on public.work_records (report_id);
create index work_records_coordinator_idx on public.work_records (coordinator_id);
create index report_media_report_stage_idx on public.report_media (report_id, stage);
create index donations_donor_idx on public.donations (donor_id);
create index donations_status_idx on public.donations (status);
create index expenses_report_idx on public.expenses (report_id);
create index expenses_submitted_by_idx on public.expenses (submitted_by);
create index expenses_status_idx on public.expenses (status);
create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);
create index audit_events_entity_idx on public.audit_events (entity_table, entity_id);

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'citizen');
  return new;
end;
$$;

create function private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid())
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.current_user_role()) = 'admin', false)
$$;

create function private.is_assigned_coordinator(target_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.current_user_role()) = 'coordinator', false)
    and exists (
      select 1
      from public.work_records as wr
      where wr.report_id = target_report_id
        and wr.coordinator_id = (select auth.uid())
    )
$$;

create function private.can_read_report(target_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_admin())
    or exists (
      select 1
      from public.problem_reports as pr
      where pr.id = target_report_id
        and pr.created_by = (select auth.uid())
    )
    or exists (
      select 1
      from public.report_reporters as rr
      where rr.report_id = target_report_id
        and rr.citizen_id = (select auth.uid())
    )
    or (select private.is_assigned_coordinator(target_report_id))
$$;

create function private.preserve_merged_reporters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.merged_into_report_id is not null
     and new.merged_into_report_id is distinct from old.merged_into_report_id then
    insert into public.report_reporters (report_id, citizen_id, source_report_id)
    select new.merged_into_report_id, rr.citizen_id, new.id
    from public.report_reporters as rr
    where rr.report_id = new.id
    on conflict (report_id, citizen_id) do nothing;

    if new.created_by is not null then
      insert into public.report_reporters (report_id, citizen_id, source_report_id)
      values (new.merged_into_report_id, new.created_by, new.id)
      on conflict (report_id, citizen_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create function private.add_initial_reporter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.report_reporters (report_id, citizen_id, source_report_id)
    values (new.id, new.created_by, new.id)
    on conflict (report_id, citizen_id) do nothing;
  end if;
  return new;
end;
$$;

create function private.report_id_from_storage_path(object_name text)
returns uuid
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  return split_part(object_name, '/', 1)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_assigned_coordinator(uuid) to authenticated;
grant execute on function private.can_read_report(uuid) to authenticated;
grant execute on function private.report_id_from_storage_path(text) to authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create trigger add_initial_reporter_after_report_insert
after insert on public.problem_reports
for each row execute function private.add_initial_reporter();

create trigger preserve_reporters_after_merge
after update of merged_into_report_id on public.problem_reports
for each row execute function private.preserve_merged_reporters();

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger problem_reports_set_updated_at before update on public.problem_reports
for each row execute function private.set_updated_at();
create trigger ai_triage_results_set_updated_at before update on public.ai_triage_results
for each row execute function private.set_updated_at();
create trigger work_records_set_updated_at before update on public.work_records
for each row execute function private.set_updated_at();
create trigger report_media_set_updated_at before update on public.report_media
for each row execute function private.set_updated_at();
create trigger donations_set_updated_at before update on public.donations
for each row execute function private.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses
for each row execute function private.set_updated_at();
create trigger notifications_set_updated_at before update on public.notifications
for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.problem_reports enable row level security;
alter table public.report_reporters enable row level security;
alter table public.ai_triage_results enable row level security;
alter table public.work_records enable row level security;
alter table public.report_media enable row level security;
alter table public.donations enable row level security;
alter table public.expenses enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_events enable row level security;

revoke all on table
  public.profiles,
  public.problem_reports,
  public.report_reporters,
  public.ai_triage_results,
  public.work_records,
  public.report_media,
  public.donations,
  public.expenses,
  public.notifications,
  public.audit_events
from anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.problem_reports to authenticated;
grant select, insert on public.report_reporters to authenticated;
grant select on public.ai_triage_results to authenticated;
grant select, insert on public.work_records to authenticated;
grant update (scheduled_for, started_at, completed_at, notes) on public.work_records to authenticated;
grant select, insert on public.report_media to authenticated;
grant select, insert, update on public.donations to authenticated;
grant select, insert, update on public.expenses to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select on public.audit_events to authenticated;
grant all on table
  public.profiles,
  public.problem_reports,
  public.report_reporters,
  public.ai_triage_results,
  public.work_records,
  public.report_media,
  public.donations,
  public.expenses,
  public.notifications,
  public.audit_events
to service_role;
grant usage, select on sequence public.audit_events_id_seq to service_role;

create policy profiles_select_own_or_admin
on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));

create policy reports_select_authorized
on public.problem_reports for select to authenticated
using ((select private.can_read_report(id)));

create policy reports_insert_citizen_or_admin
on public.problem_reports for insert to authenticated
with check (
  (select auth.uid()) = created_by
  and (select private.current_user_role()) in ('citizen', 'admin')
  and status = 'Submitted'
  and merged_into_report_id is null
);

create policy reports_update_admin_only
on public.problem_reports for update to authenticated
using ((select private.is_admin()))
with check (
  (select private.is_admin())
  and (status = 'Submitted' or status_changed_by = (select auth.uid()))
);

create policy report_reporters_select_authorized
on public.report_reporters for select to authenticated
using (
  citizen_id = (select auth.uid())
  or (select private.can_read_report(report_id))
);

create policy report_reporters_insert_admin_only
on public.report_reporters for insert to authenticated
with check ((select private.is_admin()));

create policy ai_triage_select_staff
on public.ai_triage_results for select to authenticated
using (
  (select private.is_admin())
  or (select private.is_assigned_coordinator(report_id))
);

create policy work_records_select_authorized
on public.work_records for select to authenticated
using ((select private.can_read_report(report_id)));

create policy work_records_insert_admin_only
on public.work_records for insert to authenticated
with check (
  (select private.is_admin())
  and (select role from public.profiles where id = coordinator_id) = 'coordinator'
);

create policy work_records_update_assignee_or_admin
on public.work_records for update to authenticated
using (coordinator_id = (select auth.uid()) or (select private.is_admin()))
with check (coordinator_id = (select auth.uid()) or (select private.is_admin()));

create policy report_media_select_authorized
on public.report_media for select to authenticated
using ((select private.can_read_report(report_id)));

create policy report_media_insert_authorized
on public.report_media for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and (
    (stage = 'report' and (select private.current_user_role()) = 'citizen'
      and (select private.can_read_report(report_id)))
    or (stage in ('before', 'after')
      and (select private.is_assigned_coordinator(report_id)))
    or (select private.is_admin())
  )
);

create policy donations_select_own_or_admin
on public.donations for select to authenticated
using (donor_id = (select auth.uid()) or (select private.is_admin()));

create policy donations_insert_own_pending
on public.donations for insert to authenticated
with check (
  donor_id = (select auth.uid())
  and status = 'Pending'
  and verified_by is null
  and verified_at is null
);

create policy donations_update_admin_only
on public.donations for update to authenticated
using ((select private.is_admin()))
with check (
  (select private.is_admin())
  and (status = 'Pending' or verified_by = (select auth.uid()))
);

create policy expenses_select_submitter_or_admin
on public.expenses for select to authenticated
using (submitted_by = (select auth.uid()) or (select private.is_admin()));

create policy expenses_insert_coordinator_or_admin
on public.expenses for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and status = 'Pending'
  and approved_by is null
  and approved_at is null
  and (select private.current_user_role()) in ('coordinator', 'admin')
);

create policy expenses_update_admin_only
on public.expenses for update to authenticated
using ((select private.is_admin()))
with check (
  (select private.is_admin())
  and (status = 'Pending' or approved_by = (select auth.uid()))
);

create policy notifications_select_own
on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));

create policy notifications_mark_own_read
on public.notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

create policy audit_events_select_admin_only
on public.audit_events for select to authenticated
using ((select private.is_admin()));

insert into storage.buckets (id, name, public)
values ('report-media', 'report-media', false), ('expense-receipts', 'expense-receipts', false)
on conflict (id) do update set public = false;

create policy report_media_objects_select
on storage.objects for select to authenticated
using (
  bucket_id = 'report-media'
  and (select private.can_read_report(private.report_id_from_storage_path(name)))
);

create policy report_media_objects_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'report-media'
  and owner_id = (select auth.uid()::text)
  and (select private.can_read_report(private.report_id_from_storage_path(name)))
);

create policy expense_receipts_select
on storage.objects for select to authenticated
using (
  bucket_id = 'expense-receipts'
  and (
    owner_id = (select auth.uid()::text)
    or (select private.is_admin())
  )
);

create policy expense_receipts_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'expense-receipts'
  and owner_id = (select auth.uid()::text)
  and (select private.current_user_role()) in ('coordinator', 'admin')
);
