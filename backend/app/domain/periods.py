import calendar
import re
from datetime import date

from .exceptions import InvalidMonth

_MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def current_month() -> str:
    return date.today().strftime("%Y-%m")


def month_range(month: str) -> tuple[date, date]:
    if not _MONTH_RE.match(month):
        raise InvalidMonth()
    y, m = int(month[:4]), int(month[5:])
    return date(y, m, 1), date(y, m, calendar.monthrange(y, m)[1])


def shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    idx = year * 12 + (month - 1) + delta
    return idx // 12, idx % 12 + 1
