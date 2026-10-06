from pathlib import Path


MIGRATION = (
    Path(__file__).parents[1]
    / "supabase"
    / "migrations"
    / "20261005000000_add_private_media_finance_transparency.sql"
)


def test_finance_migration_is_rerunnable_after_partial_execution() -> None:
    sql = MIGRATION.read_text(encoding="utf-8").lower()
    assert "begin;" in sql and sql.rstrip().endswith("commit;")
    assert "add column if not exists transaction_at" in sql
    assert "add column if not exists screenshot_storage_bucket" in sql
    assert "add column if not exists screenshot_storage_object_path" in sql
    assert "drop policy if exists donations_insert_own_pending" in sql
    assert "drop policy if exists expenses_insert_assigned_coordinator" in sql
    assert "drop policy if exists donation_proofs_select" in sql
    assert "drop policy if exists donation_proofs_insert" in sql
    assert sql.count("create or replace function") == 5
    assert "on conflict (id) do update" in sql


def test_finance_migration_guards_named_constraints() -> None:
    sql = MIGRATION.read_text(encoding="utf-8").lower()
    for constraint in (
        "donation_screenshot_bucket",
        "donation_screenshot_path_unique",
        "expense_receipt_path_unique",
    ):
        assert f"conname = '{constraint}'" in sql
