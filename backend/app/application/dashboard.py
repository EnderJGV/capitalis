from datetime import date
from decimal import Decimal

from ..domain.entities import MonthTotal, Summary
from ..domain.periods import current_month, month_range, shift_month
from .ports import UnitOfWorkFactory

ZERO = Decimal("0.00")
HISTORY_MONTHS = 6


class GetSummary:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, month: str | None = None) -> Summary:
        month = month or current_month()
        start, end = month_range(month)
        first_year, first_month = shift_month(start.year, start.month, -(HISTORY_MONTHS - 1))

        with self._uow_factory() as uow:
            income, expense = uow.reports.totals(user_id, start, end)
            all_income, all_expense = uow.reports.totals(user_id)
            by_category = uow.reports.expenses_by_category(user_id, start, end)
            monthly = uow.reports.monthly_totals(user_id, date(first_year, first_month, 1), end)

        last_months = []
        for offset in range(-(HISTORY_MONTHS - 1), 1):
            y, m = shift_month(start.year, start.month, offset)
            key = f"{y:04d}-{m:02d}"
            m_income, m_expense = monthly.get(key, (ZERO, ZERO))
            last_months.append(MonthTotal(month=key, income=m_income, expense=m_expense))

        return Summary(
            month=month,
            income=income,
            expense=expense,
            balance=income - expense,
            total_balance=all_income - all_expense,
            expenses_by_category=by_category,
            last_months=last_months,
        )
