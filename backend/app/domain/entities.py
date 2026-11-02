from dataclasses import dataclass, field
from datetime import date as Date
from decimal import Decimal
from typing import Literal

from .exceptions import InvalidAmount, InvalidFee, SameAccountTransfer

TxType = Literal["income", "expense"]
Language = Literal["es", "pt", "en"]
AccountKind = Literal["checking", "savings", "digital", "cash", "investment"]


@dataclass
class User:
    id: int | None
    name: str
    email: str
    password_hash: str
    currency: str = "BRL"
    language: str = "es"


@dataclass
class Category:
    id: int | None
    user_id: int
    name: str
    type: TxType
    color: str = "#6b7280"
    icon: str = ""


@dataclass
class Account:
    id: int | None
    user_id: int
    name: str
    currency: str
    kind: AccountKind = "checking"
    #: Id del catálogo de instituciones del frontend (p. ej. "br-nubank"); None = otra / efectivo.
    institution: str | None = None
    initial_balance: Decimal = Decimal("0")
    archived: bool = False
    #: Saldo actual; solo viene calculado al listar.
    balance: Decimal | None = None


@dataclass
class Transaction:
    id: int | None
    user_id: int
    type: TxType
    amount: Decimal
    date: Date
    description: str = ""
    category_id: int | None = None
    category: Category | None = None
    account_id: int | None = None
    account: Account | None = None
    #: Si no es None, este gasto es la comisión de esa transferencia.
    transfer_id: int | None = None

    def __post_init__(self):
        if self.amount <= 0:
            raise InvalidAmount()


@dataclass(frozen=True)
class CategoryTotal:
    category_id: int | None
    name: str
    color: str
    total: Decimal
    icon: str = ""


@dataclass(frozen=True)
class MonthTotal:
    month: str
    income: Decimal
    expense: Decimal


@dataclass(frozen=True)
class AccountBalance:
    """Saldo de una cuenta en su moneda y convertido a la moneda principal (None si falta la cotización)."""

    account: Account
    converted_balance: Decimal | None


@dataclass(frozen=True)
class Summary:
    """Totales del mes en la moneda principal del usuario (`currency`)."""

    month: str
    income: Decimal
    expense: Decimal
    balance: Decimal
    total_balance: Decimal
    expenses_by_category: list[CategoryTotal]
    last_months: list[MonthTotal]
    currency: str = "BRL"
    #: True si algún monto se convirtió desde otra moneda (los totales son aproximados).
    approximate: bool = False
    #: Monedas sin cotización disponible: sus montos quedan fuera de los totales.
    missing_currencies: list[str] = field(default_factory=list)
    accounts: list[AccountBalance] = field(default_factory=list)


@dataclass
class Transfer:
    """Dinero que sale de una cuenta y llega a otra, quizá en otra moneda y con una comisión."""

    id: int | None
    user_id: int
    from_account_id: int
    to_account_id: int
    #: Monto que sale, en la moneda de la cuenta origen (sin la comisión).
    amount: Decimal
    #: Monto que llega, en la moneda de la cuenta destino.
    received_amount: Decimal
    #: Tipo de cambio aplicado: received_amount / amount.
    rate: Decimal
    date: Date
    #: Comisión cobrada en la moneda de origen; se registra además como un gasto de la cuenta origen.
    fee: Decimal = Decimal("0")
    description: str = ""
    from_account: Account | None = None
    to_account: Account | None = None

    def __post_init__(self):
        if self.from_account_id == self.to_account_id:
            raise SameAccountTransfer()
        if self.amount <= 0 or self.received_amount <= 0:
            raise InvalidAmount()
        if self.fee < 0:
            raise InvalidFee()


@dataclass(frozen=True)
class CurrencyAmount:
    """Un total en una moneda concreta, antes de convertirlo a la moneda principal."""

    currency: str
    income: Decimal
    expense: Decimal
