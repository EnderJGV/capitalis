from datetime import date
from decimal import Decimal

import pytest

from app.application.accounts import AccountData, CreateAccount, DeleteAccount, UpdateAccount
from app.application.dashboard import GetSummary
from app.application.rates import CurrencyConverter, GetRate
from app.application.transactions import CreateTransaction, DeleteTransaction, TransactionData
from app.application.transfers import CreateTransfer, DeleteTransfer, TransferData, UpdateTransfer
from app.domain.entities import Transfer, User
from app.domain.exceptions import (
    AccountCurrencyLocked,
    AccountHasMovements,
    AccountRequired,
    InvalidAmount,
    InvalidFee,
    RateUnavailable,
    SameAccountTransfer,
    TransferFeeLocked,
)

from .fakes import FakeRateProvider, FakeUnitOfWork, Store

D = Decimal
TODAY = date.today()
# 1 USD = 5,50 BRL = 0,92 EUR
RATES = {"USD": D("1"), "BRL": D("5.5"), "EUR": D("0.92")}


@pytest.fixture
def env():
    store = Store()
    uow = FakeUnitOfWork(store)
    factory = lambda: uow  # noqa: E731
    user = User(id=1, name="Ana", email="ana@example.com", password_hash="x", currency="BRL", language="es")
    provider = FakeRateProvider(RATES)
    return store, factory, user, provider


def make_account(factory, name, currency, initial="0"):
    return CreateAccount(factory).execute(1, AccountData(name=name, currency=currency, initial_balance=D(initial)))


# --- Entidad Transfer -------------------------------------------------------------------------


def transfer(**overrides):
    values = dict(
        id=None, user_id=1, from_account_id=1, to_account_id=2, amount=D("10"), received_amount=D("10"),
        rate=D("1"), date=TODAY,
    )
    values.update(overrides)
    return Transfer(**values)


def test_transfer_rejects_same_account():
    with pytest.raises(SameAccountTransfer):
        transfer(to_account_id=1)


def test_transfer_rejects_non_positive_amounts():
    with pytest.raises(InvalidAmount):
        transfer(amount=D("0"))
    with pytest.raises(InvalidAmount):
        transfer(received_amount=D("-1"))


def test_transfer_rejects_negative_fee():
    with pytest.raises(InvalidFee):
        transfer(fee=D("-0.01"))


# --- Movimientos y cuentas --------------------------------------------------------------------


def test_transaction_requires_an_account(env):
    _, factory, _, _ = env
    with pytest.raises(AccountRequired):
        CreateTransaction(factory).execute(1, TransactionData(type="income", amount=D("10"), date=TODAY))


def test_account_with_movements_cannot_be_deleted_nor_change_currency(env):
    _, factory, _, _ = env
    itau = make_account(factory, "Itaú", "BRL")
    CreateTransaction(factory).execute(
        1, TransactionData(type="income", amount=D("10"), date=TODAY, account_id=itau.id)
    )
    with pytest.raises(AccountHasMovements):
        DeleteAccount(factory).execute(1, itau.id)
    with pytest.raises(AccountCurrencyLocked):
        UpdateAccount(factory).execute(1, itau.id, AccountData(name="Itaú", currency="USD"))


# --- Transferencias (Usuario 1 y Usuario 2) ---------------------------------------------------


def test_cross_currency_transfer_with_fee_moves_balances_and_records_fee(env):
    store, factory, user, _ = env
    itau = make_account(factory, "Itaú", "BRL", "5000")
    wise = make_account(factory, "Wise", "USD")

    created = CreateTransfer(factory).execute(
        user,
        TransferData(
            from_account_id=itau.id, to_account_id=wise.id, amount=D("1000"), received_amount=D("181.82"),
            fee=D("15"), date=TODAY,
        ),
    )

    assert created.rate == D("0.18182000")
    balances = {a.name: a.balance for a in FakeUnitOfWork(store).accounts.list(1)}
    assert balances == {"Itaú": D("3985"), "Wise": D("181.82")}

    fee = store.transactions[next(iter(store.transactions))]
    assert (fee.type, fee.amount, fee.account_id, fee.transfer_id) == ("expense", D("15"), itau.id, created.id)
    assert store.categories[fee.category_id].name == "Comisiones bancarias"

    # La comisión se edita desde la transferencia, no como movimiento suelto.
    with pytest.raises(TransferFeeLocked):
        DeleteTransaction(factory).execute(1, fee.id)


