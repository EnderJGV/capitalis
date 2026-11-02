"""Implementaciones en memoria de los puertos, para probar los casos de uso sin base de datos ni red."""

from dataclasses import replace
from datetime import date
from decimal import Decimal

from app.domain.entities import Account, Category, CategoryTotal, CurrencyAmount, Transaction, Transfer, User
from app.domain.exceptions import DuplicateAccount

ZERO = Decimal("0")


class Store:
    def __init__(self):
        self.users: dict[int, User] = {}
        self.categories: dict[int, Category] = {}
        self.accounts: dict[int, Account] = {}
        self.transactions: dict[int, Transaction] = {}
        self.transfers: dict[int, Transfer] = {}
        self.rates: dict[date, dict[str, Decimal]] = {}
        self._ids = 0

    def next_id(self) -> int:
        self._ids += 1
        return self._ids


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


class FakeTransactions:
    def __init__(self, s: Store):
        self.s = s

    def list(self, user_id, **_):
        return [t for t in self.s.transactions.values() if t.user_id == user_id]

    def get(self, user_id, transaction_id):
        t = self.s.transactions.get(transaction_id)
        return t if t and t.user_id == user_id else None

    def get_fee(self, transfer_id):
        return next((t for t in self.s.transactions.values() if t.transfer_id == transfer_id), None)

    def add(self, transaction):
        created = replace(transaction, id=self.s.next_id())
        self.s.transactions[created.id] = created
        return created

    def update(self, transaction):
        self.s.transactions[transaction.id] = transaction
        return transaction

    def delete(self, user_id, transaction_id):
        self.s.transactions.pop(transaction_id, None)


class FakeTransfers:
    def __init__(self, s: Store):
        self.s = s

    def list(self, user_id, **_):
        return [t for t in self.s.transfers.values() if t.user_id == user_id]

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

    def totals(self, user_id, start=None, end=None):
        acc: dict[str, list[Decimal]] = {}
        for t, cur in self._in(user_id, start, end):
            pair = acc.setdefault(cur, [ZERO, ZERO])
            pair[0 if t.type == "income" else 1] += t.amount
        return [CurrencyAmount(c, i, e) for c, (i, e) in acc.items()]

    def expenses_by_category(self, user_id, start, end):
        acc: dict[tuple[str, int | None], Decimal] = {}
        for t, cur in self._in(user_id, start, end):
            if t.type == "expense":
                acc[(cur, t.category_id)] = acc.get((cur, t.category_id), ZERO) + t.amount
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
            amounts.append(
                CurrencyAmount(cur, t.amount if t.type == "income" else ZERO, t.amount if t.type == "expense" else ZERO)
            )
        return result


class FakeUnitOfWork:
    def __init__(self, store: Store):
        self.categories = FakeCategories(store)
        self.accounts = FakeAccounts(store)
        self.transactions = FakeTransactions(store)
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
