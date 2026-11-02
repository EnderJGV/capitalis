from sqlalchemy.orm import Session, sessionmaker

from .repositories import SqlCategoryRepository, SqlReportRepository, SqlTransactionRepository, SqlUserRepository


class SqlAlchemyUnitOfWork:
    session: Session

    def __init__(self, session_factory: sessionmaker):
        self._session_factory = session_factory

    def __enter__(self) -> "SqlAlchemyUnitOfWork":
        self.session = self._session_factory()
        self.users = SqlUserRepository(self.session)
        self.categories = SqlCategoryRepository(self.session)
        self.transactions = SqlTransactionRepository(self.session)
        self.reports = SqlReportRepository(self.session)
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if exc_type:
            self.session.rollback()
        self.session.close()

    def commit(self) -> None:
        self.session.commit()
