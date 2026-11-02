from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from ..domain.entities import Account, Transaction, TxType
from ..domain.exceptions import (
    AccountArchived,
    AccountNotFound,
    AccountRequired,
    CategoryTypeMismatch,
    EntityNotFound,
    ForeignFeeLocked,
    InvalidDateRange,
    RefundOnlyOnCards,
    TransferFeeLocked,
)
from ..domain.periods import month_range
from .installments import create_plan, ensure_installments_allowed, replace_plan
from .ports import UnitOfWork, UnitOfWorkFactory
from .transfers import fee_category

NOT_FOUND = "Transacción no encontrada"
ZERO = Decimal("0.00")
CENT = Decimal("0.01")
RATE_PLACES = Decimal("0.00000001")


@dataclass(frozen=True)
class TransactionData:
    type: TxType
    amount: Decimal
    date: date
    description: str = ""
    category_id: int | None = None
    account_id: int | None = None
    #: Compra en cuotas (solo gastos de tarjeta): `amount` es el total y se reparte en este número de meses.
    installments: int | None = None
    #: Ingreso en una tarjeta que devuelve una compra: lleva una categoría de gasto y resta de ella en los informes.
    is_refund: bool = False
    #: Compra en otra moneda: monto y moneda originales; `amount` ya viene convertido a la moneda de la cuenta.
    original_amount: Decimal | None = None
    original_currency: str | None = None
    #: % de tarifa internacional (IOF) sobre `amount`: se registra como un gasto aparte enlazado a la compra.
    foreign_fee_percent: Decimal | None = None

    @property
    def in_installments(self) -> bool:
        return (self.installments or 1) > 1


def _new_plan(uow: UnitOfWork, user_id: int, data: TransactionData) -> Transaction:
    return create_plan(
        uow, user_id, data.account_id, data.amount, data.installments, data.date, data.description, data.category_id
    )


def _ensure_account(uow: UnitOfWork, user_id: int, account_id: int | None, current_id: int | None = None) -> Account:
    """Cada movimiento pertenece a una cuenta ya registrada y activa (la actual se acepta aunque esté archivada)."""
    if account_id is None:
        raise AccountRequired()
    account = uow.accounts.get(user_id, account_id)
    if not account:
        raise AccountNotFound()
    if account.archived and account_id != current_id:
        raise AccountArchived()
    return account


def _ensure_category_fits(uow: UnitOfWork, user_id: int, data: TransactionData) -> None:
    if data.category_id is None:
        return
    category = uow.categories.get(user_id, data.category_id)
    if not category:
        raise EntityNotFound("Categoría no encontrada")
    # Un reembolso devuelve un gasto: va en la categoría de ese gasto.
    if category.type != ("expense" if data.is_refund else data.type):
        raise CategoryTypeMismatch()


def _ensure_refund_allowed(account: Account, data: TransactionData) -> None:
    if data.is_refund and (not account.is_card or data.type != "income"):
        raise RefundOnlyOnCards()


def _build(user_id: int, data: TransactionData, account: Account, transaction_id: int | None = None) -> Transaction:
    # Los datos de la moneda original solo valen para un gasto de un solo pago en otra moneda.
    foreign = (
        data.type == "expense"
        and not data.in_installments
        and data.original_amount is not None
        and data.original_currency is not None
        and data.original_currency != account.currency
    )
    return Transaction(
        id=transaction_id,
        user_id=user_id,
        type=data.type,
        amount=data.amount,
        date=data.date,
        description=data.description,
        category_id=data.category_id,
        account_id=data.account_id,
        is_refund=data.is_refund,
        original_amount=data.original_amount if foreign else None,
        original_currency=data.original_currency if foreign else None,
        exchange_rate=(data.amount / data.original_amount).quantize(RATE_PLACES) if foreign else None,
    )


