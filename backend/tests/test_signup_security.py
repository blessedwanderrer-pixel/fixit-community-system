from pathlib import Path


MIGRATION = Path(__file__).parents[1] / "supabase" / "migrations" / "20261004000000_create_fixit_foundation.sql"


def _foundation_sql() -> str:
    return MIGRATION.read_text(encoding="utf-8").lower()


def test_new_auth_users_receive_exactly_one_citizen_profile() -> None:
    sql = _foundation_sql()
    assert "after insert on auth.users" in sql
    assert "for each row execute function private.handle_new_auth_user()" in sql
    assert "insert into public.profiles (id, role) values (new.id, 'citizen')" in sql
    assert "id uuid primary key references auth.users (id) on delete cascade" in sql


def test_profile_role_cannot_be_assigned_by_public_signup_metadata() -> None:
    function_sql = _foundation_sql().split("create function private.handle_new_auth_user()", 1)[1].split("$$;", 1)[0]
    assert "raw_user_meta_data" not in function_sql
    assert "raw_app_meta_data" not in function_sql
    assert "new.role" not in function_sql
    assert "'citizen'" in function_sql


def test_clients_cannot_insert_or_update_profiles() -> None:
    sql = _foundation_sql()
    assert "grant select on public.profiles to authenticated" in sql
    assert "grant select, insert on public.profiles to authenticated" not in sql
    assert "grant select, update on public.profiles to authenticated" not in sql
    assert "profiles_select_own_or_admin" in sql
