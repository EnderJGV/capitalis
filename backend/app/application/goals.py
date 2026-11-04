"""Objetivos de ahorro con aportes virtuales: el dinero sigue en su cuenta, solo queda reservado.

Los aportes no son movimientos: no cambian saldos, ingresos ni gastos, así que nada se cuenta dos veces.
"""

from dataclasses import dataclass, replace
from datetime import date
from decimal import Decimal

from ..domain.entities import Goal, GoalContribution, GoalKind, GoalProgress, GoalStatus
from ..domain.exceptions import (
    AccountNotFound,
    ContributionNotFound,
    GoalNotFound,
    GoalWithdrawalTooLarge,
    InvalidGoalStatus,
)
from ..domain.goals import build_progress, next_status
from .ports import UnitOfWork, UnitOfWorkFactory

ZERO = Decimal("0.00")
#: Estados en los que se puede aportar o retirar.
OPEN = ("active", "completed")


@dataclass(frozen=True)
class GoalData:
    name: str
    target_amount: Decimal
    currency: str
    kind: GoalKind = "personal"
    icon: str = ""
    color: str = "#3E9A55"
    target_date: date | None = None
    note: str = ""
    #: Solo al crear: lo que ya se tiene ahorrado, como primer aporte.
    initial_amount: Decimal | None = None


@dataclass(frozen=True)
class ContributionData:
    #: Positivo = aporte, negativo = retiro.
    amount: Decimal
    date: date
    note: str = ""
    account_id: int | None = None


@dataclass(frozen=True)
class ContributionResult:
    progress: GoalProgress
    contribution: GoalContribution | None
    #: El objetivo acaba de llegar a la meta con este cambio (para celebrarlo una sola vez).
    just_completed: bool


def _goal(uow: UnitOfWork, user_id: int, goal_id: int) -> Goal:
    goal = uow.goals.get(user_id, goal_id)
    if not goal:
        raise GoalNotFound()
    return goal


def _points(uow: UnitOfWork, goal_id: int) -> list[tuple[date, Decimal]]:
    return [(c.date, c.amount) for c in uow.goal_contributions.list(goal_id)]


def _progress(uow: UnitOfWork, goal: Goal, today: date) -> GoalProgress:
    return build_progress(goal, _points(uow, goal.id), today)


def _settle(uow: UnitOfWork, goal: Goal, today: date) -> tuple[Goal, bool]:
    """Pasa el objetivo a cumplido (o de vuelta a activo) según lo ahorrado; devuelve si acaba de cumplirse."""
    saved = sum((a for _, a in _points(uow, goal.id)), ZERO)
    status = next_status(goal.status, saved, goal.target_amount)
    if status == goal.status:
        return goal, False
    completed_on = today if status == "completed" else None
    return uow.goals.update(replace(goal, status=status, completed_on=completed_on)), status == "completed"


def _ensure_account(uow: UnitOfWork, user_id: int, account_id: int | None) -> None:
    if account_id is not None and not uow.accounts.get(user_id, account_id):
        raise AccountNotFound()


def _ensure_not_negative(uow: UnitOfWork, goal_id: int) -> None:
    if sum((a for _, a in _points(uow, goal_id)), ZERO) < 0:
        raise GoalWithdrawalTooLarge()


class ListGoals:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, today: date | None = None) -> list[GoalProgress]:
        today = today or date.today()
        with self._uow_factory() as uow:
            return [_progress(uow, g, today) for g in uow.goals.list(user_id)]


class GetGoal:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, goal_id: int, today: date | None = None) -> tuple[GoalProgress, list[GoalContribution]]:
        with self._uow_factory() as uow:
            goal = _goal(uow, user_id, goal_id)
            return _progress(uow, goal, today or date.today()), uow.goal_contributions.list(goal_id)


class CreateGoal:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, data: GoalData, today: date | None = None) -> GoalProgress:
        today = today or date.today()
        goal = Goal(
            id=None,
            user_id=user_id,
            name=data.name.strip(),
            target_amount=data.target_amount,
            currency=data.currency,
            kind=data.kind,
            icon=data.icon,
            color=data.color,
            target_date=data.target_date,
            note=data.note.strip(),
            created_on=today,
        )
        with self._uow_factory() as uow:
            created = uow.goals.add(goal)
            if data.initial_amount and data.initial_amount > 0:
                uow.goal_contributions.add(
                    GoalContribution(id=None, goal_id=created.id, user_id=user_id, amount=data.initial_amount, date=today)
                )
                created, _ = _settle(uow, created, today)
            uow.commit()
            return _progress(uow, created, today)


