from pathlib import Path


MIGRATION = (
    Path(__file__).parents[1]
    / "supabase"
    / "migrations"
    / "20261006010000_enforce_solved_evidence.sql"
)


def test_solved_evidence_migration_checks_exact_report_storage_objects() -> None:
    sql = MIGRATION.read_text(encoding="utf-8").lower()

    assert "create or replace function public.fixit_advance_report" in sql
    assert "create or replace function private.enforce_report_workflow" in sql
    assert sql.count("join storage.objects") == 4
    assert sql.count("rm.stage = 'before'") == 2
    assert sql.count("rm.stage = 'after'") == 2
    assert "rm.report_id = p_report_id" in sql
    assert "rm.report_id = new.id" in sql
    assert "split_part(rm.storage_object_path, '/', 1) = p_report_id::text" in sql
    assert "split_part(rm.storage_object_path, '/', 1) = new.id::text" in sql
    assert "message = 'missing_before_after_evidence'" in sql


def test_solved_evidence_transition_function_remains_service_only() -> None:
    sql = MIGRATION.read_text(encoding="utf-8").lower()

    assert "from public, anon, authenticated" in sql
    assert "to service_role" in sql
