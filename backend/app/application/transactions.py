from dataclasses import dataclass, replace
from datetime import date
from decimal import Decimal

from ..domain.entities import Transaction, TxType
from ..domain.exceptions import (
    AccountArchived,
    AccountNotFound,
    AccountRequired,
    CategoryTypeMismatch,
    EntityNotFound,
    InvalidDateRange,
    TransferFeeLocked,
)
from ..domain.periods import month_range
from .ports import UnitOfWork, UnitOfWorkFactory

NOT_FOUND = "Transacción no encontrada"


@dataclass(frozen=True)
class TransactionData:
    type: TxType
    amount: Decimal
    date: date
    description: str = ""
    category_id: int | None = None
    account_id: int | None = None


def _ensure_account(uow: UnitOfWork, user_id: int, account_id: int | None, current_id: int | None = None) -> None:
    """Cada movimiento pertenece a una cuenta ya registrada y activa (la actual se acepta aunque esté archivada)."""
    if account_id is None:
        raise AccountRequired()
    account = uow.accounts.get(user_id, account_id)
    if not account:
        raise AccountNotFound()
    if account.archived and account_id != current_id:
        raise AccountArchived()


def _ensure_category_fits(uow: UnitOfWork, user_id: int, data: TransactionData) -> None:
    if data.category_id is None:
        return
    category = uow.categories.get(user_id, data.category_id)
    if not category:
        raise EntityNotFound("Categoría no encontrada")
    if category.type != data.type:
        raise CategoryTypeMismatch()


class ListTransactions:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(
        self,
        user_id: int,
        month: str | None = None,
        type: TxType | None = None,
        category_id: int | None = None,
        start: date | None = None,
        end: date | None = None,
        account_id: int | None = None,
    ) -> list[Transaction]:
        if month:
            start, end = month_range(month)
        elif start and end and start > end:
            raise InvalidDateRange()
        with self._uow_factory() as uow:
            return uow.transactions.list(
                user_id, start=start, end=end, type=type, category_id=category_id, account_id=account_id
            )


class CreateTransaction:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, data: TransactionData) -> Transaction:
        transaction = Transaction(
            id=None,
            user_id=user_id,
            type=data.type,
            amount=data.amount,
            date=data.date,
            description=data.description,
            category_id=data.category_id,
            account_id=data.account_id,
        )
        with self._uow_factory() as uow:
            _ensure_account(uow, user_id, data.account_id)
            _ensure_category_fits(uow, user_id, data)
            created = uow.transactions.add(transaction)
            uow.commit()
        return created


class UpdateTransaction:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, transaction_id: int, data: TransactionData) -> Transaction:
        with self._uow_factory() as uow:
            current = uow.transactions.get(user_id, transaction_id)
            if not current:
                raise EntityNotFound(NOT_FOUND)
            if current.transfer_id:
                raise TransferFeeLocked()
            _ensure_account(uow, user_id, data.account_id, current.account_id)
            _ensure_category_fits(uow, user_id, data)
            updated = uow.transactions.update(
                replace(
                    current,
                    type=data.type,
                    amount=data.amount,
                    date=data.date,
                    description=data.description,
                    category_id=data.category_id,
                    category=None,
                    account_id=data.account_id,
                    account=None,
                )
            )
            uow.commit()
        return updated


class DeleteTransaction:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, transaction_id: int) -> None:
        with self._uow_factory() as uow:
            current = uow.transactions.get(user_id, transaction_id)
            if not current:
                raise EntityNotFound(NOT_FOUND)
            if current.transfer_id:
                raise TransferFeeLocked()
            uow.transactions.delete(user_id, transaction_id)
            uow.commit()
