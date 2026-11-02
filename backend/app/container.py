"""Composition root: the only place that wires concrete infrastructure into use cases."""

from .application.auth import AuthenticateUser, LoginUser, RegisterUser, UpdateProfile
from .application.categories import CreateCategory, DeleteCategory, ListCategories, UpdateCategory
from .application.dashboard import GetSummary
from .application.transactions import CreateTransaction, DeleteTransaction, ListTransactions, UpdateTransaction
from .infrastructure.config import settings
from .infrastructure.database.session import SessionLocal
from .infrastructure.database.unit_of_work import SqlAlchemyUnitOfWork
from .infrastructure.security import BcryptPasswordHasher, JwtTokenService


class Container:
    def __init__(self):
        def uow_factory():
            return SqlAlchemyUnitOfWork(SessionLocal)

        hasher = BcryptPasswordHasher()
        tokens = JwtTokenService(settings.jwt_secret, settings.jwt_expire_minutes)

        self.register_user = RegisterUser(uow_factory, hasher, tokens)
        self.login_user = LoginUser(uow_factory, hasher, tokens)
        self.authenticate_user = AuthenticateUser(uow_factory, tokens)
        self.update_profile = UpdateProfile(uow_factory)

        self.list_categories = ListCategories(uow_factory)
        self.create_category = CreateCategory(uow_factory)
        self.update_category = UpdateCategory(uow_factory)
        self.delete_category = DeleteCategory(uow_factory)

        self.list_transactions = ListTransactions(uow_factory)
        self.create_transaction = CreateTransaction(uow_factory)
        self.update_transaction = UpdateTransaction(uow_factory)
        self.delete_transaction = DeleteTransaction(uow_factory)

        self.get_summary = GetSummary(uow_factory)
