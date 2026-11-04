"""Objetivos de ahorro y sus aportes virtuales.

- goals: objetivos con meta, moneda, fecha límite opcional y estado.
- goal_contributions: aportes (positivos) y retiros (negativos); no son movimientos ni cambian saldos.

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-03
"""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "goals",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("kind", sa.String(10), nullable=False, server_default="personal"),
        sa.Column("icon", sa.String(16), nullable=False, server_default=""),
        sa.Column("color", sa.String(7), nullable=False, server_default="#3E9A55"),
        sa.Column("target_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("target_date", sa.Date, nullable=True),
        sa.Column("note", sa.String(255), nullable=False, server_default=""),
        sa.Column("status", sa.String(10), nullable=False, server_default="active"),
        sa.Column("completed_on", sa.Date, nullable=True),
        sa.Column("created_on", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("target_amount > 0", name="ck_goals_target_positive"),
    )
    op.create_index("ix_goals_user_status", "goals", ["user_id", "status"])

    op.create_table(
        "goal_contributions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("goal_id", sa.Integer, sa.ForeignKey("goals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", sa.Integer, sa.ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("note", sa.String(255), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("amount <> 0", name="ck_goal_contributions_amount_not_zero"),
    )
    op.create_index("ix_goal_contributions_goal_date", "goal_contributions", ["goal_id", "date"])


def downgrade() -> None:
    op.drop_index("ix_goal_contributions_goal_date", table_name="goal_contributions")
    op.drop_table("goal_contributions")
    op.drop_index("ix_goals_user_status", table_name="goals")
    op.drop_table("goals")
