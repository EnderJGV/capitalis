from dataclasses import dataclass, replace
from datetime import date
from decimal import Decimal

from ..domain.entities import Transaction, TxType
from ..domain.exceptions import CategoryTypeMismatch, EntityNotFound
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
    ) -> list[Transaction]:
        start, end = month_range(month) if month else (None, None)
        with self._uow_factory() as uow:
            return uow.transactions.list(user_id, start=start, end=end, type=type, category_id=category_id)


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
        )
        with self._uow_factory() as uow:
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
                )
            )
            uow.commit()
        return updated


class DeleteTransaction:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, transaction_id: int) -> None:
        with self._uow_factory() as uow:
            if not uow.transactions.get(user_id, transaction_id):
                raise EntityNotFound(NOT_FOUND)
            uow.transactions.delete(user_id, transaction_id)
            uow.commit()
