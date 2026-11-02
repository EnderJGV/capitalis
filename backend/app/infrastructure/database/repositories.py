from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import and_, case, delete, func, literal, or_, select, union_all
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from ...domain.entities import (
    Account,
    Category,
    CategoryTotal,
    CreditCard,
    CurrencyAmount,
    InstallmentPlan,
    Transaction,
    Transfer,
    TxType,
    User,
)
from ...domain.exceptions import DuplicateAccount, DuplicateCategory, EmailAlreadyRegistered
from .models import (
    AccountModel,
    CategoryModel,
    CreditCardModel,
    ExchangeRateModel,
    InstallmentPlanModel,
    TransactionModel,
    TransferModel,
    UserModel,
)


def _user(m: UserModel) -> User:
    return User(
        id=m.id, name=m.name, email=m.email, password_hash=m.password_hash, currency=m.currency, language=m.language
    )


def _category(m: CategoryModel) -> Category:
    return Category(id=m.id, user_id=m.user_id, name=m.name, type=m.type, color=m.color, icon=m.icon)


def _card(m: CreditCardModel) -> CreditCard:
    return CreditCard(
        network=m.network,
        credit_limit=m.credit_limit,
        closing_day=m.closing_day,
        due_day=m.due_day,
        last4=m.last4,
        payment_account_id=m.payment_account_id,
    )


def _account(m: AccountModel, balance: Decimal | None = None) -> Account:
    return Account(
        id=m.id,
        user_id=m.user_id,
        name=m.name,
        currency=m.currency,
        kind=m.kind,
        institution=m.institution,
        initial_balance=m.initial_balance,
        archived=m.archived,
        balance=balance,
        card=_card(m.card) if m.card else None,
    )


def _plan(m: InstallmentPlanModel) -> InstallmentPlan:
    return InstallmentPlan(
        id=m.id,
        user_id=m.user_id,
        account_id=m.account_id,
        total_amount=m.total_amount,
        installments=m.installments,
        purchase_date=m.purchase_date,
        description=m.description,
        category_id=m.category_id,
    )


def _transaction(m: TransactionModel) -> Transaction:
    return Transaction(
        id=m.id,
        user_id=m.user_id,
        type=m.type,
        amount=m.amount,
        date=m.date,
        description=m.description,
        category_id=m.category_id,
        category=_category(m.category) if m.category else None,
        account_id=m.account_id,
        account=_account(m.account) if m.account else None,
        transfer_id=m.transfer_id,
        installment_plan_id=m.installment_plan_id,
        installment_number=m.installment_number,
        installment_count=m.installment_count,
        is_refund=m.is_refund,
        original_amount=m.original_amount,
        original_currency=m.original_currency,
        exchange_rate=m.exchange_rate,
        parent_id=m.parent_id,
        installment_plan=_plan(m.installment_plan) if m.installment_plan else None,
        foreign_fee=m.foreign_fee_charge.amount if m.foreign_fee_charge else None,
    )


def _sync_card(m: AccountModel, card: CreditCard | None) -> None:
    """Crea, actualiza o quita la configuración de tarjeta de una cuenta."""
    if card is None:
        m.card = None
        return
    if m.card is None:
        m.card = CreditCardModel()
    c = m.card
    c.network, c.last4, c.credit_limit = card.network, card.last4, card.credit_limit
    c.closing_day, c.due_day, c.payment_account_id = card.closing_day, card.due_day, card.payment_account_id


def _transaction_fields(m: TransactionModel, t: Transaction) -> None:
    m.category_id, m.account_id, m.type = t.category_id, t.account_id, t.type
    m.amount, m.description, m.date = t.amount, t.description, t.date
    m.installment_plan_id, m.installment_number, m.installment_count = (
        t.installment_plan_id,
        t.installment_number,
        t.installment_count,
    )
    m.is_refund = t.is_refund
    m.original_amount, m.original_currency, m.exchange_rate = t.original_amount, t.original_currency, t.exchange_rate
    m.parent_id = t.parent_id


def _transfer(m: TransferModel) -> Transfer:
    return Transfer(
        id=m.id,
        user_id=m.user_id,
        from_account_id=m.from_account_id,
        to_account_id=m.to_account_id,
        amount=m.amount,
        received_amount=m.received_amount,
        rate=m.rate,
        date=m.date,
        fee=m.fee,
        description=m.description,
        from_account=_account(m.from_account) if m.from_account else None,
        to_account=_account(m.to_account) if m.to_account else None,
    )


