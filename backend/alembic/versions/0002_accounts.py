"""Cuentas, transferencias y cotizaciones.

- accounts: cuentas del usuario, cada una con su moneda e institución.
- transfers: movimientos de dinero entre dos cuentas (con tipo de cambio y comisión).
- exchange_rates: caché diaria de cotizaciones (base USD).
- transactions.account_id: cada movimiento pertenece a una cuenta. Los usuarios que ya tenían
  movimientos reciben una "Cuenta principal" (en su idioma y moneda) a la que se asignan todos.
- transactions.transfer_id: enlaza la comisión de una transferencia con ella.

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-02
"""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

MAIN_ACCOUNT_NAME = {"es": "Cuenta principal", "pt": "Conta principal", "en": "Main account"}


def upgrade() -> None:
    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("institution", sa.String(40), nullable=True),
        sa.Column("name", sa.String(60), nullable=False),
        sa.Column("kind", sa.String(12), nullable=False, server_default="checking"),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("initial_balance", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("archived", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "name", name="uq_accounts_user_name"),
    )
    op.create_index("ix_accounts_user_id", "accounts", ["user_id"])

    op.create_table(
        "transfers",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_account_id", sa.Integer, sa.ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("to_account_id", sa.Integer, sa.ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("received_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("rate", sa.Numeric(18, 8), nullable=False),
        sa.Column("fee", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("description", sa.String(255), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("from_account_id <> to_account_id", name="ck_transfers_distinct_accounts"),
        sa.CheckConstraint("amount > 0 AND received_amount > 0", name="ck_transfers_amounts_positive"),
        sa.CheckConstraint("fee >= 0", name="ck_transfers_fee_not_negative"),
    )
    op.create_index("ix_transfers_user_date", "transfers", ["user_id", "date"])

    op.create_table(
        "exchange_rates",
        sa.Column("date", sa.Date, primary_key=True),
        sa.Column("base", sa.String(3), primary_key=True),
        sa.Column("quote", sa.String(3), primary_key=True),
        sa.Column("rate", sa.Numeric(24, 10), nullable=False),
    )

    op.add_column("transactions", sa.Column("account_id", sa.Integer, nullable=True))
    op.add_column("transactions", sa.Column("transfer_id", sa.Integer, nullable=True))
    op.create_foreign_key(
        "fk_transactions_account", "transactions", "accounts", ["account_id"], ["id"], ondelete="RESTRICT"
    )
    op.create_foreign_key(
        "fk_transactions_transfer", "transactions", "transfers", ["transfer_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index("ix_transactions_account_id", "transactions", ["account_id"])

    # Backfill: una "Cuenta principal" por usuario con movimientos.
    conn = op.get_bind()
    users = conn.execute(
        sa.text("SELECT DISTINCT u.id, u.currency, u.language FROM users u JOIN transactions t ON t.user_id = u.id")
    ).all()
    for user_id, currency, language in users:
        account_id = conn.execute(
            sa.text(
                "INSERT INTO accounts (user_id, name, kind, currency, initial_balance, archived) "
                "VALUES (:user_id, :name, 'checking', :currency, 0, false) RETURNING id"
            ),
            {"user_id": user_id, "name": MAIN_ACCOUNT_NAME.get(language, MAIN_ACCOUNT_NAME["es"]), "currency": currency},
        ).scalar_one()
        conn.execute(
            sa.text("UPDATE transactions SET account_id = :account_id WHERE user_id = :user_id"),
            {"account_id": account_id, "user_id": user_id},
        )

    op.alter_column("transactions", "account_id", nullable=False)


def downgrade() -> None:
    op.drop_index("ix_transactions_account_id", table_name="transactions")
    op.drop_constraint("fk_transactions_transfer", "transactions", type_="foreignkey")
    op.drop_constraint("fk_transactions_account", "transactions", type_="foreignkey")
    op.drop_column("transactions", "transfer_id")
    op.drop_column("transactions", "account_id")
    op.drop_table("exchange_rates")
    op.drop_table("transfers")
    op.drop_table("accounts")
