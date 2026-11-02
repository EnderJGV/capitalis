"""Tarjetas de crédito: una cuenta con `kind = "credit_card"` y su configuración.

- Las compras son gastos de la tarjeta: cuentan en la fecha de compra y el saldo de la cuenta es −deuda.
- Pagar la factura es una transferencia de una cuenta a la tarjeta (no es un gasto: no cuenta dos veces).
- Las facturas se calculan con `domain.statements` a partir de los movimientos y los pagos.
"""

from dataclasses import dataclass, replace
from datetime import date
from decimal import Decimal

from ..domain.entities import Account, CardNetwork, CardOverview, CreditCard, Statement
from ..domain.exceptions import (
    AccountCurrencyLocked,
    AccountHasMovements,
    AccountNotFound,
    CardNotFound,
    PaymentAccountIsCard,
)
from ..domain.statements import build_statements
from .ports import UnitOfWork, UnitOfWorkFactory

ZERO = Decimal("0.00")
#: Estados de una factura cerrada que todavía hay que pagar.
UNPAID = ("closed", "partial", "overdue")


@dataclass(frozen=True)
class CardData:
    name: str
    currency: str
    network: CardNetwork
    credit_limit: Decimal
    closing_day: int
    due_day: int
    institution: str | None = None
    last4: str | None = None
    payment_account_id: int | None = None
    archived: bool = False

    def card(self) -> CreditCard:
        return CreditCard(
            network=self.network,
            credit_limit=self.credit_limit,
            closing_day=self.closing_day,
            due_day=self.due_day,
            last4=self.last4 or None,
            payment_account_id=self.payment_account_id,
        )


def card_statements(uow: UnitOfWork, user_id: int, account: Account, today: date) -> list[Statement]:
    """Facturas de una tarjeta, de la más vieja a la más nueva (la abierta siempre aparece)."""
    movements = [
        (t.date, t.amount if t.type == "expense" else -t.amount)
        for t in uow.transactions.list(user_id, account_id=account.id)
    ]
    payments = []
    for transfer in uow.transfers.list(user_id, account_id=account.id):
        if transfer.to_account_id == account.id:
            payments.append(transfer.received_amount)
        else:
            # Dinero que sale de la tarjeta (p. ej. un adelanto en efectivo): es un cargo más.
            movements.append((transfer.date, transfer.amount))
    return build_statements(account.card.closing_day, account.card.due_day, movements, payments, today)


def card_overview(uow: UnitOfWork, user_id: int, account: Account, today: date) -> CardOverview:
    statements = card_statements(uow, user_id, account, today)
    balance = account.balance or ZERO
    debt = max(-balance, ZERO)
    current = next(s for s in statements if s.start_date <= today <= s.closing_date)
    return CardOverview(
        account=account,
        debt=debt,
        available=account.card.credit_limit - debt,
        credit_balance=max(balance, ZERO),
        current=current,
        next_due=next((s for s in statements if s.status in UNPAID), None),
    )


def _card_account(uow: UnitOfWork, user_id: int, account_id: int) -> Account:
    account = uow.accounts.get(user_id, account_id)
    if not account or not account.is_card:
        raise CardNotFound()
    return account


def _ensure_payment_account(uow: UnitOfWork, user_id: int, account_id: int | None) -> None:
    if account_id is None:
        return
    account = uow.accounts.get(user_id, account_id)
    if not account:
        raise AccountNotFound()
    if account.is_card:
        raise PaymentAccountIsCard()


class ListCreditCards:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, include_archived: bool = False, today: date | None = None) -> list[CardOverview]:
        today = today or date.today()
        with self._uow_factory() as uow:
            return [
                card_overview(uow, user_id, account, today)
                for account in uow.accounts.list(user_id, include_archived=include_archived)
                if account.is_card
            ]


class GetCreditCard:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, account_id: int, today: date | None = None) -> CardOverview:
        with self._uow_factory() as uow:
            return card_overview(uow, user_id, _card_account(uow, user_id, account_id), today or date.today())


class GetStatements:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, account_id: int, today: date | None = None) -> list[Statement]:
        with self._uow_factory() as uow:
            account = _card_account(uow, user_id, account_id)
            return card_statements(uow, user_id, account, today or date.today())


class CreateCreditCard:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, data: CardData) -> CardOverview:
        account = Account(
            id=None,
            user_id=user_id,
            name=data.name.strip(),
            currency=data.currency,
            kind="credit_card",
            institution=data.institution,
            archived=data.archived,
            card=data.card(),
        )
        with self._uow_factory() as uow:
            _ensure_payment_account(uow, user_id, data.payment_account_id)
            created = uow.accounts.add(account)
            uow.commit()
            return card_overview(uow, user_id, created, date.today())


class UpdateCreditCard:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, account_id: int, data: CardData) -> CardOverview:
        with self._uow_factory() as uow:
            current = _card_account(uow, user_id, account_id)
            if data.currency != current.currency and uow.accounts.has_movements(account_id):
                raise AccountCurrencyLocked()
            _ensure_payment_account(uow, user_id, data.payment_account_id)
            updated = uow.accounts.update(
                replace(
                    current,
                    name=data.name.strip(),
                    currency=data.currency,
                    institution=data.institution,
                    archived=data.archived,
                    card=data.card(),
                )
            )
            uow.commit()
            return card_overview(uow, user_id, updated, date.today())


class DeleteCreditCard:
    """Como las cuentas: solo se elimina si no tiene movimientos; si no, se archiva."""

    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, account_id: int) -> None:
        with self._uow_factory() as uow:
            _card_account(uow, user_id, account_id)
            if uow.accounts.has_movements(account_id):
                raise AccountHasMovements()
            uow.accounts.delete(user_id, account_id)
            uow.commit()