class SqlUserRepository:
    def __init__(self, session: Session):
        self._s = session

    def get(self, user_id: int) -> User | None:
        m = self._s.get(UserModel, user_id)
        return _user(m) if m else None

    def get_by_email(self, email: str) -> User | None:
        m = self._s.scalar(select(UserModel).where(UserModel.email == email))
        return _user(m) if m else None

    def add(self, user: User) -> User:
        m = UserModel(
            name=user.name,
            email=user.email,
            password_hash=user.password_hash,
            currency=user.currency,
            language=user.language,
        )
        self._s.add(m)
        try:
            self._s.flush()
        except IntegrityError:
            raise EmailAlreadyRegistered()
        return _user(m)

    def update(self, user: User) -> User:
        m = self._s.get(UserModel, user.id)
        m.name, m.currency, m.language = user.name, user.currency, user.language
        self._s.flush()
        return _user(m)


class SqlCategoryRepository:
    def __init__(self, session: Session):
        self._s = session

    def _owned(self, user_id: int, category_id: int) -> CategoryModel | None:
        return self._s.scalar(
            select(CategoryModel).where(CategoryModel.id == category_id, CategoryModel.user_id == user_id)
        )

    def list(self, user_id: int) -> list[Category]:
        rows = self._s.scalars(
            select(CategoryModel).where(CategoryModel.user_id == user_id).order_by(CategoryModel.type, CategoryModel.name)
        )
        return [_category(m) for m in rows]

    def get(self, user_id: int, category_id: int) -> Category | None:
        m = self._owned(user_id, category_id)
        return _category(m) if m else None

    def get_by_name(self, user_id: int, name: str, type: TxType) -> Category | None:
        m = self._s.scalar(
            select(CategoryModel).where(
                CategoryModel.user_id == user_id, CategoryModel.name == name, CategoryModel.type == type
            )
        )
        return _category(m) if m else None

    def _flush(self) -> None:
        try:
            self._s.flush()
        except IntegrityError:
            raise DuplicateCategory()

    def add(self, category: Category) -> Category:
        m = CategoryModel(
            user_id=category.user_id, name=category.name, type=category.type, color=category.color, icon=category.icon
        )
        self._s.add(m)
        self._flush()
        return _category(m)

    def add_many(self, categories: list[Category]) -> None:
        self._s.add_all(
            CategoryModel(user_id=c.user_id, name=c.name, type=c.type, color=c.color, icon=c.icon) for c in categories
        )
        self._flush()

    def update(self, category: Category) -> Category:
        m = self._owned(category.user_id, category.id)
        m.name, m.type, m.color, m.icon = category.name, category.type, category.color, category.icon
        self._flush()
        return _category(m)

    def delete(self, user_id: int, category_id: int) -> None:
        m = self._owned(user_id, category_id)
        if m:
            self._s.delete(m)
            self._s.flush()

    def has_transactions(self, category_id: int) -> bool:
        return self._s.scalar(select(TransactionModel.id).where(TransactionModel.category_id == category_id).limit(1)) is not None