def test_cross_currency_transfer_requires_received_amount(env):
    _, factory, user, _ = env
    itau = make_account(factory, "Itaú", "BRL")
    wise = make_account(factory, "Wise", "USD")
    with pytest.raises(InvalidAmount):
        CreateTransfer(factory).execute(
            user, TransferData(from_account_id=itau.id, to_account_id=wise.id, amount=D("100"), date=TODAY)
        )


def test_same_currency_transfer_forces_received_equal_to_sent(env):
    store, factory, user, _ = env
    nubank = make_account(factory, "Nubank", "BRL", "1000")
    itau = make_account(factory, "Itaú", "BRL")
    created = CreateTransfer(factory).execute(
        user,
        TransferData(
            from_account_id=nubank.id, to_account_id=itau.id, amount=D("300"), received_amount=D("999"), date=TODAY
        ),
    )
    assert (created.received_amount, created.rate) == (D("300"), D("1"))
    assert not store.transactions  # sin comisión no hay gasto


def test_updating_fee_to_zero_removes_it_and_deleting_transfer_removes_everything(env):
    store, factory, user, _ = env
    nubank = make_account(factory, "Nubank", "BRL", "1000")
    itau = make_account(factory, "Itaú", "BRL")
    data = TransferData(from_account_id=nubank.id, to_account_id=itau.id, amount=D("100"), fee=D("2"), date=TODAY)
    created = CreateTransfer(factory).execute(user, data)
    assert len(store.transactions) == 1

    UpdateTransfer(factory).execute(
        user, created.id, TransferData(from_account_id=nubank.id, to_account_id=itau.id, amount=D("100"), date=TODAY)
    )
    assert not store.transactions

    DeleteTransfer(factory).execute(1, created.id)
    assert not store.transfers


# --- Cotizaciones y resumen -------------------------------------------------------------------


def test_cross_rate_and_cache(env):
    store, factory, _, provider = env
    converter = CurrencyConverter(factory, provider)
    rate, _ = GetRate(converter).execute("BRL", "EUR")
    assert rate == (D("0.92") / D("5.5")).quantize(D("0.00000001"))
    converter.rate("USD", "BRL", TODAY)
    assert provider.calls == 1  # el segundo pedido sale de la caché
    assert TODAY in store.rates


def test_rate_unavailable_without_network():
    store = Store()
    uow = FakeUnitOfWork(store)
    converter = CurrencyConverter(lambda: uow, FakeRateProvider(None))
    with pytest.raises(RateUnavailable):
        GetRate(converter).execute("USD", "BRL")


def test_summary_converts_to_main_currency(env):
    _, factory, user, provider = env
    itau = make_account(factory, "Itaú", "BRL", "100")
    wise = make_account(factory, "Wise", "USD", "10")
    create = CreateTransaction(factory)
    create.execute(1, TransactionData(type="income", amount=D("50"), date=TODAY, account_id=itau.id))
    create.execute(1, TransactionData(type="expense", amount=D("2"), date=TODAY, account_id=wise.id))

    summary = GetSummary(factory, CurrencyConverter(factory, provider)).execute(user)

    assert summary.currency == "BRL" and summary.approximate
    assert summary.income == D("50")
    assert summary.expense == D("11.00")  # US$ 2 × 5,5
    # Saldo total: Itaú R$ 150 + Wise US$ 8 × 5,5 = R$ 44
    assert summary.total_balance == D("194.00")
    assert {a.account.name: a.converted_balance for a in summary.accounts} == {"Itaú": D("150"), "Wise": D("44.00")}
