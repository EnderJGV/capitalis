from datetime import date
from decimal import Decimal

import pytest

from app.domain.entities import CreditCard, InstallmentPlan
from app.domain.exceptions import (
    InvalidAmount,
    InvalidCardDays,
    InvalidCreditLimit,
    InvalidInstallments,
    InvalidLast4,
)
from app.domain.periods import add_months
from app.domain.statements import (
    build_statements,
    closing_for,
    due_date,
    installment_dates,
    previous_closing,
    split_installments,
)

D = Decimal


# --- Ciclos y vencimientos --------------------------------------------------------------------


def test_closing_day_missing_in_short_month_uses_last_day():
    assert closing_for(date(2026, 2, 10), 31) == date(2026, 2, 28)
    assert closing_for(date(2028, 2, 10), 31) == date(2028, 2, 29)  # bisiesto
    assert closing_for(date(2026, 4, 30), 31) == date(2026, 4, 30)


def test_purchase_on_closing_day_enters_that_statement():
    assert closing_for(date(2026, 3, 3), 3) == date(2026, 3, 3)
    assert closing_for(date(2026, 3, 4), 3) == date(2026, 4, 3)
    assert closing_for(date(2026, 12, 20), 3) == date(2027, 1, 3)


def test_cycle_starts_the_day_after_the_previous_closing():
    assert previous_closing(date(2026, 3, 31), 31) == date(2026, 2, 28)
    assert previous_closing(date(2026, 1, 3), 3) == date(2025, 12, 3)


def test_due_after_closing_day_is_in_the_same_month():
    assert due_date(date(2026, 3, 3), 3, 10) == date(2026, 3, 10)


def test_due_before_or_on_closing_day_is_in_the_next_month():
    assert due_date(date(2026, 3, 28), 28, 5) == date(2026, 4, 5)
    assert due_date(date(2026, 3, 10), 10, 10) == date(2026, 4, 10)
    assert due_date(date(2026, 1, 25), 25, 31) == date(2026, 1, 31)
    assert due_date(date(2026, 1, 31), 31, 31) == date(2026, 2, 28)


# --- Facturas ---------------------------------------------------------------------------------

# Cierra el 3 y vence el 10. Hoy, 8 de marzo: la factura de febrero venció, la de marzo cerró y
# todavía no vence, y la de abril está abierta.
TODAY = date(2026, 3, 8)
MOVEMENTS = [
    (date(2026, 2, 1), D("200.00")),  # factura que cierra el 03/02
    (date(2026, 2, 10), D("100.00")),  # 03/03
    (date(2026, 3, 5), D("50.00")),  # 03/04 (abierta)
]


def statements(movements=MOVEMENTS, payments=(), today=TODAY, **kwargs):
    return build_statements(3, 10, movements, payments, today, **kwargs)


def test_statements_without_payments():
    feb, mar, apr = statements()
    assert (feb.closing_date, feb.due_date, feb.start_date) == (date(2026, 2, 3), date(2026, 2, 10), date(2026, 1, 4))
    assert (feb.status, feb.total, feb.pending) == ("overdue", D("200.00"), D("200.00"))
    assert (mar.status, mar.month) == ("closed", "2026-03")
    assert (apr.status, apr.total) == ("open", D("50.00"))


def test_payments_go_to_the_oldest_statement_first():
    feb, mar, apr = statements(payments=[D("250.00")])
    assert (feb.status, feb.paid) == ("paid", D("200.00"))
    assert (mar.status, mar.paid, mar.pending) == ("partial", D("50.00"), D("50.00"))
    assert (apr.status, apr.paid) == ("open", D("0.00"))


def test_extra_payment_reduces_the_open_statement():
    feb, mar, apr = statements(payments=[D("100.00"), D("300.00")])
    assert feb.status == mar.status == "paid"
    assert (apr.status, apr.paid, apr.pending) == ("open", D("50.00"), D("0.00"))


