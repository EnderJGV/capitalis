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


def day_in_month(year: int, month: int, day: int) -> date:
    """La fecha con ese día del mes o, si el mes es más corto (31 en febrero), su último día."""
    return date(year, month, min(day, calendar.monthrange(year, month)[1]))


def add_months(day: date, months: int) -> date:
    """La misma fecha `months` meses después (31/01 + 1 mes = 28/02 o 29/02)."""
    y, m = shift_month(day.year, day.month, months)
    return day_in_month(y, m, day.day)
