from datetime import date
from decimal import Decimal

from ..domain.entities import (
    AccountBalance,
    CategoryTotal,
    CurrencyAmount,
    GoalsOverview,
    MonthTotal,
    Summary,
    User,
)
from ..domain.goals import build_progress
from ..domain.periods import current_month, month_range, shift_month
from .cards import card_overview
from .ports import UnitOfWorkFactory
from .rates import CurrencyConverter

ZERO = Decimal("0.00")
HISTORY_MONTHS = 6


class _Totals:
    """Acumula montos en la moneda principal y recuerda qué monedas no se pudieron convertir."""

    def __init__(self, converter: CurrencyConverter, main: str):
        self._converter = converter
        self.main = main
        self.approximate = False
        self.missing: set[str] = set()

    def convert(self, amount: Decimal, currency: str, on: date) -> Decimal:
        if currency == self.main:
            return amount
        converted = self._converter.convert(amount, currency, self.main, on)
        if converted is None:
            self.missing.add(currency)
            return ZERO
        self.approximate = True
        return converted

    def sum(self, amounts: list[CurrencyAmount], on: date) -> tuple[Decimal, Decimal]:
        income = sum((self.convert(a.income, a.currency, on) for a in amounts), ZERO)
        expense = sum((self.convert(a.expense, a.currency, on) for a in amounts), ZERO)
        return income, expense


class GetSummary:
    """Resumen del mes en la moneda principal del usuario.

    Los montos de cuentas en otras monedas se convierten con la cotización del fin de cada mes (o de
    hoy, si el mes no terminó); el saldo total suma el saldo actual de cada cuenta convertido con la
    cotización de hoy.
    """

    def __init__(self, uow_factory: UnitOfWorkFactory, converter: CurrencyConverter):
        self._uow_factory = uow_factory
        self._converter = converter

    def execute(self, user: User, month: str | None = None) -> Summary:
        month = month or current_month()
        start, end = month_range(month)
        today = date.today()
        first_year, first_month = shift_month(start.year, start.month, -(HISTORY_MONTHS - 1))

        with self._uow_factory() as uow:
            totals = uow.reports.totals(user.id, start, end)
            by_category = uow.reports.expenses_by_category(user.id, start, end)
            monthly = uow.reports.monthly_totals(user.id, date(first_year, first_month, 1), end)
            accounts = uow.accounts.list(user.id, include_archived=True)
            cards = [card_overview(uow, user.id, a, today) for a in accounts if a.is_card and not a.archived]
            goal_items = [
                build_progress(g, [(c.date, c.amount) for c in uow.goal_contributions.list(g.id)], today)
                for g in uow.goals.list(user.id)
                if g.status in ("active", "completed")
            ]

        t = _Totals(self._converter, user.currency)
        income, expense = t.sum(totals, min(end, today))

        merged: dict[int | None, CategoryTotal] = {}
        for currency, category in by_category:
            amount = t.convert(category.total, currency, min(end, today))
            previous = merged.get(category.category_id)
            merged[category.category_id] = CategoryTotal(
                category_id=category.category_id,
                name=category.name,
                color=category.color,
                icon=category.icon,
                total=(previous.total if previous else ZERO) + amount,
            )
        expenses_by_category = sorted(
            (c for c in merged.values() if c.total > 0), key=lambda c: c.total, reverse=True
        )

        last_months = []
        for offset in range(-(HISTORY_MONTHS - 1), 1):
            y, m = shift_month(start.year, start.month, offset)
            key = f"{y:04d}-{m:02d}"
            _, month_end = month_range(key)
            m_income, m_expense = t.sum(monthly.get(key, []), min(month_end, today))
            last_months.append(MonthTotal(month=key, income=m_income, expense=m_expense))

        balances = []
        total_balance = ZERO
        for account in accounts:
            balance = account.balance or ZERO
            converted = t.convert(balance, account.currency, today)
            if account.currency not in t.missing:
                total_balance += converted
            if not account.archived:
                balances.append(AccountBalance(account, None if account.currency in t.missing else converted))

        # Lo ahorrado en objetivos sigue en las cuentas: se reserva, no se resta del patrimonio.
        reserved = ZERO
        for item in goal_items:
            amount = t.convert(item.saved, item.goal.currency, today)
            if item.goal.currency not in t.missing:
                reserved += amount
        active = sorted(
            (i for i in goal_items if i.goal.status == "active"),
            key=lambda i: (i.goal.target_date is None, i.goal.target_date or today, -i.percent),
        )

        return Summary(
            month=month,
            income=income,
            expense=expense,
            balance=income - expense,
            total_balance=total_balance,
            expenses_by_category=expenses_by_category,
            last_months=last_months,
            currency=user.currency,
            approximate=t.approximate,
            missing_currencies=sorted(t.missing),
            accounts=balances,
            cards=cards,
            goals=GoalsOverview(reserved=reserved, free=total_balance - reserved, active_count=len(active), top=active[:3]),
        )
