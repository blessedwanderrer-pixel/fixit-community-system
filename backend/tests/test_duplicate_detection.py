from app.core.duplicate_detection import (
    ACTIVE_REPORT_STATUSES,
    DuplicateComparableReport,
    is_possible_duplicate,
)
from app.models.reports import ReportStatus


def comparable(
    *,
    category: str = "Road",
    latitude: float = 31.5204,
    longitude: float = 74.3587,
    status: ReportStatus = ReportStatus.SUBMITTED,
) -> DuplicateComparableReport:
    return DuplicateComparableReport(
        category=category,
        latitude=latitude,
        longitude=longitude,
        status=status,
    )


def test_active_report_statuses_are_exact_project_requirement() -> None:
    assert ACTIVE_REPORT_STATUSES == {
        ReportStatus.SUBMITTED,
        ReportStatus.APPROVED,
        ReportStatus.SCHEDULED,
        ReportStatus.IN_PROGRESS,
    }


def test_same_category_within_100_meters_is_possible_duplicate() -> None:
    submitted = comparable()
    existing = comparable(latitude=31.5204 + 0.0008)

    assert is_possible_duplicate(submitted, existing) is True


def test_same_category_over_100_meters_is_not_duplicate() -> None:
    submitted = comparable()
    existing = comparable(latitude=31.5204 + 0.001)

    assert is_possible_duplicate(submitted, existing) is False


def test_different_category_within_100_meters_is_not_duplicate() -> None:
    submitted = comparable(category="Road")
    existing = comparable(category="Water", latitude=31.5204 + 0.0001)

    assert is_possible_duplicate(submitted, existing) is False


def test_inactive_reports_are_not_duplicate_candidates() -> None:
    submitted = comparable()

    for status in {
        ReportStatus.REJECTED,
        ReportStatus.SOLVED,
        ReportStatus.CANCELLED,
    }:
        assert is_possible_duplicate(submitted, comparable(status=status)) is False


def test_database_migration_uses_postgis_100_meter_filter() -> None:
    migration = (
        __import__("pathlib").Path(__file__).parents[1]
        / "supabase"
        / "migrations"
        / "20261004020000_add_duplicate_detection_and_ai_review.sql"
    ).read_text(encoding="utf-8")

    assert "extensions.st_dwithin(created_report.location, existing.location, 100)" in migration
    assert "existing.status in ('Submitted', 'Approved', 'Scheduled', 'In Progress')" in migration
    assert "existing.category = created_report.category" in migration
