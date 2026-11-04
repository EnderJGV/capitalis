from datetime import date
from decimal import Decimal
from typing import Callable, Protocol

from ..domain.repositories import (
    AccountRepository,
    CategoryRepository,
    GoalContributionRepository,
    GoalRepository,
    InstallmentPlanRepository,
    RateRepository,
    ReportRepository,
    TransactionRepository,
    TransferRepository,
    UserRepository,
)


class UnitOfWork(Protocol):
    users: UserRepository
    categories: CategoryRepository
    accounts: AccountRepository
    transactions: TransactionRepository
    installment_plans: InstallmentPlanRepository
    goals: GoalRepository
    goal_contributions: GoalContributionRepository
    transfers: TransferRepository
    rates: RateRepository
    reports: ReportRepository

    def __enter__(self) -> "UnitOfWork": ...
    def __exit__(self, exc_type, exc, tb) -> None: ...
    def commit(self) -> None: ...


UnitOfWorkFactory = Callable[[], UnitOfWork]


class PasswordHasher(Protocol):
    def hash(self, password: str) -> str: ...
    def verify(self, password: str, password_hash: str) -> bool: ...


class TokenService(Protocol):
    def create(self, user_id: int) -> str: ...
    def decode(self, token: str) -> int | None: ...


class ExchangeRateProvider(Protocol):
    def usd_rates(self, on: date | None) -> dict[str, Decimal] | None:
        """Cotizaciones con base USD (códigos en mayúsculas) del día `on`, o las más recientes si es None.
        Devuelve None si no se pudieron obtener."""
        ...
