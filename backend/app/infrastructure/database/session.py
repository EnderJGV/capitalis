from pathlib import Path

from sqlalchemy import create_engine, inspect, make_url, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool

from ..config import settings

#: Puerto del transaction pooler de Supabase (Supavisor), el indicado para funciones serverless.
TRANSACTION_POOLER_PORT = 6543


def engine_options(url: str) -> dict:
    """Opciones del engine según a dónde se conecta.

    Con el transaction pooler cada transacción puede ir a otra conexión del servidor: el pooler
    ya reparte las conexiones (sin pool propio, NullPool) y no admite prepared statements
    (psycopg los usa tras 5 ejecuciones iguales; `prepare_threshold=None` los desactiva).
    """
    if make_url(url).port == TRANSACTION_POOLER_PORT:
        return {"poolclass": NullPool, "connect_args": {"prepare_threshold": None}}
    return {"pool_pre_ping": True}


engine = create_engine(settings.database_url, **engine_options(settings.database_url))
SessionLocal = sessionmaker(bind=engine, autoflush=False)

BACKEND_DIR = Path(__file__).resolve().parents[3]


class Base(DeclarativeBase):
    pass


def create_tables() -> None:
    """Lleva la base de datos a la última versión con Alembic (`alembic upgrade head`)."""
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))

    tables = set(inspect(engine).get_table_names())
    if "users" in tables and "alembic_version" not in tables:
        # Base creada antes de usar Alembic: completa las columnas que agregaban las migraciones
        # caseras anteriores y la marca con el esquema inicial, sin volver a crearlo.
        _legacy_columns()
        command.stamp(cfg, "0001")
    command.upgrade(cfg, "head")


def _legacy_columns() -> None:
    from ...domain.defaults import DEFAULT_CATEGORIES

    columns = {table: {c["name"] for c in inspect(engine).get_columns(table)} for table in ("categories", "users")}
    with engine.begin() as conn:
        if "icon" not in columns["categories"]:
            conn.execute(text("ALTER TABLE categories ADD COLUMN icon VARCHAR(16) NOT NULL DEFAULT ''"))
            # Las categorías por defecto que ya existen reciben su emoji.
            for name, type_, _color, icon in DEFAULT_CATEGORIES:
                conn.execute(
                    text("UPDATE categories SET icon = :icon WHERE name = :name AND type = :type AND icon = ''"),
                    {"icon": icon, "name": name, "type": type_},
                )
        if "language" not in columns["users"]:
            conn.execute(text("ALTER TABLE users ADD COLUMN language VARCHAR(5) NOT NULL DEFAULT 'es'"))