def test_partial_payment_after_due_date_is_still_overdue():
    feb, *_ = statements(payments=[D("150.00")])
    assert (feb.status, feb.pending) == ("overdue", D("50.00"))


def test_refund_larger_than_charges_leaves_credit_that_pays_other_statements():
    movements = MOVEMENTS + [(date(2026, 3, 6), D("-120.00"))]  # reembolso en la factura abierta
    feb, mar, apr = statements(movements)
    assert (apr.status, apr.total) == ("credit", D("-70.00"))
    assert (feb.paid, feb.pending) == (D("70.00"), D("130.00"))


def test_closed_statement_with_zero_total_is_paid():
    (feb, current) = statements([(date(2026, 2, 1), D("80")), (date(2026, 2, 2), D("-80"))])
    assert (feb.status, feb.total) == ("paid", D("0"))
    assert current.status == "open"


def test_current_statement_appears_even_without_movements():
    (current,) = statements([])
    assert (current.status, current.total, current.closing_date) == ("open", D("0.00"), date(2026, 4, 3))
    assert statements([], include_current=False) == []


def test_future_installments_create_future_statements():
    plan = [(d, D("100.00")) for d in installment_dates(date(2026, 3, 5), 3)]
    apr, may, jun = statements(plan)
    assert [s.status for s in (apr, may, jun)] == ["open", "future", "future"]
    assert [s.closing_date for s in (apr, may, jun)] == [date(2026, 4, 3), date(2026, 5, 3), date(2026, 6, 3)]


def test_debt_matches_the_card_balance():
    """Lo pendiente de todas las facturas menos el saldo a favor es exactamente la deuda de la tarjeta."""
    payments = [D("120.00"), D("75.50")]
    result = statements(payments=payments)
    debt = sum(amount for _, amount in MOVEMENTS) - sum(payments)
    assert sum(s.pending for s in result) == debt


# --- Cuotas -----------------------------------------------------------------------------------


def test_installments_cents_go_in_the_first_one():
    assert split_installments(D("300.03"), 3) == [D("100.01")] * 3
    assert split_installments(D("100.00"), 3) == [D("33.34"), D("33.33"), D("33.33")]
    assert sum(split_installments(D("1234.56"), 12)) == D("1234.56")


def test_installments_count_must_be_between_2_and_48():
    for count in (1, 49):
        with pytest.raises(InvalidInstallments):
            split_installments(D("100"), count)


def test_installments_too_small_are_rejected():
    with pytest.raises(InvalidAmount):
        split_installments(D("0.01"), 2)


def test_installment_dates_keep_the_purchase_day():
    assert installment_dates(date(2026, 1, 31), 3) == [date(2026, 1, 31), date(2026, 2, 28), date(2026, 3, 31)]
    assert add_months(date(2026, 11, 15), 3) == date(2027, 2, 15)


# --- Entidades --------------------------------------------------------------------------------


def card(**overrides):
    values = dict(network="visa", credit_limit=D("5000"), closing_day=3, due_day=10)
    values.update(overrides)
    return CreditCard(**values)


def test_card_days_must_be_valid():
    for days in ({"closing_day": 0}, {"due_day": 32}):
        with pytest.raises(InvalidCardDays):
            card(**days)


def test_card_only_keeps_the_last_four_digits():
    assert card(last4="1234").last4 == "1234"
    for last4 in ("123", "12345", "12a4", "4111111111111111"):
        with pytest.raises(InvalidLast4):
            card(last4=last4)


def test_card_limit_cannot_be_negative():
    assert card(credit_limit=D("0")).credit_limit == 0
    with pytest.raises(InvalidCreditLimit):
        card(credit_limit=D("-1"))


def test_installment_plan_validates_count():
    with pytest.raises(InvalidInstallments):
        InstallmentPlan(id=None, user_id=1, account_id=1, total_amount=D("100"), installments=1, purchase_date=TODAY)