class UpdateGoal:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, goal_id: int, data: GoalData, today: date | None = None) -> GoalProgress:
        today = today or date.today()
        with self._uow_factory() as uow:
            current = _goal(uow, user_id, goal_id)
            updated = uow.goals.update(
                replace(
                    current,
                    name=data.name.strip(),
                    target_amount=data.target_amount,
                    currency=data.currency,
                    kind=data.kind,
                    icon=data.icon,
                    color=data.color,
                    target_date=data.target_date,
                    note=data.note.strip(),
                )
            )
            # Una meta menor o mayor puede cumplir el objetivo o devolverlo a activo.
            updated, _ = _settle(uow, updated, today)
            uow.commit()
            return _progress(uow, updated, today)


class DeleteGoal:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, goal_id: int) -> None:
        with self._uow_factory() as uow:
            _goal(uow, user_id, goal_id)
            uow.goals.delete(user_id, goal_id)
            uow.commit()


class SetGoalStatus:
    """Marcar como logrado (solo si ya llegó a la meta), archivar o reactivar."""

    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, goal_id: int, status: GoalStatus, today: date | None = None) -> GoalProgress:
        today = today or date.today()
        with self._uow_factory() as uow:
            goal = _goal(uow, user_id, goal_id)
            if status == "achieved" and goal.status != "completed":
                raise InvalidGoalStatus()
            if status == "completed":
                raise InvalidGoalStatus()  # el estado "cumplido" lo decide el ahorro, no la persona
            updated = uow.goals.update(
                replace(goal, status=status, completed_on=goal.completed_on if status == "achieved" else None)
            )
            if status == "active":
                updated, _ = _settle(uow, updated, today)
            uow.commit()
            return _progress(uow, updated, today)


class AddContribution:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, goal_id: int, data: ContributionData, today: date | None = None) -> ContributionResult:
        today = today or date.today()
        with self._uow_factory() as uow:
            goal = _goal(uow, user_id, goal_id)
            if goal.status not in OPEN:
                raise InvalidGoalStatus()
            _ensure_account(uow, user_id, data.account_id)
            created = uow.goal_contributions.add(
                GoalContribution(
                    id=None, goal_id=goal_id, user_id=user_id, amount=data.amount, date=data.date,
                    note=data.note.strip(), account_id=data.account_id,
                )
            )
            _ensure_not_negative(uow, goal_id)
            goal, just_completed = _settle(uow, goal, today)
            uow.commit()
            return ContributionResult(_progress(uow, goal, today), created, just_completed)


class UpdateContribution:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(
        self, user_id: int, goal_id: int, contribution_id: int, data: ContributionData, today: date | None = None
    ) -> ContributionResult:
        today = today or date.today()
        with self._uow_factory() as uow:
            goal = _goal(uow, user_id, goal_id)
            current = uow.goal_contributions.get(user_id, contribution_id)
            if not current or current.goal_id != goal_id:
                raise ContributionNotFound()
            _ensure_account(uow, user_id, data.account_id)
            updated = uow.goal_contributions.update(
                replace(current, amount=data.amount, date=data.date, note=data.note.strip(), account_id=data.account_id)
            )
            _ensure_not_negative(uow, goal_id)
            goal, just_completed = _settle(uow, goal, today)
            uow.commit()
            return ContributionResult(_progress(uow, goal, today), updated, just_completed)


class DeleteContribution:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, goal_id: int, contribution_id: int, today: date | None = None) -> ContributionResult:
        today = today or date.today()
        with self._uow_factory() as uow:
            goal = _goal(uow, user_id, goal_id)
            current = uow.goal_contributions.get(user_id, contribution_id)
            if not current or current.goal_id != goal_id:
                raise ContributionNotFound()
            uow.goal_contributions.delete(user_id, contribution_id)
            _ensure_not_negative(uow, goal_id)
            goal, _ = _settle(uow, goal, today)
            uow.commit()
            return ContributionResult(_progress(uow, goal, today), None, False)
