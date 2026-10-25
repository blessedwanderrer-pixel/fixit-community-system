-- Claim-once email reminders for work scheduled within the next three hours.

begin;

alter table public.work_records
  add column if not exists reminder_claimed_at timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists reminder_attempts integer not null default 0,
  add column if not exists reminder_last_error text;

create index if not exists work_records_due_reminder_idx
on public.work_records (scheduled_for)
where scheduled_for is not null and reminder_sent_at is null;

create or replace function private.reset_work_reminder_on_reschedule()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.scheduled_for is distinct from new.scheduled_for then
    new.reminder_claimed_at := null;
    new.reminder_sent_at := null;
    new.reminder_attempts := 0;
    new.reminder_last_error := null;
  end if;
  return new;
end;
$$;

drop trigger if exists reset_work_reminder_on_reschedule on public.work_records;
create trigger reset_work_reminder_on_reschedule
before update of scheduled_for on public.work_records
for each row execute function private.reset_work_reminder_on_reschedule();

create or replace function public.fixit_claim_due_work_reminders(p_limit integer default 25)
returns table (
  work_record_id uuid,
  report_id uuid,
  tracking_id text,
  category text,
  scheduled_for timestamptz,
  coordinator_email text,
  work_details text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception using errcode = 'P0001', message = 'INVALID_REMINDER_LIMIT';
  end if;

  return query
  with due as (
    select wr.id
    from public.work_records wr
    join public.problem_reports pr on pr.id = wr.report_id
    where pr.status = 'Scheduled'
      and wr.scheduled_for > now()
      and wr.scheduled_for <= now() + interval '3 hours'
      and wr.reminder_sent_at is null
      and (
        wr.reminder_claimed_at is null
        or wr.reminder_claimed_at < now() - interval '15 minutes'
      )
    order by wr.scheduled_for asc
    for update of wr skip locked
    limit p_limit
  ), claimed as (
    update public.work_records wr
    set reminder_claimed_at = now(),
        reminder_attempts = wr.reminder_attempts + 1,
        reminder_last_error = null
    from due
    where wr.id = due.id
    returning wr.id
  )
  select
    wr.id,
    wr.report_id,
    pr.tracking_id,
    pr.category::text,
    wr.scheduled_for,
    au.email::text,
    wr.notes
  from claimed c
  join public.work_records wr on wr.id = c.id
  join public.problem_reports pr on pr.id = wr.report_id
  join auth.users au on au.id = wr.coordinator_id
  where au.email is not null;
end;
$$;

revoke all on function public.fixit_claim_due_work_reminders(integer)
from public, anon, authenticated;
grant execute on function public.fixit_claim_due_work_reminders(integer)
to service_role;

create or replace function public.fixit_finish_work_reminder(
  p_work_record_id uuid,
  p_succeeded boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.work_records
  set reminder_sent_at = case when p_succeeded then now() else reminder_sent_at end,
      reminder_claimed_at = case when p_succeeded then reminder_claimed_at else null end,
      reminder_last_error = case when p_succeeded then null else left(coalesce(p_error, 'EMAIL_SEND_FAILED'), 500) end
  where id = p_work_record_id
    and reminder_sent_at is null;
end;
$$;

revoke all on function public.fixit_finish_work_reminder(uuid, boolean, text)
from public, anon, authenticated;
grant execute on function public.fixit_finish_work_reminder(uuid, boolean, text)
to service_role;

commit;