class SqlAccountRepository:
    def __init__(self, session: Session):
        self._s = session

    def _owned(self, user_id: int, account_id: int) -> AccountModel | None:
        return self._s.scalar(select(AccountModel).where(AccountModel.id == account_id, AccountModel.user_id == user_id))

    def _balances(self, user_id: int) -> dict[int, Decimal]:
        """Movimiento neto por cuenta: ingresos − gastos − enviado + recibido (sin el saldo inicial)."""
        flows = union_all(
            select(
                TransactionModel.account_id.label("account_id"),
                case((TransactionModel.type == "income", TransactionModel.amount), else_=-TransactionModel.amount).label(
                    "delta"
                ),
            ).where(TransactionModel.user_id == user_id),
            select(TransferModel.from_account_id, -TransferModel.amount).where(TransferModel.user_id == user_id),
            select(TransferModel.to_account_id, TransferModel.received_amount).where(TransferModel.user_id == user_id),
        ).subquery()
        rows = self._s.execute(select(flows.c.account_id, func.sum(flows.c.delta)).group_by(flows.c.account_id)).all()
        return {account_id: total for account_id, total in rows}

    def list(self, user_id: int, *, include_archived: bool = False) -> list[Account]:
        q = select(AccountModel).where(AccountModel.user_id == user_id)
        if not include_archived:
            q = q.where(AccountModel.archived.is_(False))
        models = self._s.scalars(q.order_by(AccountModel.archived, AccountModel.currency, AccountModel.name)).all()
        flows = self._balances(user_id)
        return [_account(m, m.initial_balance + flows.get(m.id, Decimal("0"))) for m in models]

    def get(self, user_id: int, account_id: int) -> Account | None:
        m = self._owned(user_id, account_id)
        if not m:
            return None
        return _account(m, m.initial_balance + self._balances(user_id).get(m.id, Decimal("0")))

    def _flush(self) -> None:
        try:
            self._s.flush()
        except IntegrityError:
            raise DuplicateAccount()

    def add(self, account: Account) -> Account:
        m = AccountModel(
            user_id=account.user_id,
            name=account.name,
            currency=account.currency,
            kind=account.kind,
            institution=account.institution,
            initial_balance=account.initial_balance,
            archived=account.archived,
        )
        _sync_card(m, account.card)
        self._s.add(m)
        self._flush()
        return self.get(account.user_id, m.id)

    def update(self, account: Account) -> Account:
        m = self._owned(account.user_id, account.id)
        m.name, m.currency, m.kind = account.name, account.currency, account.kind
        m.institution, m.initial_balance, m.archived = account.institution, account.initial_balance, account.archived
        _sync_card(m, account.card)
        self._flush()
        return self.get(account.user_id, account.id)

    def delete(self, user_id: int, account_id: int) -> None:
        m = self._owned(user_id, account_id)
        if m:
            self._s.delete(m)
            self._s.flush()

    def has_movements(self, account_id: int) -> bool:
        tx = select(TransactionModel.id).where(TransactionModel.account_id == account_id).limit(1)
        tr = select(TransferModel.id).where(
            or_(TransferModel.from_account_id == account_id, TransferModel.to_account_id == account_id)
        ).limit(1)
        return self._s.scalar(tx) is not None or self._s.scalar(tr) is not None


class SqlTransactionRepository:
    def __init__(self, session: Session):
        self._s = session

    def _query(self):
        return select(TransactionModel).options(
            joinedload(TransactionModel.category),
            joinedload(TransactionModel.account),
            joinedload(TransactionModel.installment_plan),
        )

    def _owned(self, user_id: int, transaction_id: int) -> TransactionModel | None:
        # populate_existing: relee también las relaciones (p. ej., la tarifa recién enlazada a la compra).
        return self._s.scalar(
            self._query()
            .where(TransactionModel.id == transaction_id, TransactionModel.user_id == user_id)
            .execution_options(populate_existing=True)
        )

    def list(
        self,
        user_id: int,
        *,
        start: date | None = None,
        end: date | None = None,
        type: TxType | None = None,
        category_id: int | None = None,
        account_id: int | None = None,
    ) -> list[Transaction]:
        q = self._query().where(TransactionModel.user_id == user_id)
        if start and end:
            q = q.where(TransactionModel.date >= start, TransactionModel.date <= end)
        if type:
            q = q.where(TransactionModel.type == type)
        if category_id:
            q = q.where(TransactionModel.category_id == category_id)
        if account_id:
            q = q.where(TransactionModel.account_id == account_id)
        rows = self._s.scalars(q.order_by(TransactionModel.date.desc(), TransactionModel.id.desc()))
        return [_transaction(m) for m in rows]

    def get(self, user_id: int, transaction_id: int) -> Transaction | None:
        m = self._owned(user_id, transaction_id)
        return _transaction(m) if m else None

    def get_fee(self, transfer_id: int) -> Transaction | None:
        m = self._s.scalar(self._query().where(TransactionModel.transfer_id == transfer_id))
        return _transaction(m) if m else None

    def get_child(self, parent_id: int) -> Transaction | None:
        m = self._s.scalar(self._query().where(TransactionModel.parent_id == parent_id))
        return _transaction(m) if m else None

    def add(self, transaction: Transaction) -> Transaction:
        m = TransactionModel(user_id=transaction.user_id, transfer_id=transaction.transfer_id)
        _transaction_fields(m, transaction)
        self._s.add(m)
        self._s.flush()
        return self.get(transaction.user_id, m.id)

    def update(self, transaction: Transaction) -> Transaction:
        m = self._owned(transaction.user_id, transaction.id)
        _transaction_fields(m, transaction)
        self._s.flush()
        self._s.expire(m)
        return self.get(transaction.user_id, transaction.id)

    def delete(self, user_id: int, transaction_id: int) -> None:
        m = self._owned(user_id, transaction_id)
        if m:
            self._s.delete(m)
            self._s.flush()


