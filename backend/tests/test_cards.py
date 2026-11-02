from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.application.accounts import AccountData, CreateAccount, UpdateAccount
from app.application.cards import (
    CardData,
    CreateCreditCard,
    DeleteCreditCard,
    GetCreditCard,
    GetStatements,
    ListCreditCards,
    UpdateCreditCard,
)
from app.application.dashboard import GetSummary
from app.application.rates import CurrencyConverter
from app.application.transactions import CreateTransaction, TransactionData
from app.application.transfers import CreateTransfer, TransferData
from app.domain.entities import User
from app.domain.exceptions import (
    AccountCurrencyLocked,
    AccountHasMovements,
    CardNotFound,
    InvalidCardDays,
    InvalidLast4,
    PaymentAccountIsCard,
)

from .fakes import FakeRateProvider, FakeUnitOfWork, Store

D = Decimal
TODAY = date.today()


@pytest.fixture
def env():
    store = Store()
    uow = FakeUnitOfWork(store)
    factory = lambda: uow  # noqa: E731
    user = User(id=1, name="Ana", email="ana@example.com", password_hash="x", currency="BRL", language="es")
    bank = CreateAccount(factory).execute(1, AccountData(name="Itaú", currency="BRL", initial_balance=D("3000")))
    return store, factory, user, bank


def card_data(**overrides):
    values = dict(
        name="Nubank",
        currency="BRL",
        network="mastercard",
        credit_limit=D("5000"),
        closing_day=3,
        due_day=10,
        institution="br-nubank",
        last4="1234",
    )
    values.update(overrides)
    return CardData(**values)


def expense(factory, account_id, amount, day=TODAY):
    return CreateTransaction(factory).execute(
        1, TransactionData(type="expense", amount=D(amount), date=day, account_id=account_id)
    )


def test_create_card_is_an_account_with_its_configuration(env):
    _, factory, _, bank = env
    overview = CreateCreditCard(factory).execute(1, card_data(payment_account_id=bank.id))
    card = overview.account
    assert card.kind == "credit_card" and card.is_card
    assert (card.card.last4, card.card.closing_day, card.card.payment_account_id) == ("1234", 3, bank.id)
    assert (overview.debt, overview.available, overview.next_due) == (D("0"), D("5000"), None)
    assert overview.current.status == "open"


def test_card_rejects_invalid_configuration(env):
    _, factory, _, _ = env
    with pytest.raises(InvalidCardDays):
        CreateCreditCard(factory).execute(1, card_data(closing_day=32))
    with pytest.raises(InvalidLast4):
        CreateCreditCard(factory).execute(1, card_data(last4="41111111"))


def test_payment_account_cannot_be_another_card(env):
    _, factory, _, _ = env
    first = CreateCreditCard(factory).execute(1, card_data()).account
    with pytest.raises(PaymentAccountIsCard):
        CreateCreditCard(factory).execute(1, card_data(name="Inter", payment_account_id=first.id))


def test_purchase_increases_debt_and_counts_once_when_paid(env):
    _, factory, user, bank = env
    card = CreateCreditCard(factory).execute(1, card_data(payment_account_id=bank.id)).account
    expense(factory, card.id, "200")

    overview = GetCreditCard(factory).execute(1, card.id)
    assert (overview.account.balance, overview.debt, overview.available) == (D("-200"), D("200"), D("4800"))

    # Pagar la factura es una transferencia: baja la cuenta y la deuda, pero no es otro gasto.
    CreateTransfer(factory).execute(user, TransferData(bank.id, card.id, D("200"), TODAY))
    converter = CurrencyConverter(factory, FakeRateProvider({"USD": D("1"), "BRL": D("5.5")}))
    summary = GetSummary(factory, converter).execute(user)
    assert summary.expense == D("200")
    assert summary.total_balance == D("2800")
    assert GetCreditCard(factory).execute(1, card.id).debt == D("0")


