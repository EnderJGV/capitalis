import re
from dataclasses import dataclass, field
from datetime import date as Date
from decimal import Decimal
from typing import Literal

from .exceptions import (
    InvalidAmount,
    InvalidCardDays,
    InvalidCreditLimit,
    InvalidFee,
    InvalidInstallments,
    InvalidLast4,
    SameAccountTransfer,
)

TxType = Literal["income", "expense"]
Language = Literal["es", "pt", "en"]
AccountKind = Literal["checking", "savings", "digital", "cash", "investment", "credit_card"]
CardNetwork = Literal[
    "visa", "mastercard", "amex", "elo", "hipercard", "diners", "discover", "jcb", "unionpay", "cabal", "other"
]
StatementStatus = Literal["future", "open", "closed", "partial", "overdue", "paid", "credit"]

MIN_INSTALLMENTS, MAX_INSTALLMENTS = 2, 48
_LAST4 = re.compile(r"^\d{4}$")


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
class CreditCard:
    """Configuración de una tarjeta de crédito; la tarjeta es una cuenta con `kind = "credit_card"`.

    Por seguridad solo se guardan los últimos 4 dígitos (opcionales): nunca el número completo,
    el código de seguridad ni el vencimiento del plástico.
    """

    network: CardNetwork
    credit_limit: Decimal
    closing_day: int
    due_day: int
    last4: str | None = None
    #: Cuenta desde la que se paga la factura por defecto.
    payment_account_id: int | None = None

    def __post_init__(self):
        if not (1 <= self.closing_day <= 31 and 1 <= self.due_day <= 31):
            raise InvalidCardDays()
        if self.last4 is not None and not _LAST4.match(self.last4):
            raise InvalidLast4()
        if self.credit_limit < 0:
            raise InvalidCreditLimit()


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
    #: Saldo actual; solo viene calculado al listar. En una tarjeta es −deuda.
    balance: Decimal | None = None
    #: Solo en las tarjetas de crédito.
    card: CreditCard | None = None

    @property
    def is_card(self) -> bool:
        return self.kind == "credit_card"


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
    #: Cuota `installment_number` de `installment_count` de una compra en cuotas.
    installment_plan_id: int | None = None
    installment_number: int | None = None
    installment_count: int | None = None
    #: Ingreso en una tarjeta que devuelve una compra: en los informes resta del gasto de su categoría.
    is_refund: bool = False
    #: Compra en otra moneda: monto y moneda originales y el tipo de cambio aplicado (amount / original_amount).
    original_amount: Decimal | None = None
    original_currency: str | None = None
    exchange_rate: Decimal | None = None
    #: Si no es None, este gasto es la tarifa internacional (IOF) de esa compra.
    parent_id: int | None = None

    def __post_init__(self):
        if self.amount <= 0:
            raise InvalidAmount()


@dataclass
class InstallmentPlan:
    """Compra en cuotas: genera un gasto por cuota, cada uno en su mes."""

    id: int | None
    user_id: int
    account_id: int
    total_amount: Decimal
    installments: int
    purchase_date: Date
    description: str = ""
    category_id: int | None = None

    def __post_init__(self):
        if not MIN_INSTALLMENTS <= self.installments <= MAX_INSTALLMENTS:
            raise InvalidInstallments()
        if self.total_amount <= 0:
            raise InvalidAmount()


@dataclass(frozen=True)
class Statement:
    """Factura de una tarjeta: los movimientos de un ciclo (de `start_date` a `closing_date`, inclusive)."""

    start_date: Date
    closing_date: Date
    due_date: Date
    #: Compras, cuotas y tarifas del ciclo.
    charges: Decimal
    #: Reembolsos y otros créditos del ciclo.
    credits: Decimal
    #: Pagos asignados a esta factura.
    paid: Decimal
    status: StatementStatus

    @property
    def total(self) -> Decimal:
        return self.charges - self.credits

    @property
    def pending(self) -> Decimal:
        return max(self.total - self.paid, Decimal("0"))

    @property
    def month(self) -> str:
        """Identifica la factura por el mes de su cierre ("YYYY-MM"): hay exactamente una por mes."""
        return self.closing_date.strftime("%Y-%m")


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