class SqlInstallmentPlanRepository:
    def __init__(self, session: Session):
        self._s = session

    def _owned(self, user_id: int, plan_id: int) -> InstallmentPlanModel | None:
        return self._s.scalar(
            select(InstallmentPlanModel).where(InstallmentPlanModel.id == plan_id, InstallmentPlanModel.user_id == user_id)
        )

    def get(self, user_id: int, plan_id: int) -> InstallmentPlan | None:
        m = self._owned(user_id, plan_id)
        return _plan(m) if m else None

    def list(self, user_id: int, account_id: int) -> list[InstallmentPlan]:
        rows = self._s.scalars(
            select(InstallmentPlanModel)
            .where(InstallmentPlanModel.user_id == user_id, InstallmentPlanModel.account_id == account_id)
            .order_by(InstallmentPlanModel.purchase_date.desc(), InstallmentPlanModel.id.desc())
        )
        return [_plan(m) for m in rows]

    def add(self, plan: InstallmentPlan) -> InstallmentPlan:
        m = InstallmentPlanModel(user_id=plan.user_id)
        self._fields(m, plan)
        self._s.add(m)
        self._s.flush()
        return _plan(m)

    def update(self, plan: InstallmentPlan) -> InstallmentPlan:
        m = self._owned(plan.user_id, plan.id)
        self._fields(m, plan)
        self._s.flush()
        return _plan(m)

    @staticmethod
    def _fields(m: InstallmentPlanModel, plan: InstallmentPlan) -> None:
        m.account_id, m.category_id, m.description = plan.account_id, plan.category_id, plan.description
        m.total_amount, m.installments, m.purchase_date = plan.total_amount, plan.installments, plan.purchase_date

    def delete_installments(self, plan_id: int) -> None:
        self._s.execute(delete(TransactionModel).where(TransactionModel.installment_plan_id == plan_id))
        self._s.flush()

    def delete(self, user_id: int, plan_id: int) -> None:
        m = self._owned(user_id, plan_id)
        if m:
            # Las cuotas se borran con el plan (ON DELETE CASCADE); se hace explícito por claridad.
            self.delete_installments(plan_id)
            self._s.delete(m)
            self._s.flush()


class SqlTransferRepository:
    def __init__(self, session: Session):
        self._s = session

    def _query(self):
        return select(TransferModel).options(
            joinedload(TransferModel.from_account), joinedload(TransferModel.to_account)
        )

    def _owned(self, user_id: int, transfer_id: int) -> TransferModel | None:
        return self._s.scalar(self._query().where(TransferModel.id == transfer_id, TransferModel.user_id == user_id))

    def list(
        self, user_id: int, *, start: date | None = None, end: date | None = None, account_id: int | None = None
    ) -> list[Transfer]:
        q = self._query().where(TransferModel.user_id == user_id)
        if start and end:
            q = q.where(TransferModel.date >= start, TransferModel.date <= end)
        if account_id:
            q = q.where(or_(TransferModel.from_account_id == account_id, TransferModel.to_account_id == account_id))
        rows = self._s.scalars(q.order_by(TransferModel.date.desc(), TransferModel.id.desc()))
        return [_transfer(m) for m in rows]

    def get(self, user_id: int, transfer_id: int) -> Transfer | None:
        m = self._owned(user_id, transfer_id)
        return _transfer(m) if m else None

    def add(self, transfer: Transfer) -> Transfer:
        m = TransferModel(
            user_id=transfer.user_id,
            from_account_id=transfer.from_account_id,
            to_account_id=transfer.to_account_id,
            amount=transfer.amount,
            received_amount=transfer.received_amount,
            rate=transfer.rate,
            fee=transfer.fee,
            date=transfer.date,
            description=transfer.description,
        )
        self._s.add(m)
        self._s.flush()
        return self.get(transfer.user_id, m.id)

    def update(self, transfer: Transfer) -> Transfer:
        m = self._owned(transfer.user_id, transfer.id)
        m.from_account_id, m.to_account_id = transfer.from_account_id, transfer.to_account_id
        m.amount, m.received_amount, m.rate = transfer.amount, transfer.received_amount, transfer.rate
        m.fee, m.date, m.description = transfer.fee, transfer.date, transfer.description
        self._s.flush()
        self._s.expire(m)
        return self.get(transfer.user_id, transfer.id)

    def delete(self, user_id: int, transfer_id: int) -> None:
        m = self._owned(user_id, transfer_id)
        if m:
            # La comisión enlazada se borra con ella (ON DELETE CASCADE); se hace explícito por claridad.
            self._s.execute(delete(TransactionModel).where(TransactionModel.transfer_id == transfer_id))
            self._s.delete(m)
            self._s.flush()


