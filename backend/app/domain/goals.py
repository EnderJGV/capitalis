"""Objetivos de ahorro: meses restantes, cuánto ahorrar por mes, ritmo, proyección y estado.

Funciones puras, sin base de datos. Los aportes son virtuales: no son movimientos ni cambian saldos.
"""

from datetime import date
from decimal import ROUND_CEILING, Decimal
from typing import Iterable

from .entities import Goal, GoalPace, GoalProgress, GoalStatus
from .periods import add_months

ZERO = Decimal("0.00")
CENT = Decimal("0.01")
#: Un ahorro de al menos este porcentaje de lo esperado cuenta como "un poco atrasado".
SLIGHTLY_BEHIND = Decimal("0.8")
#: Meses de aportes que se promedian para proyectar cuándo se cumple.
PROJECTION_MONTHS = 3


def months_left(today: date, target_date: date) -> int:
    """Meses que quedan hasta la fecha límite, contando el actual (mínimo 1)."""
    return max(1, (target_date.year - today.year) * 12 + (target_date.month - today.month) + 1)


def monthly_needed(remaining: Decimal, months: int) -> Decimal:
    """Lo que hay que aportar por mes, redondeado hacia arriba al centavo."""
    if remaining <= 0:
        return ZERO
    return (remaining / max(1, months)).quantize(CENT, rounding=ROUND_CEILING)


def expected_saved(target: Decimal, created: date, target_date: date, today: date) -> Decimal:
    """Lo que debería llevarse ahorrado hoy si se ahorrara en línea recta hasta la fecha límite."""
    total = (target_date - created).days
    if total <= 0 or today >= target_date:
        return target
    elapsed = max(0, (today - created).days)
    return (target * elapsed / total).quantize(CENT)


def pace(saved: Decimal, target: Decimal, created: date, target_date: date | None, today: date) -> GoalPace | None:
    """Ritmo frente a la fecha límite; None si el objetivo no tiene fecha."""
    if target_date is None:
        return None
    if saved < target and today > target_date:
        return "overdue"
    expected = expected_saved(target, created, target_date, today)
    if expected <= 0 or saved >= expected:
        return "on_track"
    return "slightly_behind" if saved / expected >= SLIGHTLY_BEHIND else "behind"


def projected_date(contributions: Iterable[tuple[date, Decimal]], remaining: Decimal, today: date) -> date | None:
    """Fecha estimada en que se cumple, con el promedio mensual de los últimos 3 meses de aportes netos."""
    if remaining <= 0:
        return today
    since = add_months(today, -PROJECTION_MONTHS)
    net = sum((amount for day, amount in contributions if since < day <= today), ZERO)
    average = net / PROJECTION_MONTHS
    if average <= 0:
        return None
    months = int((remaining / average).to_integral_value(rounding=ROUND_CEILING))
    return add_months(today, months)


def next_status(status: GoalStatus, saved: Decimal, target: Decimal) -> GoalStatus:
    """Activo → cumplido al llegar a la meta; cumplido → activo si un retiro o una meta mayor lo deja corto."""
    if status == "active" and saved >= target:
        return "completed"
    if status == "completed" and saved < target:
        return "active"
    return status


def build_progress(goal: Goal, contributions: list[tuple[date, Decimal]], today: date) -> GoalProgress:
    saved = sum((amount for _, amount in contributions), ZERO)
    remaining = max(goal.target_amount - saved, ZERO)
    percent = int(min(saved / goal.target_amount, Decimal(1)) * 100) if saved > 0 else 0
    open_goal = goal.status in ("active", "completed")
    months = months_left(today, goal.target_date) if goal.target_date and open_goal else None
    return GoalProgress(
        goal=goal,
        saved=saved,
        remaining=remaining,
        over=max(saved - goal.target_amount, ZERO),
        percent=percent,
        months_left=months,
        monthly_needed=monthly_needed(remaining, months) if months and goal.status == "active" else None,
        pace=pace(saved, goal.target_amount, goal.created_on, goal.target_date, today) if goal.status == "active" else None,
        projected_date=projected_date(contributions, remaining, today) if goal.status == "active" else None,
    )
