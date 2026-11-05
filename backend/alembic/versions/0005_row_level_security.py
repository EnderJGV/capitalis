"""Activa Row Level Security en todas las tablas.

En Supabase, las tablas del schema `public` quedan expuestas por la Data API a los roles `anon` y
`authenticated`. La app nunca usa esa API: el backend se conecta como el dueño de las tablas, que
ignora RLS. Con RLS activo y sin políticas, la API no puede leer ni escribir nada; además se quitan
los permisos de esos roles si existen.

En un Postgres local (sin esos roles) solo se activa RLS, sin efecto para el dueño de las tablas.

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-04
"""

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

TABLES = (
    "users",
    "categories",
    "accounts",
    "credit_cards",
    "installment_plans",
    "transfers",
    "exchange_rates",
    "transactions",
    "goals",
    "goal_contributions",
    "alembic_version",
)


def upgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        DO $$
        DECLARE r text;
        BEGIN
            FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
                    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
                    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
                    -- Las tablas que creen migraciones futuras tampoco quedan expuestas.
                    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
                    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
                END IF;
            END LOOP;
        END $$;
        """
    )


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
