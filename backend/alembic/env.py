from alembic import context
from sqlalchemy import create_engine, pool

from app.infrastructure.config import settings
from app.infrastructure.database import models  # noqa: F401  (registra las tablas en Base.metadata)
from app.infrastructure.database.session import Base, engine_options

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=config.get_main_option("sqlalchemy.url"), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = config.attributes.get("connection")
    if connectable is not None:
        context.configure(connection=connectable, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
        return

    options = {**engine_options(settings.database_url), "poolclass": pool.NullPool}
    options.pop("pool_pre_ping", None)
    engine = create_engine(settings.database_url, **options)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
