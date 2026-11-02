from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from ..domain.defaults import FEE_CATEGORY
from ..domain.entities import Account, Category, Transaction, Transfer, User
from ..domain.exceptions import AccountArchived, AccountNotFound, InvalidAmount, InvalidDateRange, TransferNotFound
from ..domain.periods import month_range
from .ports import UnitOfWork, UnitOfWorkFactory

ZERO = Decimal("0")
RATE_PLACES = Decimal("0.00000001")


@dataclass(frozen=True)
class TransferData:
    from_account_id: int
    to_account_id: int
    #: Monto que sale de la cuenta origen (sin la comisión).
    amount: Decimal
    date: date
    #: Monto que llega; obligatorio solo si las monedas son distintas.
    received_amount: Decimal | None = None
    fee: Decimal = ZERO
    description: str = ""


def _account(uow: UnitOfWork, user_id: int, account_id: int, allowed_archived: set[int]) -> Account:
    account = uow.accounts.get(user_id, account_id)
    if not account:
        raise AccountNotFound()
    if account.archived and account_id not in allowed_archived:
        raise AccountArchived()
    return account


def _build(user_id: int, data: TransferData, source: Account, target: Account, transfer_id: int | None) -> Transfer:
    if source.currency == target.currency:
        # Misma moneda: llega exactamente lo que sale.
        received, rate = data.amount, Decimal("1")
    else:
        if data.received_amount is None:
            raise InvalidAmount()
        received = data.received_amount
        rate = (received / data.amount).quantize(RATE_PLACES) if data.amount > 0 else ZERO
    return Transfer(
        id=transfer_id,
        user_id=user_id,
        from_account_id=source.id,
        to_account_id=target.id,
        amount=data.amount,
        received_amount=received,
        rate=rate,
        date=data.date,
        fee=data.fee,
        description=data.description.strip(),
    )


def _fee_category(uow: UnitOfWork, user: User) -> Category:
    """Categoría "Comisiones bancarias" del usuario (en su idioma); se crea la primera vez."""
    name, color, icon = FEE_CATEGORY.get(user.language, FEE_CATEGORY["es"])
    existing = uow.categories.get_by_name(user.id, name, "expense")
    if existing:
        return existing
    return uow.categories.add(Category(id=None, user_id=user.id, name=name, type="expense", color=color, icon=icon))


def _sync_fee(uow: UnitOfWork, user: User, transfer: Transfer, source: Account, target: Account) -> None:
    """La comisión es un gasto de la cuenta origen enlazado a la transferencia: se crea, actualiza o borra."""
    current = uow.transactions.get_fee(transfer.id)
    if transfer.fee <= 0:
        if current:
            uow.transactions.delete(user.id, current.id)
        return
    description = transfer.description or f"{source.name} → {target.name}"
    if current:
        current.amount, current.date, current.account_id = transfer.fee, transfer.date, source.id
        current.description = description
        uow.transactions.update(current)
        return
    category = _fee_category(uow, user)
    uow.transactions.add(
        Transaction(
            id=None,
            user_id=user.id,
            type="expense",
            amount=transfer.fee,
            date=transfer.date,
            description=description,
            category_id=category.id,
            account_id=source.id,
            transfer_id=transfer.id,
        )
    )


class ListTransfers:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(
        self,
        user_id: int,
        month: str | None = None,
        start: date | None = None,
        end: date | None = None,
        account_id: int | None = None,
    ) -> list[Transfer]:
        if month:
            start, end = month_range(month)
        elif start and end and start > end:
            raise InvalidDateRange()
        with self._uow_factory() as uow:
            return uow.transfers.list(user_id, start=start, end=end, account_id=account_id)


class CreateTransfer:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user: User, data: TransferData) -> Transfer:
        with self._uow_factory() as uow:
            source = _account(uow, user.id, data.from_account_id, set())
            target = _account(uow, user.id, data.to_account_id, set())
            created = uow.transfers.add(_build(user.id, data, source, target, None))
            _sync_fee(uow, user, created, source, target)
            uow.commit()
            return uow.transfers.get(user.id, created.id)


class UpdateTransfer:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user: User, transfer_id: int, data: TransferData) -> Transfer:
        with self._uow_factory() as uow:
            current = uow.transfers.get(user.id, transfer_id)
            if not current:
                raise TransferNotFound()
            # Una transferencia vieja puede seguir apuntando a cuentas ya archivadas.
            kept = {current.from_account_id, current.to_account_id}
            source = _account(uow, user.id, data.from_account_id, kept)
            target = _account(uow, user.id, data.to_account_id, kept)
            updated = uow.transfers.update(_build(user.id, data, source, target, transfer_id))
            _sync_fee(uow, user, updated, source, target)
            uow.commit()
            return uow.transfers.get(user.id, transfer_id)


class DeleteTransfer:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, transfer_id: int) -> None:
        with self._uow_factory() as uow:
            if not uow.transfers.get(user_id, transfer_id):
                raise TransferNotFound()
            uow.transfers.delete(user_id, transfer_id)
            uow.commit()
