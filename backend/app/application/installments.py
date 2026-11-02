"""Compras en cuotas: un plan que genera un gasto por cuota, cada uno en su mes (y en su factura).

Las cuotas no se editan una por una: editar o borrar cualquiera de ellas edita o borra la compra
entera, y las cuotas se vuelven a generar.
"""

from dataclasses import dataclass, replace
from datetime import date
from decimal import Decimal

from ..domain.entities import InstallmentPlan, Transaction
from ..domain.exceptions import AccountNotFound, InstallmentsOnlyOnCards
from ..domain.statements import installment_dates, split_installments
from .ports import UnitOfWork, UnitOfWorkFactory

ZERO = Decimal("0.00")


@dataclass(frozen=True)
class InstallmentProgress:
    plan: InstallmentPlan
    #: Valor de cada cuota (la primera puede llevar unos centavos más).
    installment_amount: Decimal
    #: Cuotas ya cargadas: las de fecha hasta hoy.
    charged: int
    #: Lo que falta cargar en las facturas siguientes.
    remaining: Decimal
    next_date: date | None


def ensure_installments_allowed(uow: UnitOfWork, user_id: int, account_id: int | None, type: str) -> None:
    """Solo los gastos de una tarjeta de crédito se pueden pagar en cuotas."""
    account = uow.accounts.get(user_id, account_id) if account_id is not None else None
    if not account:
        raise AccountNotFound()
    if not account.is_card or type != "expense":
        raise InstallmentsOnlyOnCards()


def _add_installments(uow: UnitOfWork, plan: InstallmentPlan) -> Transaction:
    """Genera las cuotas del plan y devuelve la primera."""
    amounts = split_installments(plan.total_amount, plan.installments)
    dates = installment_dates(plan.purchase_date, plan.installments)
    first = None
    for number, (amount, day) in enumerate(zip(amounts, dates), start=1):
        created = uow.transactions.add(
            Transaction(
                id=None,
                user_id=plan.user_id,
                type="expense",
                amount=amount,
                date=day,
                description=plan.description,
                category_id=plan.category_id,
                account_id=plan.account_id,
                installment_plan_id=plan.id,
                installment_number=number,
                installment_count=plan.installments,
            )
        )
        first = first or created
    return uow.transactions.get(plan.user_id, first.id)


def create_plan(
    uow: UnitOfWork, user_id: int, account_id: int, total: Decimal, installments: int, purchase_date: date,
    description: str, category_id: int | None,
) -> Transaction:
    plan = uow.installment_plans.add(
        InstallmentPlan(
            id=None,
            user_id=user_id,
            account_id=account_id,
            total_amount=total,
            installments=installments,
            purchase_date=purchase_date,
            description=description,
            category_id=category_id,
        )
    )
    return _add_installments(uow, plan)


def replace_plan(
    uow: UnitOfWork, plan: InstallmentPlan, account_id: int, total: Decimal, installments: int, purchase_date: date,
    description: str, category_id: int | None,
) -> Transaction:
    updated = uow.installment_plans.update(
        replace(
            plan,
            account_id=account_id,
            total_amount=total,
            installments=installments,
            purchase_date=purchase_date,
            description=description,
            category_id=category_id,
        )
    )
    uow.installment_plans.delete_installments(plan.id)
    return _add_installments(uow, updated)


class ListInstallments:
    """Compras en cuotas de una tarjeta que todavía tienen cuotas por cargar."""

    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user_id: int, account_id: int, today: date | None = None) -> list[InstallmentProgress]:
        today = today or date.today()
        with self._uow_factory() as uow:
            plans = uow.installment_plans.list(user_id, account_id)
            installments = [t for t in uow.transactions.list(user_id, account_id=account_id) if t.installment_plan_id]
        result = []
        for plan in plans:
            own = sorted((t for t in installments if t.installment_plan_id == plan.id), key=lambda t: t.date)
            future = [t for t in own if t.date > today]
            if not future:
                continue
            result.append(
                InstallmentProgress(
                    plan=plan,
                    installment_amount=own[-1].amount,
                    charged=len(own) - len(future),
                    remaining=sum((t.amount for t in future), ZERO),
                    next_date=future[0].date,
                )
            )
        return result