def _sync_foreign_fee(uow: UnitOfWork, user_id: int, purchase: Transaction, percent: Decimal | None) -> None:
    """La tarifa internacional es un gasto enlazado a la compra (parent_id): se crea, actualiza o borra."""
    current = uow.transactions.get_child(purchase.id)
    fee = ZERO
    if purchase.original_currency and percent and percent > 0:
        fee = (purchase.amount * percent / 100).quantize(CENT, rounding=ROUND_HALF_UP)
    if fee <= 0:
        if current:
            uow.transactions.delete(user_id, current.id)
        return
    description = f"{purchase.description or purchase.original_currency} · {format(percent.normalize(), 'f')} %"
    if current:
        current.amount, current.date, current.account_id = fee, purchase.date, purchase.account_id
        current.description = description
        uow.transactions.update(current)
        return
    user = uow.users.get(user_id)
    category = fee_category(uow, user_id, user.language if user else "es")
    uow.transactions.add(
        Transaction(
            id=None,
            user_id=user_id,
            type="expense",
            amount=fee,
            date=purchase.date,
            description=description,
            category_id=category.id,
            account_id=purchase.account_id,
            parent_id=purchase.id,
        )
    )


def _ensure_editable(current: Transaction | None) -> Transaction:
    if not current:
        raise EntityNotFound(NOT_FOUND)
    if current.transfer_id:
        raise TransferFeeLocked()
    if current.parent_id:
        raise ForeignFeeLocked()
    return current


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
        with self._uow_factory() as uow:
            account = _ensure_account(uow, user_id, data.account_id)
            _ensure_category_fits(uow, user_id, data)
            _ensure_refund_allowed(account, data)
            if data.in_installments:
                ensure_installments_allowed(uow, user_id, data.account_id, data.type)
                created = _new_plan(uow, user_id, data)
            else:
                created = uow.transactions.add(_build(user_id, data, account))
                _sync_foreign_fee(uow, user_id, created, data.foreign_fee_percent)
                created = uow.transactions.get(user_id, created.id)
            uow.commit()
        return created


class UpdateTransaction:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, transaction_id: int, data: TransactionData) -> Transaction:
        with self._uow_factory() as uow:
            current = _ensure_editable(uow.transactions.get(user_id, transaction_id))
            account = _ensure_account(uow, user_id, data.account_id, current.account_id)
            _ensure_category_fits(uow, user_id, data)
            _ensure_refund_allowed(account, data)
            if data.in_installments:
                ensure_installments_allowed(uow, user_id, data.account_id, data.type)
            if current.installment_plan_id or data.in_installments:
                # Editar una cuota edita la compra entera: el monto es el total y las cuotas se regeneran.
                updated = self._edit_plan(uow, user_id, current, data, account)
            else:
                updated = uow.transactions.update(_build(user_id, data, account, current.id))
            if not updated.installment_plan_id:
                _sync_foreign_fee(uow, user_id, updated, data.foreign_fee_percent)
                updated = uow.transactions.get(user_id, updated.id)
            uow.commit()
        return updated

    @staticmethod
    def _edit_plan(
        uow: UnitOfWork, user_id: int, current: Transaction, data: TransactionData, account: Account
    ) -> Transaction:
        plan = uow.installment_plans.get(user_id, current.installment_plan_id) if current.installment_plan_id else None
        if plan and data.in_installments:
            return replace_plan(
                uow, plan, data.account_id, data.amount, data.installments, data.date, data.description, data.category_id
            )
        # Pasa de cuotas a un solo pago, o de un solo pago a cuotas: se reemplaza lo anterior
        # (al borrar una compra se borra también su tarifa internacional).
        if plan:
            uow.installment_plans.delete(user_id, plan.id)
        else:
            uow.transactions.delete(user_id, current.id)
        if data.in_installments:
            return _new_plan(uow, user_id, data)
        return uow.transactions.add(_build(user_id, data, account))


class DeleteTransaction:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, transaction_id: int) -> None:
        with self._uow_factory() as uow:
            current = _ensure_editable(uow.transactions.get(user_id, transaction_id))
            if current.installment_plan_id:
                # Borrar una cuota borra la compra entera, con todas sus cuotas.
                uow.installment_plans.delete(user_id, current.installment_plan_id)
            else:
                # La tarifa internacional enlazada se borra con la compra.
                uow.transactions.delete(user_id, transaction_id)
            uow.commit()
