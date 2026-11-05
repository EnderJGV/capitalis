"""Índices en las claves foráneas que no tenían uno.

Postgres no indexa las claves foráneas solo. Sin índice, borrar una cuenta, una categoría o una
transferencia obliga a recorrer toda la tabla que la referencia (ON DELETE RESTRICT / SET NULL /
CASCADE). Lo señala el Performance Advisor de Supabase (unindexed_foreign_keys).

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-04
"""

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None

INDEXES = (
    ("credit_cards", "payment_account_id"),
    ("installment_plans", "account_id"),
    ("installment_plans", "category_id"),
    ("transfers", "from_account_id"),
    ("transfers", "to_account_id"),
    ("transactions", "category_id"),
    ("transactions", "transfer_id"),
    ("goal_contributions", "user_id"),
    ("goal_contributions", "account_id"),
)


def upgrade() -> None:
    for table, column in INDEXES:
        op.create_index(f"ix_{table}_{column}", table, [column])


def downgrade() -> None:
    for table, column in reversed(INDEXES):
        op.drop_index(f"ix_{table}_{column}", table_name=table)
