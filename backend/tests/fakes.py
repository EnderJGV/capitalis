"""Implementaciones en memoria de los puertos, para probar los casos de uso sin base de datos ni red."""

from dataclasses import replace
from datetime import date
from decimal import Decimal

from app.domain.entities import (
    Account,
    Category,
    CategoryTotal,
    CurrencyAmount,
    InstallmentPlan,
    Transaction,
    Transfer,
    User,
)
from app.domain.exceptions import DuplicateAccount

ZERO = Decimal("0")


class Store:
    def __init__(self):
        self.users: dict[int, User] = {}
        self.categories: dict[int, Category] = {}
        self.accounts: dict[int, Account] = {}
        self.transactions: dict[int, Transaction] = {}
        self.transfers: dict[int, Transfer] = {}
        self.plans: dict[int, InstallmentPlan] = {}
        self.rates: dict[date, dict[str, Decimal]] = {}
        self._ids = 0

    def next_id(self) -> int:
        self._ids += 1
        return self._ids


class FakeUsers:
    def __init__(self, s: Store):
        self.s = s

    def get(self, user_id):
        return self.s.users.get(user_id)


class FakeCategories:
    def __init__(self, s: Store):
        self.s = s

    def list(self, user_id):
        return [c for c in self.s.categories.values() if c.user_id == user_id]

    def get(self, user_id, category_id):
        c = self.s.categories.get(category_id)
        return c if c and c.user_id == user_id else None

    def get_by_name(self, user_id, name, type):
        return next((c for c in self.list(user_id) if c.name == name and c.type == type), None)

    def add(self, category):
        created = replace(category, id=self.s.next_id())
        self.s.categories[created.id] = created
        return created


class FakeAccounts:
    def __init__(self, s: Store):
        self.s = s

    def _balance(self, a: Account) -> Decimal:
        total = a.initial_balance
        for t in self.s.transactions.values():
            if t.account_id == a.id:
                total += t.amount if t.type == "income" else -t.amount
        for tr in self.s.transfers.values():
            if tr.from_account_id == a.id:
                total -= tr.amount
            if tr.to_account_id == a.id:
                total += tr.received_amount
        return total

    def list(self, user_id, *, include_archived=False):
        return [
            replace(a, balance=self._balance(a))
            for a in self.s.accounts.values()
            if a.user_id == user_id and (include_archived or not a.archived)
        ]

    def get(self, user_id, account_id):
        a = self.s.accounts.get(account_id)
        return replace(a, balance=self._balance(a)) if a and a.user_id == user_id else None

    def add(self, account):
        if any(a.user_id == account.user_id and a.name == account.name for a in self.s.accounts.values()):
            raise DuplicateAccount()
        created = replace(account, id=self.s.next_id())
        self.s.accounts[created.id] = created
        return self.get(created.user_id, created.id)

    def update(self, account):
        self.s.accounts[account.id] = replace(account, balance=None)
        return self.get(account.user_id, account.id)

    def delete(self, user_id, account_id):
        self.s.accounts.pop(account_id, None)

    def has_movements(self, account_id):
        return any(t.account_id == account_id for t in self.s.transactions.values()) or any(
            account_id in (tr.from_account_id, tr.to_account_id) for tr in self.s.transfers.values()
        )


def _in_range(day, start, end):
    return not (start and end) or start <= day <= end


class FakeTransactions:
    def __init__(self, s: Store):
        self.s = s

    def list(self, user_id, *, start=None, end=None, type=None, category_id=None, account_id=None):
        return [
            t
            for t in self.s.transactions.values()
            if t.user_id == user_id
            and _in_range(t.date, start, end)
            and (not type or t.type == type)
            and (not category_id or t.category_id == category_id)
            and (not account_id or t.account_id == account_id)
        ]

    def get(self, user_id, transaction_id):
        t = self.s.transactions.get(transaction_id)
        if not t or t.user_id != user_id:
            return None
        child = self.get_child(t.id)
        return replace(t, installment_plan=self.s.plans.get(t.installment_plan_id), foreign_fee=child.amount if child else None)

    def get_fee(self, transfer_id):
        return next((t for t in self.s.transactions.values() if t.transfer_id == transfer_id), None)

    def get_child(self, parent_id):
        return next((t for t in self.s.transactions.values() if t.parent_id == parent_id), None)

    def add(self, transaction):
        created = replace(transaction, id=self.s.next_id())
        self.s.transactions[created.id] = created
        return created

    def update(self, transaction):
        self.s.transactions[transaction.id] = transaction
        return transaction

    def delete(self, user_id, transaction_id):
        self.s.transactions.pop(transaction_id, None)
        # La tarifa enlazada se borra con la compra (ON DELETE CASCADE).
        for t in [t for t in self.s.transactions.values() if t.parent_id == transaction_id]:
            self.s.transactions.pop(t.id)


