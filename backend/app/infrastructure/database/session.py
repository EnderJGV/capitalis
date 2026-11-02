from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from ..config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def create_tables() -> None:
    from . import models  # noqa: F401  (registers the tables on Base.metadata)

    Base.metadata.create_all(engine)
