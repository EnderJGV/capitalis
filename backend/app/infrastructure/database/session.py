from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from ..config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def create_tables() -> None:
    from . import models  # noqa: F401  (registers the tables on Base.metadata)

    Base.metadata.create_all(engine)
    _add_category_icon_column()
    _add_user_language_column()


def _add_category_icon_column() -> None:
    """Migración mínima mientras no haya Alembic: agrega categories.icon a bases ya creadas."""
    columns = {c["name"] for c in inspect(engine).get_columns("categories")}
    if "icon" in columns:
        return
    from ...domain.defaults import DEFAULT_CATEGORIES

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE categories ADD COLUMN icon VARCHAR(16) NOT NULL DEFAULT ''"))
        # Las categorías por defecto que ya existen reciben su emoji.
        for name, type_, _color, icon in DEFAULT_CATEGORIES:
            conn.execute(
                text("UPDATE categories SET icon = :icon WHERE name = :name AND type = :type AND icon = ''"),
                {"icon": icon, "name": name, "type": type_},
            )


def _add_user_language_column() -> None:
    """Migración mínima mientras no haya Alembic: agrega users.language a bases ya creadas."""
    columns = {c["name"] for c in inspect(engine).get_columns("users")}
    if "language" in columns:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN language VARCHAR(5) NOT NULL DEFAULT 'es'"))
