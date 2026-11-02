from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    currency: Mapped[str] = mapped_column(String(3), default="BRL")
    language: Mapped[str] = mapped_column(String(5), default="es", server_default="es")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CategoryModel(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("user_id", "name", "type"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(60))
    type: Mapped[str] = mapped_column(String(7))
    color: Mapped[str] = mapped_column(String(7), default="#6b7280")
    icon: Mapped[str] = mapped_column(String(16), default="", server_default="")


class AccountModel(Base):
    __tablename__ = "accounts"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_accounts_user_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    institution: Mapped[str | None] = mapped_column(String(40), nullable=True)
    name: Mapped[str] = mapped_column(String(60))
    kind: Mapped[str] = mapped_column(String(12), default="checking")
    currency: Mapped[str] = mapped_column(String(3))
    initial_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    #: Solo en las tarjetas de crédito (kind = "credit_card").
    card: Mapped["CreditCardModel | None"] = relationship(
        foreign_keys="CreditCardModel.account_id", cascade="all, delete-orphan", lazy="selectin"
    )


class CreditCardModel(Base):
    """Configuración de una tarjeta. Nunca se guarda el número completo ni el código de seguridad."""

    __tablename__ = "credit_cards"
    __table_args__ = (
        CheckConstraint("closing_day BETWEEN 1 AND 31 AND due_day BETWEEN 1 AND 31", name="ck_credit_cards_days"),
        CheckConstraint("credit_limit >= 0", name="ck_credit_cards_limit_not_negative"),
    )

    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), primary_key=True)
    network: Mapped[str] = mapped_column(String(12))
    last4: Mapped[str | None] = mapped_column(String(4), nullable=True)
    credit_limit: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    closing_day: Mapped[int] = mapped_column(SmallInteger)
    due_day: Mapped[int] = mapped_column(SmallInteger)
    payment_account_id: Mapped[int | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class InstallmentPlanModel(Base):
    """Compra en cuotas; cada cuota es un movimiento con `installment_plan_id`."""

    __tablename__ = "installment_plans"
    __table_args__ = (
        CheckConstraint("installments BETWEEN 2 AND 48", name="ck_installment_plans_count"),
        CheckConstraint("total_amount > 0", name="ck_installment_plans_total_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="RESTRICT"))
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    description: Mapped[str] = mapped_column(String(255), default="")
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    installments: Mapped[int] = mapped_column(SmallInteger)
    purchase_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class TransferModel(Base):
    __tablename__ = "transfers"
    __table_args__ = (
        CheckConstraint("from_account_id <> to_account_id", name="ck_transfers_distinct_accounts"),
        CheckConstraint("amount > 0 AND received_amount > 0", name="ck_transfers_amounts_positive"),
        CheckConstraint("fee >= 0", name="ck_transfers_fee_not_negative"),
        Index("ix_transfers_user_date", "user_id", "date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    from_account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="RESTRICT"))
    to_account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="RESTRICT"))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    received_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    rate: Mapped[Decimal] = mapped_column(Numeric(18, 8))
    fee: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    date: Mapped[date] = mapped_column(Date)
    description: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    from_account: Mapped[AccountModel] = relationship(foreign_keys=[from_account_id])
    to_account: Mapped[AccountModel] = relationship(foreign_keys=[to_account_id])


class ExchangeRateModel(Base):
    """Caché diaria de cotizaciones: 1 `base` = `rate` `quote`."""

    __tablename__ = "exchange_rates"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    base: Mapped[str] = mapped_column(String(3), primary_key=True)
    quote: Mapped[str] = mapped_column(String(3), primary_key=True)
    rate: Mapped[Decimal] = mapped_column(Numeric(24, 10))


class TransactionModel(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_transactions_amount_positive"),
        Index("ix_transactions_user_date", "user_id", "date"),
        Index("ix_transactions_account_date", "account_id", "date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="RESTRICT"), index=True)
    # Comisión de una transferencia: se borra junto con ella.
    transfer_id: Mapped[int | None] = mapped_column(ForeignKey("transfers.id", ondelete="CASCADE"), nullable=True)
    # Cuota de una compra en cuotas: se borra junto con el plan.
    installment_plan_id: Mapped[int | None] = mapped_column(
        ForeignKey("installment_plans.id", ondelete="CASCADE"), nullable=True, index=True
    )
    installment_number: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    installment_count: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    is_refund: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    original_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    original_currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    exchange_rate: Mapped[Decimal | None] = mapped_column(Numeric(18, 8), nullable=True)
    # Tarifa internacional (IOF) de una compra en otra moneda: se borra junto con la compra.
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("transactions.id", ondelete="CASCADE"), nullable=True, index=True
    )
    type: Mapped[str] = mapped_column(String(7))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    description: Mapped[str] = mapped_column(String(255), default="")
    date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    category: Mapped[CategoryModel | None] = relationship()
    account: Mapped[AccountModel] = relationship()