class SqlRateRepository:
    def __init__(self, session: Session):
        self._s = session

    def usd_rates(self, on: date) -> dict[str, Decimal] | None:
        rows = self._s.execute(
            select(ExchangeRateModel.quote, ExchangeRateModel.rate).where(
                ExchangeRateModel.date == on, ExchangeRateModel.base == "USD"
            )
        ).all()
        return {quote: rate for quote, rate in rows} or None

    def save_usd_rates(self, on: date, rates: dict[str, Decimal]) -> None:
        self._s.execute(
            delete(ExchangeRateModel).where(ExchangeRateModel.date == on, ExchangeRateModel.base == "USD")
        )
        self._s.add_all(ExchangeRateModel(date=on, base="USD", quote=q, rate=r) for q, r in rates.items())
        self._s.flush()


# Un reembolso (ingreso con is_refund) no es un ingreso: devuelve parte de un gasto y lo resta.
_INCOME = case(
    (and_(TransactionModel.type == "income", TransactionModel.is_refund.is_(False)), TransactionModel.amount), else_=0
)
_EXPENSE = case(
    (TransactionModel.type == "expense", TransactionModel.amount),
    (TransactionModel.is_refund.is_(True), -TransactionModel.amount),
    else_=0,
)


class SqlReportRepository:
    """Las transferencias no son ingresos ni gastos: solo se suman los movimientos (incluidas las comisiones)."""

    def __init__(self, session: Session):
        self._s = session

    def totals(self, user_id: int, start: date | None = None, end: date | None = None) -> list[CurrencyAmount]:
        q = (
            select(AccountModel.currency, func.coalesce(func.sum(_INCOME), 0), func.coalesce(func.sum(_EXPENSE), 0))
            .select_from(TransactionModel)
            .join(AccountModel, AccountModel.id == TransactionModel.account_id)
            .where(TransactionModel.user_id == user_id)
            .group_by(AccountModel.currency)
        )
        if start and end:
            q = q.where(TransactionModel.date >= start, TransactionModel.date <= end)
        return [CurrencyAmount(currency=c, income=i, expense=e) for c, i, e in self._s.execute(q).all()]

    def expenses_by_category(self, user_id: int, start: date, end: date) -> list[tuple[str, CategoryTotal]]:
        total = func.sum(_EXPENSE)
        rows = self._s.execute(
            select(
                AccountModel.currency,
                CategoryModel.id,
                func.coalesce(CategoryModel.name, literal("Sin categoría")),
                func.coalesce(CategoryModel.color, literal("#9ca3af")),
                func.coalesce(CategoryModel.icon, literal("")),
                total,
            )
            .select_from(TransactionModel)
            .join(AccountModel, AccountModel.id == TransactionModel.account_id)
            .outerjoin(CategoryModel, CategoryModel.id == TransactionModel.category_id)
            .where(
                TransactionModel.user_id == user_id,
                or_(TransactionModel.type == "expense", TransactionModel.is_refund.is_(True)),
                TransactionModel.date >= start,
                TransactionModel.date <= end,
            )
            .group_by(AccountModel.currency, CategoryModel.id, CategoryModel.name, CategoryModel.color, CategoryModel.icon)
        ).all()
        return [
            (currency, CategoryTotal(category_id=cid, name=n, color=c, icon=i, total=t))
            for currency, cid, n, c, i, t in rows
        ]

    def monthly_totals(self, user_id: int, start: date, end: date) -> dict[str, list[CurrencyAmount]]:
        ym = func.to_char(TransactionModel.date, "YYYY-MM")
        rows = self._s.execute(
            select(ym, AccountModel.currency, func.sum(_INCOME), func.sum(_EXPENSE))
            .select_from(TransactionModel)
            .join(AccountModel, AccountModel.id == TransactionModel.account_id)
            .where(TransactionModel.user_id == user_id, TransactionModel.date >= start, TransactionModel.date <= end)
            .group_by(ym, AccountModel.currency)
        ).all()
        result: dict[str, list[CurrencyAmount]] = {}
        for month, currency, income, expense in rows:
            result.setdefault(month, []).append(CurrencyAmount(currency=currency, income=income, expense=expense))
        return result
