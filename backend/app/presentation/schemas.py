from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, computed_field

TxType = Literal["income", "expense"]
def _valid_currency(code: str) -> str:
    from ..infrastructure.catalog import get_catalog

    code = code.upper()
    if code not in get_catalog().currencies:
        raise ValueError(f"Moneda no soportada: {code}")
    return code


# Cualquier moneda del catálogo mundial (ISO 4217 con cotización disponible).
Currency = Annotated[str, Field(min_length=3, max_length=3), AfterValidator(_valid_currency)]
# Las tarjetas ("credit_card") se crean y editan en /cards, con su configuración.
AccountKind = Literal["checking", "savings", "digital", "cash", "investment"]
CardNetwork = Literal[
    "visa", "mastercard", "amex", "elo", "hipercard", "diners", "discover", "jcb", "unionpay", "cabal", "other"
]


Language = Literal["es", "pt", "en"]


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    currency: Currency = "BRL"
    language: Language = "es"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    currency: Currency | None = None
    language: Language | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    currency: str
    language: str


class TokenOut(BaseModel):
    access_token: str
    user: UserOut


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    type: TxType
    color: str = Field(default="#6b7280", pattern=r"^#[0-9a-fA-F]{6}$")
    icon: str = Field(default="", max_length=16)


class CategoryOut(CategoryIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class AccountIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    currency: Currency
    kind: AccountKind = "checking"
    institution: str | None = Field(default=None, max_length=40)
    initial_balance: Decimal = Field(default=Decimal("0"), max_digits=14, decimal_places=2)
    archived: bool = False


class InstitutionInfo(BaseModel):
    name: str
    kind: str
    domain: str | None = None
    color: str | None = None


class CardConfigOut(BaseModel):
    """Configuración de una tarjeta de crédito (nunca incluye el número completo)."""

    model_config = ConfigDict(from_attributes=True)
    network: str
    last4: str | None
    credit_limit: Decimal
    closing_day: int
    due_day: int
    payment_account_id: int | None


class AccountRef(BaseModel):
    """Datos mínimos de una cuenta para mostrarla junto a un movimiento o transferencia."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    currency: str
    kind: str
    institution: str | None
    #: Solo en las tarjetas de crédito.
    card: CardConfigOut | None = None

    @computed_field
    @property
    def institution_info(self) -> InstitutionInfo | None:
        """Nombre, dominio (logo) y color de la institución, tomados del catálogo."""
        from ..infrastructure.catalog import get_catalog

        found = get_catalog().get(self.institution) if self.institution else None
        if not found:
            return None
        return InstitutionInfo(name=found.name, kind=found.kind, domain=found.domain, color=found.color)


class AccountOut(AccountRef):
    initial_balance: Decimal
    archived: bool
    balance: Decimal
    #: Saldo en la moneda principal del usuario (None si no hay cotización).
    converted_balance: Decimal | None = None


class CardIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    currency: Currency
    institution: str | None = Field(default=None, max_length=40)
    network: CardNetwork = "other"
    #: Solo los últimos 4 dígitos, opcionales, para reconocer la tarjeta. El dominio valida el formato.
    last4: str | None = Field(default=None, max_length=4)
    credit_limit: Decimal = Field(default=Decimal("0"), max_digits=14, decimal_places=2)
    closing_day: int
    due_day: int
    payment_account_id: int | None = None
    archived: bool = False


class StatementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    #: Mes del cierre ("YYYY-MM"): identifica la factura.
    month: str
    start_date: date
    closing_date: date
    due_date: date
    charges: Decimal
    credits: Decimal
    total: Decimal
    paid: Decimal
    pending: Decimal
    status: str


class CardOut(AccountOut):
    card: CardConfigOut
    debt: Decimal
    available: Decimal
    credit_balance: Decimal
    current_statement: StatementOut
    next_due: StatementOut | None = None


class TransactionIn(BaseModel):
    type: TxType
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    description: str = Field(default="", max_length=255)
    date: date
    category_id: int | None = None
    account_id: int | None = None
    #: Compra en cuotas (solo gastos de tarjeta): `amount` es el total y se reparte en N meses.
    installments: int | None = Field(default=None, ge=1, le=48)


class InstallmentPlanRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    total_amount: Decimal
    installments: int
    purchase_date: date


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: TxType
    amount: Decimal
    description: str
    date: date
    category_id: int | None
    category: CategoryOut | None = None
    account_id: int
    account: AccountRef | None = None
    #: Si no es None, es la comisión de esa transferencia (se edita desde la transferencia).
    transfer_id: int | None = None
    #: Cuota `installment_number` de `installment_count`; se edita la compra entera (`installment_plan`).
    installment_number: int | None = None
    installment_count: int | None = None
    installment_plan: InstallmentPlanRef | None = None


class InstallmentProgressOut(BaseModel):
    """Compra en cuotas en curso: "3/12 · faltan R$ 900"."""

    id: int
    description: str
    category_id: int | None
    total_amount: Decimal
    installments: int
    purchase_date: date
    installment_amount: Decimal
    charged: int
    remaining: Decimal
    next_date: date | None


class TransferIn(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    received_amount: Decimal | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    fee: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    date: date
    description: str = Field(default="", max_length=255)


class TransferOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    from_account_id: int
    to_account_id: int
    from_account: AccountRef | None = None
    to_account: AccountRef | None = None
    amount: Decimal
    received_amount: Decimal
    rate: Decimal
    fee: Decimal
    date: date
    description: str


class RateOut(BaseModel):
    base: str
    quote: str
    rate: Decimal
    date: date


class CategoryTotalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    category_id: int | None
    name: str
    color: str
    icon: str = ""
    total: Decimal


class MonthTotalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    month: str
    income: Decimal
    expense: Decimal


class SummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    month: str
    income: Decimal
    expense: Decimal
    balance: Decimal
    total_balance: Decimal
    expenses_by_category: list[CategoryTotalOut]
    last_months: list[MonthTotalOut]
    currency: str
    approximate: bool
    missing_currencies: list[str]
    accounts: list[AccountOut]
    cards: list[CardOut] = []
