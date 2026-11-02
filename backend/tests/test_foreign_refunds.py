from datetime import date
from decimal import Decimal

import pytest

from app.application.accounts import AccountData, CreateAccount
from app.application.cards import CardData, CreateCreditCard, GetCreditCard
from app.application.dashboard import GetSummary
from app.application.rates import CurrencyConverter
from app.application.transactions import CreateTransaction, DeleteTransaction, TransactionData, UpdateTransaction
from app.domain.entities import Category, User
from app.domain.exceptions import CategoryTypeMismatch, ForeignFeeLocked, RefundOnlyOnCards

from .fakes import FakeRateProvider, FakeUnitOfWork, Store

D = Decimal
TODAY = date.today()


@pytest.fixture
def env():
    store = Store()
    uow = FakeUnitOfWork(store)
    factory = lambda: uow  # noqa: E731
    user = User(id=1, name="Ana", email="ana@example.com", password_hash="x", currency="BRL", language="pt")
    store.users[1] = user
    food = uow.categories.add(Category(id=None, user_id=1, name="Alimentação", type="expense"))
    salary = uow.categories.add(Category(id=None, user_id=1, name="Salário", type="income"))
    bank = CreateAccount(factory).execute(1, AccountData(name="Itaú", currency="BRL"))
    card = CreateCreditCard(factory).execute(
        1, CardData(name="Nubank", currency="BRL", network="visa", credit_limit=D("5000"), closing_day=3, due_day=10)
    ).account
    return store, factory, user, bank, card, food, salary


def summary(factory, user):
    converter = CurrencyConverter(factory, FakeRateProvider({"USD": D("1"), "BRL": D("5.5")}))
    return GetSummary(factory, converter).execute(user)


def foreign(card_id, percent="3.5", amount="275", original="50", **overrides):
    values = dict(
        type="expense", amount=D(amount), date=TODAY, description="Amazon", account_id=card_id,
        original_amount=D(original), original_currency="USD", foreign_fee_percent=D(percent) if percent else None,
    )
    values.update(overrides)
    return TransactionData(**values)


def fee_of(store, purchase_id):
    return next((t for t in store.transactions.values() if t.parent_id == purchase_id), None)


# --- Compras en otra moneda -------------------------------------------------------------------


def test_foreign_purchase_keeps_original_amount_and_links_the_fee(env):
    store, factory, _, _, card, _, _ = env
    purchase = CreateTransaction(factory).execute(1, foreign(card.id))

    assert (purchase.original_amount, purchase.original_currency, purchase.exchange_rate) == (D("50"), "USD", D("5.5"))
    fee = fee_of(store, purchase.id)
    assert fee.amount == D("9.63") and fee.account_id == card.id and fee.type == "expense"
    assert store.categories[fee.category_id].name == "Tarifas bancárias"  # en el idioma del usuario
    assert purchase.foreign_fee == D("9.63")
    assert GetCreditCard(factory).execute(1, card.id).debt == D("284.63")


def test_editing_the_purchase_recomputes_or_removes_the_fee(env):
    store, factory, _, _, card, _, _ = env
    purchase = CreateTransaction(factory).execute(1, foreign(card.id))

    UpdateTransaction(factory).execute(1, purchase.id, foreign(card.id, percent="6.38", amount="300", original="54.5"))
    assert fee_of(store, purchase.id).amount == D("19.14")

    UpdateTransaction(factory).execute(1, purchase.id, foreign(card.id, percent=None))
    assert fee_of(store, purchase.id) is None


def test_the_fee_is_edited_only_from_the_purchase(env):
    store, factory, _, _, card, _, _ = env
    purchase = CreateTransaction(factory).execute(1, foreign(card.id))
    fee = fee_of(store, purchase.id)
    with pytest.raises(ForeignFeeLocked):
        UpdateTransaction(factory).execute(1, fee.id, TransactionData(type="expense", amount=D("1"), date=TODAY, account_id=card.id))
    with pytest.raises(ForeignFeeLocked):
        DeleteTransaction(factory).execute(1, fee.id)

    DeleteTransaction(factory).execute(1, purchase.id)
    assert store.transactions == {}


def test_same_currency_is_not_a_foreign_purchase(env):
    store, factory, _, _, card, _, _ = env
    purchase = CreateTransaction(factory).execute(1, foreign(card.id, original_currency="BRL"))
    assert purchase.original_currency is None and purchase.exchange_rate is None
    assert fee_of(store, purchase.id) is None


# --- Reembolsos -------------------------------------------------------------------------------


def test_refund_reduces_its_category_and_is_not_income(env):
    _, factory, user, _, card, food, _ = env
    create = CreateTransaction(factory).execute
    create(1, TransactionData(type="expense", amount=D("200"), date=TODAY, account_id=card.id, category_id=food.id))
    create(1, TransactionData(type="income", amount=D("50"), date=TODAY, account_id=card.id, category_id=food.id, is_refund=True))

    s = summary(factory, user)
    assert (s.income, s.expense) == (D("0"), D("150"))
    assert [(c.name, c.total) for c in s.expenses_by_category] == [("Alimentação", D("150"))]
    assert GetCreditCard(factory).execute(1, card.id).debt == D("150")


def test_refunds_only_on_cards_and_with_an_expense_category(env):
    _, factory, _, bank, card, food, salary = env
    create = CreateTransaction(factory).execute
    with pytest.raises(RefundOnlyOnCards):
        create(1, TransactionData(type="income", amount=D("10"), date=TODAY, account_id=bank.id, is_refund=True))
    with pytest.raises(RefundOnlyOnCards):
        create(1, TransactionData(type="expense", amount=D("10"), date=TODAY, account_id=card.id, is_refund=True))
    with pytest.raises(CategoryTypeMismatch):
        create(1, TransactionData(type="income", amount=D("10"), date=TODAY, account_id=card.id, category_id=salary.id, is_refund=True))
    refund = create(1, TransactionData(type="income", amount=D("10"), date=TODAY, account_id=card.id, category_id=food.id, is_refund=True))
    assert refund.is_refund
