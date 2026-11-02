from typing import Callable, Protocol

from ..domain.repositories import CategoryRepository, ReportRepository, TransactionRepository, UserRepository


class UnitOfWork(Protocol):
    users: UserRepository
    categories: CategoryRepository
    transactions: TransactionRepository
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
