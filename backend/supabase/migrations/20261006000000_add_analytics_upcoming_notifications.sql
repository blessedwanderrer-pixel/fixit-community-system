-- Admin analytics, safe public upcoming work, and in-app status notifications.
-- SMS/Phone OTP remains intentionally out of scope.

begin;

create index if not exists work_records_upcoming_schedule_idx
on public.work_records (scheduled_for, report_id)
where scheduled_for is not null;

create or replace function public.fixit_admin_analytics(
  p_admin_id uuid,
  p_currency text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  result jsonb;
  normalized_currency text := upper(btrim(p_currency));
begin
  if not exists (
    select 1 from public.profiles
    where id = p_admin_id and role = 'admin'
  ) then
    raise exception using errcode = 'P0001', message = 'ADMIN_REQUIRED';
  end if;
  if normalized_currency !~ '^[A-Z]{3}$' then
    raise exception using errcode = 'P0001', message = 'INVALID_CURRENCY';
  end if;

  select jsonb_build_object(
    'problems', jsonb_build_object(
      'total_reports', count(*),
      'awaiting_review_submitted', count(*) filter (where status = 'Submitted'),
      'approved', count(*) filter (where status = 'Approved'),
      'scheduled', count(*) filter (where status = 'Scheduled'),
      'in_progress', count(*) filter (where status = 'In Progress'),
      'solved', count(*) filter (where status = 'Solved'),
      'duplicate_merged', count(*) filter (where merged_into_report_id is not null)
    )
  ) into result
  from public.problem_reports;

  return result || jsonb_build_object(
    'financial', jsonb_build_object(
      'currency', normalized_currency,
      'total_verified_donations', (
        select count(*) from public.donations
        where status = 'Verified' and currency = normalized_currency
      ),
      'total_verified_donation_amount', (
        select coalesce(sum(amount), 0) from public.donations
        where status = 'Verified' and currency = normalized_currency
      ),
      'pending_donation_verification', (
        select count(*) from public.donations
        where status = 'Pending' and currency = normalized_currency
      ),
      'total_approved_spending', (
        select coalesce(sum(amount), 0) from public.expenses
        where status = 'Approved' and currency = normalized_currency
      )
    )
  );
end;
$$;

revoke all on function public.fixit_admin_analytics(uuid, text)
from public, anon, authenticated;
grant execute on function public.fixit_admin_analytics(uuid, text)
to service_role;

create or replace function private.notify_report_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status
     and new.status in ('Approved', 'Rejected', 'Scheduled', 'In Progress', 'Solved') then
    insert into public.notifications (recipient_id, title, body, payload)
    select
      rr.citizen_id,
      'Report status updated',
      'Report ' || new.tracking_id || ' is now ' || new.status || '.',
      jsonb_build_object(
        'report_id', new.id,
        'tracking_id', new.tracking_id,
        'status', new.status
      )
    from public.report_reporters as rr
    where rr.report_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.notify_report_status_change()
from public, anon, authenticated, service_role;

drop trigger if exists notify_report_status_change_after_update
on public.problem_reports;
create trigger notify_report_status_change_after_update
after update of status on public.problem_reports
for each row execute function private.notify_report_status_change();

commit;
