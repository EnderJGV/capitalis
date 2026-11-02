from dataclasses import dataclass, replace
from datetime import date
from decimal import Decimal

from ..domain.entities import Account, AccountBalance, AccountKind, User
from ..domain.exceptions import AccountCurrencyLocked, AccountHasMovements, AccountNotFound
from .ports import UnitOfWorkFactory
from .rates import CurrencyConverter


@dataclass(frozen=True)
class AccountData:
    name: str
    currency: str
    kind: AccountKind = "checking"
    institution: str | None = None
    initial_balance: Decimal = Decimal("0")
    archived: bool = False


class ListAccounts:
    """Cuentas con su saldo, también convertido a la moneda principal del usuario."""

    def __init__(self, uow_factory: UnitOfWorkFactory, converter: CurrencyConverter):
        self._uow_factory = uow_factory
        self._converter = converter

    def execute(self, user: User, include_archived: bool = False) -> list[AccountBalance]:
        with self._uow_factory() as uow:
            accounts = uow.accounts.list(user.id, include_archived=include_archived)
        today = date.today()
        return [
            AccountBalance(a, self._converter.convert(a.balance or Decimal("0"), a.currency, user.currency, today))
            for a in accounts
        ]


class GetAccount:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, account_id: int) -> Account:
        with self._uow_factory() as uow:
            account = uow.accounts.get(user_id, account_id)
        if not account:
            raise AccountNotFound()
        return account


class CreateAccount:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, data: AccountData) -> Account:
        account = Account(
            id=None,
            user_id=user_id,
            name=data.name.strip(),
            currency=data.currency,
            kind=data.kind,
            institution=data.institution,
            initial_balance=data.initial_balance,
            archived=data.archived,
        )
        with self._uow_factory() as uow:
            created = uow.accounts.add(account)
            uow.commit()
        return created


class UpdateAccount:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, account_id: int, data: AccountData) -> Account:
        with self._uow_factory() as uow:
            current = uow.accounts.get(user_id, account_id)
            if not current:
                raise AccountNotFound()
            if data.currency != current.currency and uow.accounts.has_movements(account_id):
                raise AccountCurrencyLocked()
            updated = uow.accounts.update(
                replace(
                    current,
                    name=data.name.strip(),
                    currency=data.currency,
                    kind=data.kind,
                    institution=data.institution,
                    initial_balance=data.initial_balance,
                    archived=data.archived,
                )
            )
            uow.commit()
        return updated


class DeleteAccount:
    """Solo se pueden eliminar cuentas sin movimientos; las demás se archivan."""

    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, account_id: int) -> None:
        with self._uow_factory() as uow:
            if not uow.accounts.get(user_id, account_id):
                raise AccountNotFound()
            if uow.accounts.has_movements(account_id):
                raise AccountHasMovements()
            uow.accounts.delete(user_id, account_id)
            uow.commit()