def test_debt_counts_in_net_worth(env):
    _, factory, user, _ = env
    card = CreateCreditCard(factory).execute(1, card_data()).account
    expense(factory, card.id, "450.50")
    converter = CurrencyConverter(factory, FakeRateProvider({"USD": D("1"), "BRL": D("5.5")}))
    summary = GetSummary(factory, converter).execute(user)
    assert summary.total_balance == D("3000") - D("450.50")
    (reminder,) = summary.cards
    assert reminder.account.id == card.id and reminder.debt == D("450.50")


def test_statements_and_next_due(env):
    _, factory, user, bank = env
    card = CreateCreditCard(factory).execute(1, card_data()).account
    expense(factory, card.id, "100", date(2026, 1, 20))  # cierra 03/02, vence 10/02
    expense(factory, card.id, "40", date(2026, 2, 15))  # cierra 03/03, vence 10/03
    on = date(2026, 3, 5)

    feb, mar, current = GetStatements(factory).execute(1, card.id, today=on)
    assert [s.status for s in (feb, mar, current)] == ["overdue", "closed", "open"]

    overview = GetCreditCard(factory).execute(1, card.id, today=on)
    assert overview.next_due.month == "2026-02"

    CreateTransfer(factory).execute(user, TransferData(bank.id, card.id, D("100"), on))
    overview = GetCreditCard(factory).execute(1, card.id, today=on)
    assert (overview.next_due.month, overview.next_due.pending) == ("2026-03", D("40"))


def test_money_taken_out_of_the_card_is_a_charge(env):
    _, factory, user, bank = env
    card = CreateCreditCard(factory).execute(1, card_data()).account
    CreateTransfer(factory).execute(user, TransferData(card.id, bank.id, D("300"), TODAY))
    overview = GetCreditCard(factory).execute(1, card.id)
    assert (overview.debt, overview.current.charges) == (D("300"), D("300"))


def test_update_card_keeps_it_a_card(env):
    _, factory, _, _ = env
    card = CreateCreditCard(factory).execute(1, card_data()).account
    updated = UpdateCreditCard(factory).execute(1, card.id, card_data(credit_limit=D("8000"), due_day=12)).account
    assert (updated.card.credit_limit, updated.card.due_day) == (D("8000"), 12)

    # Editarla como cuenta no la convierte en una cuenta corriente ni pierde su configuración.
    renamed = UpdateAccount(factory).execute(1, card.id, AccountData(name="Nu", currency="BRL", kind="checking"))
    assert renamed.kind == "credit_card" and renamed.card.credit_limit == D("8000")


def test_card_currency_is_locked_once_it_has_movements(env):
    _, factory, _, _ = env
    card = CreateCreditCard(factory).execute(1, card_data()).account
    expense(factory, card.id, "10")
    with pytest.raises(AccountCurrencyLocked):
        UpdateCreditCard(factory).execute(1, card.id, card_data(currency="USD"))


def test_delete_card_only_without_movements(env):
    _, factory, _, _ = env
    card = CreateCreditCard(factory).execute(1, card_data()).account
    expense(factory, card.id, "10")
    with pytest.raises(AccountHasMovements):
        DeleteCreditCard(factory).execute(1, card.id)
    empty = CreateCreditCard(factory).execute(1, card_data(name="Inter")).account
    DeleteCreditCard(factory).execute(1, empty.id)
    assert [o.account.name for o in ListCreditCards(factory).execute(1)] == ["Nubank"]


def test_regular_account_is_not_a_card(env):
    _, factory, _, bank = env
    with pytest.raises(CardNotFound):
        GetCreditCard(factory).execute(1, bank.id)
    assert ListCreditCards(factory).execute(1) == []


def test_archived_card_with_debt_still_counts_in_net_worth(env):
    _, factory, user, _ = env
    card = CreateCreditCard(factory).execute(1, card_data()).account
    expense(factory, card.id, "100", TODAY - timedelta(days=1))
    UpdateCreditCard(factory).execute(1, card.id, card_data(archived=True))
    converter = CurrencyConverter(factory, FakeRateProvider({"USD": D("1"), "BRL": D("5.5")}))
    summary = GetSummary(factory, converter).execute(user)
    assert summary.total_balance == D("2900") and summary.cards == []
