"""Tarjetas de crédito, compras en cuotas y compras en otra moneda.

- credit_cards: configuración de las cuentas con kind = 'credit_card' (red, últimos 4 dígitos,
  límite, días de cierre y vencimiento, cuenta de pago). Nunca se guarda el número completo.
- installment_plans: compras en cuotas; cada cuota es un movimiento en su mes.
- transactions: cuota (plan, número, total), reembolso, monto/moneda originales y tipo de cambio,
  y parent_id para la tarifa internacional enlazada a una compra.

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-02
"""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

NEW_TRANSACTION_COLUMNS = (
    "installment_plan_id",
    "installment_number",
    "installment_count",
    "is_refund",
    "original_amount",
    "original_currency",
    "exchange_rate",
    "parent_id",
)


def upgrade() -> None:
    op.create_table(
        "credit_cards",
        sa.Column("account_id", sa.Integer, sa.ForeignKey("accounts.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("network", sa.String(12), nullable=False),
        sa.Column("last4", sa.String(4), nullable=True),
        sa.Column("credit_limit", sa.Numeric(14, 2), nullable=False),
        sa.Column("closing_day", sa.SmallInteger, nullable=False),
        sa.Column("due_day", sa.SmallInteger, nullable=False),
        sa.Column("payment_account_id", sa.Integer, sa.ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("closing_day BETWEEN 1 AND 31 AND due_day BETWEEN 1 AND 31", name="ck_credit_cards_days"),
        sa.CheckConstraint("credit_limit >= 0", name="ck_credit_cards_limit_not_negative"),
    )

    op.create_table(
        "installment_plans",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", sa.Integer, sa.ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("category_id", sa.Integer, sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("description", sa.String(255), nullable=False, server_default=""),
        sa.Column("total_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("installments", sa.SmallInteger, nullable=False),
        sa.Column("purchase_date", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("installments BETWEEN 2 AND 48", name="ck_installment_plans_count"),
        sa.CheckConstraint("total_amount > 0", name="ck_installment_plans_total_positive"),
    )
    op.create_index("ix_installment_plans_user_id", "installment_plans", ["user_id"])

    op.add_column("transactions", sa.Column("installment_plan_id", sa.Integer, nullable=True))
    op.add_column("transactions", sa.Column("installment_number", sa.SmallInteger, nullable=True))
    op.add_column("transactions", sa.Column("installment_count", sa.SmallInteger, nullable=True))
    op.add_column("transactions", sa.Column("is_refund", sa.Boolean, nullable=False, server_default=sa.false()))
    op.add_column("transactions", sa.Column("original_amount", sa.Numeric(14, 2), nullable=True))
    op.add_column("transactions", sa.Column("original_currency", sa.String(3), nullable=True))
    op.add_column("transactions", sa.Column("exchange_rate", sa.Numeric(18, 8), nullable=True))
    op.add_column("transactions", sa.Column("parent_id", sa.Integer, nullable=True))
    op.create_foreign_key(
        "fk_transactions_installment_plan",
        "transactions",
        "installment_plans",
        ["installment_plan_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_transactions_parent", "transactions", "transactions", ["parent_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index("ix_transactions_installment_plan_id", "transactions", ["installment_plan_id"])
    op.create_index("ix_transactions_parent_id", "transactions", ["parent_id"])
    op.create_index("ix_transactions_account_date", "transactions", ["account_id", "date"])


def downgrade() -> None:
    op.drop_index("ix_transactions_account_date", table_name="transactions")
    op.drop_index("ix_transactions_parent_id", table_name="transactions")
    op.drop_index("ix_transactions_installment_plan_id", table_name="transactions")
    op.drop_constraint("fk_transactions_parent", "transactions", type_="foreignkey")
    op.drop_constraint("fk_transactions_installment_plan", "transactions", type_="foreignkey")
    for column in reversed(NEW_TRANSACTION_COLUMNS):
        op.drop_column("transactions", column)
    op.drop_index("ix_installment_plans_user_id", table_name="installment_plans")
    op.drop_table("installment_plans")
    op.drop_table("credit_cards")
