"""Composition root: the only place that wires concrete infrastructure into use cases."""

from .application.accounts import CreateAccount, DeleteAccount, GetAccount, ListAccounts, UpdateAccount
from .application.auth import AuthenticateUser, LoginUser, RegisterUser, UpdateProfile
from .application.cards import (
    CreateCreditCard,
    DeleteCreditCard,
    GetCreditCard,
    GetStatements,
    ListCreditCards,
    UpdateCreditCard,
)
from .application.categories import CreateCategory, DeleteCategory, ListCategories, UpdateCategory
from .application.dashboard import GetSummary
from .application.rates import CurrencyConverter, GetRate
from .application.transactions import CreateTransaction, DeleteTransaction, ListTransactions, UpdateTransaction
from .application.transfers import CreateTransfer, DeleteTransfer, ListTransfers, UpdateTransfer
from .infrastructure.config import settings
from .infrastructure.database.session import SessionLocal
from .infrastructure.database.unit_of_work import SqlAlchemyUnitOfWork
from .infrastructure.exchange_rates import CurrencyApiRateProvider
from .infrastructure.security import BcryptPasswordHasher, JwtTokenService


class Container:
    def __init__(self):
        def uow_factory():
            return SqlAlchemyUnitOfWork(SessionLocal)

        hasher = BcryptPasswordHasher()
        tokens = JwtTokenService(settings.jwt_secret, settings.jwt_expire_minutes)
        converter = CurrencyConverter(uow_factory, CurrencyApiRateProvider())

        self.register_user = RegisterUser(uow_factory, hasher, tokens)
        self.login_user = LoginUser(uow_factory, hasher, tokens)
        self.authenticate_user = AuthenticateUser(uow_factory, tokens)
        self.update_profile = UpdateProfile(uow_factory)

        self.list_categories = ListCategories(uow_factory)
        self.create_category = CreateCategory(uow_factory)
        self.update_category = UpdateCategory(uow_factory)
        self.delete_category = DeleteCategory(uow_factory)

        self.list_accounts = ListAccounts(uow_factory, converter)
        self.get_account = GetAccount(uow_factory)
        self.create_account = CreateAccount(uow_factory)
        self.update_account = UpdateAccount(uow_factory)
        self.delete_account = DeleteAccount(uow_factory)

        self.list_cards = ListCreditCards(uow_factory)
        self.get_card = GetCreditCard(uow_factory)
        self.get_statements = GetStatements(uow_factory)
        self.create_card = CreateCreditCard(uow_factory)
        self.update_card = UpdateCreditCard(uow_factory)
        self.delete_card = DeleteCreditCard(uow_factory)

        self.list_transfers = ListTransfers(uow_factory)
        self.create_transfer = CreateTransfer(uow_factory)
        self.update_transfer = UpdateTransfer(uow_factory)
        self.delete_transfer = DeleteTransfer(uow_factory)

        self.get_rate = GetRate(converter)

        self.list_transactions = ListTransactions(uow_factory)
        self.create_transaction = CreateTransaction(uow_factory)
        self.update_transaction = UpdateTransaction(uow_factory)
        self.delete_transaction = DeleteTransaction(uow_factory)

        self.get_summary = GetSummary(uow_factory, converter)
