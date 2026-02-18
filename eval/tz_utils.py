"""
Timezone utilities — All timestamps in Europe/Paris (CET/CEST)
==============================================================
Usage:
    from tz_utils import paris_now, paris_iso

    paris_now()   # datetime object in Paris TZ
    paris_iso()   # "2026-02-18T22:15:00+01:00"
"""
from datetime import datetime
from zoneinfo import ZoneInfo

PARIS_TZ = ZoneInfo("Europe/Paris")


def paris_now():
    """Return current datetime in Europe/Paris timezone."""
    return datetime.now(PARIS_TZ)


def paris_iso():
    """Return ISO 8601 timestamp in Europe/Paris, to the second.
    Example: 2026-02-18T22:15:00+01:00
    """
    return datetime.now(PARIS_TZ).isoformat(timespec='seconds')


def paris_strftime(fmt="%Y-%m-%dT%H-%M-%S"):
    """Return formatted Paris time string (for filenames etc.)."""
    return datetime.now(PARIS_TZ).strftime(fmt)
