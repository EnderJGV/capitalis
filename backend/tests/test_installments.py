from datetime import date
from decimal import Decimal

import pytest

from app.application.accounts import AccountData, CreateAccount
from app.application.cards import CardData, CreateCreditCard, GetCreditCard, GetStatements
from app.application.dashboard import GetSummary
from app.application.installments import ListInstallments
from app.application.rates import CurrencyConverter
from app.application.transactions import CreateTransaction, DeleteTransaction, TransactionData, UpdateTransaction
from app.domain.entities import User
from app.domain.exceptions import InstallmentsOnlyOnCards, InvalidInstallments
from app.domain.periods import add_months

from .fakes import FakeRateProvider, FakeUnitOfWork, Store

D = Decimal
TODAY = date.today()


@pytest.fixture
def env():
    store = Store()
    uow = FakeUnitOfWork(store)
    factory = lambda: uow  # noqa: E731
    user = User(id=1, name="Ana", email="ana@example.com", password_hash="x", currency="BRL", language="es")
    bank = CreateAccount(factory).execute(1, AccountData(name="Itaú", currency="BRL"))
    card = CreateCreditCard(factory).execute(
        1, CardData(name="Nubank", currency="BRL", network="visa", credit_limit=D("5000"), closing_day=3, due_day=10)
    ).account
    return store, factory, user, bank, card


def purchase(account_id, amount, installments=None, day=TODAY, type="expense"):
    return TransactionData(
        type=type, amount=D(amount), date=day, description="TV", account_id=account_id, installments=installments
    )


def plan_transactions(store, plan_id):
    return sorted((t for t in store.transactions.values() if t.installment_plan_id == plan_id), key=lambda t: t.date)


def test_purchase_in_installments_creates_one_expense_per_month(env):
    store, factory, _, _, card = env
    first = CreateTransaction(factory).execute(1, purchase(card.id, "1200.05", 12, date(2026, 1, 31)))

    assert first.installment_plan.total_amount == D("1200.05")
    installments = plan_transactions(store, first.installment_plan_id)
    assert [t.installment_number for t in installments] == list(range(1, 13))
    assert installments[0].amount == D("100.05") and {t.amount for t in installments[1:]} == {D("100.00")}
    assert sum(t.amount for t in installments) == D("1200.05")
    assert [t.date for t in installments[:3]] == [date(2026, 1, 31), date(2026, 2, 28), date(2026, 3, 31)]
    assert all(t.installment_count == 12 and t.description == "TV" for t in installments)


def test_installments_split_cents_into_the_first_one(env):
    store, factory, _, _, card = env
    first = CreateTransaction(factory).execute(1, purchase(card.id, "100", 3))
    assert [t.amount for t in plan_transactions(store, first.installment_plan_id)] == [D("33.34"), D("33.33"), D("33.33")]


def test_installments_only_for_card_expenses(env):
    _, factory, _, bank, card = env
    with pytest.raises(InstallmentsOnlyOnCards):
        CreateTransaction(factory).execute(1, purchase(bank.id, "300", 3))
    with pytest.raises(InstallmentsOnlyOnCards):
        CreateTransaction(factory).execute(1, purchase(card.id, "300", 3, type="income"))
    with pytest.raises(InvalidInstallments):
        CreateTransaction(factory).execute(1, purchase(card.id, "300", 49))


def test_each_installment_lands_in_its_own_statement_and_month(env):
    _, factory, user, _, card = env
    CreateTransaction(factory).execute(1, purchase(card.id, "300", 3))

    statements = GetStatements(factory).execute(1, card.id)
    assert [s.total for s in statements] == [D("100"), D("100"), D("100")]
    # Las cuotas futuras ya comprometen el límite…
    assert GetCreditCard(factory).execute(1, card.id).available == D("4700")
    # …pero en el resumen del mes solo cuenta la cuota de este mes.
    converter = CurrencyConverter(factory, FakeRateProvider({"USD": D("1"), "BRL": D("5.5")}))
    assert GetSummary(factory, converter).execute(user).expense == D("100")


def test_editing_any_installment_regenerates_the_whole_purchase(env):
    store, factory, _, _, card = env
    first = CreateTransaction(factory).execute(1, purchase(card.id, "300", 3))
    third = plan_transactions(store, first.installment_plan_id)[2]

    updated = UpdateTransaction(factory).execute(1, third.id, purchase(card.id, "600", 6))
    installments = plan_transactions(store, first.installment_plan_id)
    assert updated.installment_plan_id == first.installment_plan_id
    assert len(installments) == 6 and sum(t.amount for t in installments) == D("600")
    assert len(store.transactions) == 6


def test_installments_back_to_a_single_payment_and_again(env):
    store, factory, _, _, card = env
    first = CreateTransaction(factory).execute(1, purchase(card.id, "300", 3))

    single = UpdateTransaction(factory).execute(1, first.id, purchase(card.id, "280"))
    assert single.installment_plan_id is None and list(store.transactions) == [single.id]
    assert store.plans == {}

    again = UpdateTransaction(factory).execute(1, single.id, purchase(card.id, "280", 2))
    assert [t.amount for t in plan_transactions(store, again.installment_plan_id)] == [D("140"), D("140")]
    assert single.id not in store.transactions


def test_deleting_one_installment_deletes_the_purchase(env):
    store, factory, _, _, card = env
    first = CreateTransaction(factory).execute(1, purchase(card.id, "300", 3))
    DeleteTransaction(factory).execute(1, plan_transactions(store, first.installment_plan_id)[1].id)
    assert store.transactions == {} and store.plans == {}


def test_installments_in_progress(env):
    _, factory, _, _, card = env
    CreateTransaction(factory).execute(1, purchase(card.id, "1200", 12))
    CreateTransaction(factory).execute(1, purchase(card.id, "50", 2, date(2020, 1, 1)))  # ya terminada

    (progress,) = ListInstallments(factory).execute(1, card.id)
    assert (progress.charged, progress.remaining, progress.installment_amount) == (1, D("1100"), D("100"))
    assert progress.next_date == add_months(TODAY, 1)