class FakeInstallmentPlans:
    def __init__(self, s: Store):
        self.s = s

    def get(self, user_id, plan_id):
        p = self.s.plans.get(plan_id)
        return p if p and p.user_id == user_id else None

    def list(self, user_id, account_id):
        return [p for p in self.s.plans.values() if p.user_id == user_id and p.account_id == account_id]

    def add(self, plan):
        created = replace(plan, id=self.s.next_id())
        self.s.plans[created.id] = created
        return created

    def update(self, plan):
        self.s.plans[plan.id] = plan
        return plan

    def delete_installments(self, plan_id):
        for t in [t for t in self.s.transactions.values() if t.installment_plan_id == plan_id]:
            self.s.transactions.pop(t.id)

    def delete(self, user_id, plan_id):
        self.delete_installments(plan_id)
        self.s.plans.pop(plan_id, None)


class FakeTransfers:
    def __init__(self, s: Store):
        self.s = s

    def list(self, user_id, *, start=None, end=None, account_id=None):
        return [
            t
            for t in self.s.transfers.values()
            if t.user_id == user_id
            and _in_range(t.date, start, end)
            and (not account_id or account_id in (t.from_account_id, t.to_account_id))
        ]

    def get(self, user_id, transfer_id):
        t = self.s.transfers.get(transfer_id)
        return t if t and t.user_id == user_id else None

    def add(self, transfer):
        created = replace(transfer, id=self.s.next_id())
        self.s.transfers[created.id] = created
        return created

    def update(self, transfer):
        self.s.transfers[transfer.id] = transfer
        return transfer

    def delete(self, user_id, transfer_id):
        self.s.transfers.pop(transfer_id, None)
        for t in [t for t in self.s.transactions.values() if t.transfer_id == transfer_id]:
            self.s.transactions.pop(t.id)


class FakeRates:
    def __init__(self, s: Store):
        self.s = s

    def usd_rates(self, on):
        return self.s.rates.get(on)

    def save_usd_rates(self, on, rates):
        self.s.rates[on] = rates


class FakeReports:
    def __init__(self, s: Store):
        self.s = s

    def _in(self, user_id, start, end):
        for t in self.s.transactions.values():
            if t.user_id == user_id and (not start or start <= t.date <= end):
                yield t, self.s.accounts[t.account_id].currency

    @staticmethod
    def _split(t):
        """(ingreso, gasto): un reembolso no es ingreso, resta del gasto."""
        if t.is_refund:
            return ZERO, -t.amount
        return (t.amount, ZERO) if t.type == "income" else (ZERO, t.amount)

    def totals(self, user_id, start=None, end=None):
        acc: dict[str, list[Decimal]] = {}
        for t, cur in self._in(user_id, start, end):
            pair = acc.setdefault(cur, [ZERO, ZERO])
            income, expense = self._split(t)
            pair[0] += income
            pair[1] += expense
        return [CurrencyAmount(c, i, e) for c, (i, e) in acc.items()]

    def expenses_by_category(self, user_id, start, end):
        acc: dict[tuple[str, int | None], Decimal] = {}
        for t, cur in self._in(user_id, start, end):
            if t.type == "expense" or t.is_refund:
                acc[(cur, t.category_id)] = acc.get((cur, t.category_id), ZERO) + self._split(t)[1]
        result = []
        for (cur, cid), total in acc.items():
            c = self.s.categories.get(cid)
            result.append((cur, CategoryTotal(cid, c.name if c else "Sin categoría", "#000000", total)))
        return result

    def monthly_totals(self, user_id, start, end):
        result: dict[str, list[CurrencyAmount]] = {}
        for t, cur in self._in(user_id, start, end):
            key = t.date.strftime("%Y-%m")
            amounts = result.setdefault(key, [])
            amounts.append(CurrencyAmount(cur, *self._split(t)))
        return result


class FakeUnitOfWork:
    def __init__(self, store: Store):
        self.users = FakeUsers(store)
        self.categories = FakeCategories(store)
        self.accounts = FakeAccounts(store)
        self.transactions = FakeTransactions(store)
        self.installment_plans = FakeInstallmentPlans(store)
        self.transfers = FakeTransfers(store)
        self.rates = FakeRates(store)
        self.reports = FakeReports(store)
        self.commits = 0

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return None

    def commit(self):
        self.commits += 1


class FakeRateProvider:
    """Cotizaciones fijas (1 USD = …) y contador de llamadas para comprobar la caché."""

    def __init__(self, rates: dict[str, Decimal] | None):
        self.rates = rates
        self.calls = 0

    def usd_rates(self, on):
        self.calls += 1
        return dict(self.rates) if self.rates else None
