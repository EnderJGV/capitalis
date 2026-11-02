"""Facturas de tarjeta de crédito: ciclos, vencimientos, estados y cuotas.

Funciones puras, sin base de datos: las facturas no se guardan, se calculan cada vez a partir de los
movimientos y los pagos de la tarjeta, así nunca se desincronizan al editar o borrar una compra.

- Un ciclo va del día siguiente al cierre anterior hasta el día de cierre (inclusive). Si el mes no
  tiene ese día (31 en febrero), cierra el último día del mes.
- Vence el día de vencimiento del mismo mes del cierre si es posterior al día de cierre; si no, el
  del mes siguiente.
- Los pagos se asignan a la factura más vieja con saldo pendiente; lo que sobra adelanta las
  siguientes (también la abierta y las de cuotas futuras).
"""

from collections import defaultdict
from datetime import date, timedelta
from decimal import ROUND_DOWN, Decimal
from typing import Iterable

from .entities import MAX_INSTALLMENTS, MIN_INSTALLMENTS, Statement, StatementStatus
from .exceptions import InvalidAmount, InvalidInstallments
from .periods import add_months, day_in_month, shift_month

ZERO = Decimal("0.00")
CENT = Decimal("0.01")


def closing_for(day: date, closing_day: int) -> date:
    """Cierre de la factura en la que entra un movimiento de ese día (el día de cierre entra en ella)."""
    closing = day_in_month(day.year, day.month, closing_day)
    if day <= closing:
        return closing
    y, m = shift_month(day.year, day.month, 1)
    return day_in_month(y, m, closing_day)


def previous_closing(closing: date, closing_day: int) -> date:
    y, m = shift_month(closing.year, closing.month, -1)
    return day_in_month(y, m, closing_day)


def due_date(closing: date, closing_day: int, due_day: int) -> date:
    offset = 0 if due_day > closing_day else 1
    y, m = shift_month(closing.year, closing.month, offset)
    return day_in_month(y, m, due_day)


def _status(start: date, closing: date, due: date, total: Decimal, paid: Decimal, today: date) -> StatementStatus:
    if total < 0:
        return "credit"
    if start > today:
        return "future"
    if closing >= today:
        return "open"
    if paid >= total:
        return "paid"
    if today > due:
        return "overdue"
    return "partial" if paid > 0 else "closed"


def build_statements(
    closing_day: int,
    due_day: int,
    movements: Iterable[tuple[date, Decimal]],
    payments: Iterable[Decimal],
    today: date,
    *,
    include_current: bool = True,
) -> list[Statement]:
    """Facturas de una tarjeta, de la más vieja a la más nueva.

    `movements`: (fecha, monto) con signo; positivo = cargo (compra, cuota, tarifa), negativo =
    crédito (reembolso). `payments`: montos pagados a la tarjeta. Con `include_current`, la factura
    abierta aparece aunque todavía no tenga movimientos.
    """
    charges: dict[date, Decimal] = defaultdict(lambda: ZERO)
    credits: dict[date, Decimal] = defaultdict(lambda: ZERO)
    for day, amount in movements:
        closing = closing_for(day, closing_day)
        if amount >= 0:
            charges[closing] += amount
        else:
            credits[closing] -= amount

    closings = set(charges) | set(credits)
    if include_current:
        closings.add(closing_for(today, closing_day))
    ordered = sorted(closings)

    # Fondos para pagar facturas: los pagos más lo que sobra de las facturas con saldo a favor.
    funds = sum(payments, ZERO) + sum((credits[c] - charges[c] for c in ordered if credits[c] > charges[c]), ZERO)

    statements = []
    for closing in ordered:
        total = charges[closing] - credits[closing]
        paid = ZERO
        if total > 0 and funds > 0:
            paid = min(total, funds)
            funds -= paid
        start = previous_closing(closing, closing_day) + timedelta(days=1)
        due = due_date(closing, closing_day, due_day)
        statements.append(
            Statement(
                start_date=start,
                closing_date=closing,
                due_date=due,
                charges=charges[closing],
                credits=credits[closing],
                paid=paid,
                status=_status(start, closing, due, total, paid, today),
            )
        )
    return statements


def split_installments(total: Decimal, count: int) -> list[Decimal]:
    """Reparte el total en cuotas iguales; los centavos que sobran van en la primera."""
    if not MIN_INSTALLMENTS <= count <= MAX_INSTALLMENTS:
        raise InvalidInstallments()
    base = (total / count).quantize(CENT, rounding=ROUND_DOWN)
    if base <= 0:
        raise InvalidAmount()
    return [total - base * (count - 1)] + [base] * (count - 1)


def installment_dates(purchase_date: date, count: int) -> list[date]:
    """La primera cuota en la fecha de compra y cada una de las siguientes un mes después."""
    return [add_months(purchase_date, k) for k in range(count)]
