from dataclasses import dataclass
from math import asin, cos, radians, sin, sqrt

from app.models.reports import ReportStatus

ACTIVE_REPORT_STATUSES = frozenset(
    {
        ReportStatus.SUBMITTED,
        ReportStatus.APPROVED,
        ReportStatus.SCHEDULED,
        ReportStatus.IN_PROGRESS,
    }
)
DUPLICATE_RADIUS_METERS = 100.0
EARTH_RADIUS_METERS = 6_371_008.8


@dataclass(frozen=True)
class DuplicateComparableReport:
    category: str
    latitude: float
    longitude: float
    status: ReportStatus


def haversine_distance_meters(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    """Return spherical great-circle distance for deterministic unit checks."""
    lat_a, lon_a, lat_b, lon_b = map(
        radians, (latitude_a, longitude_a, latitude_b, longitude_b)
    )
    delta_lat = lat_b - lat_a
    delta_lon = lon_b - lon_a
    value = sin(delta_lat / 2) ** 2 + cos(lat_a) * cos(lat_b) * sin(delta_lon / 2) ** 2
    return 2 * EARTH_RADIUS_METERS * asin(sqrt(value))


def is_possible_duplicate(
    submitted: DuplicateComparableReport,
    existing: DuplicateComparableReport,
) -> bool:
    return (
        submitted.category == existing.category
        and existing.status in ACTIVE_REPORT_STATUSES
        and haversine_distance_meters(
            submitted.latitude,
            submitted.longitude,
            existing.latitude,
            existing.longitude,
        )
        <= DUPLICATE_RADIUS_METERS
    )
