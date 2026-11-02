from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from ...domain.entities import Category, CategoryTotal, Transaction, TxType, User
from ...domain.exceptions import DuplicateCategory, EmailAlreadyRegistered
from .models import CategoryModel, TransactionModel, UserModel


def _user(m: UserModel) -> User:
    return User(
        id=m.id, name=m.name, email=m.email, password_hash=m.password_hash, currency=m.currency, language=m.language
    )


def _category(m: CategoryModel) -> Category:
    return Category(id=m.id, user_id=m.user_id, name=m.name, type=m.type, color=m.color, icon=m.icon)


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


class SqlTransactionRepository:
    def __init__(self, session: Session):
        self._s = session

    def _owned(self, user_id: int, transaction_id: int) -> TransactionModel | None:
        return self._s.scalar(
            select(TransactionModel)
            .options(joinedload(TransactionModel.category))
            .where(TransactionModel.id == transaction_id, TransactionModel.user_id == user_id)
        )

    def list(
        self,
        user_id: int,
        *,
        start: date | None = None,
        end: date | None = None,
        type: TxType | None = None,
        category_id: int | None = None,
    ) -> list[Transaction]:
        q = select(TransactionModel).options(joinedload(TransactionModel.category)).where(TransactionModel.user_id == user_id)
        if start and end:
            q = q.where(TransactionModel.date >= start, TransactionModel.date <= end)
        if type:
            q = q.where(TransactionModel.type == type)
        if category_id:
            q = q.where(TransactionModel.category_id == category_id)
        rows = self._s.scalars(q.order_by(TransactionModel.date.desc(), TransactionModel.id.desc()))
        return [_transaction(m) for m in rows]

    def get(self, user_id: int, transaction_id: int) -> Transaction | None:
        m = self._owned(user_id, transaction_id)
        return _transaction(m) if m else None

    def add(self, transaction: Transaction) -> Transaction:
        m = TransactionModel(
            user_id=transaction.user_id,
            category_id=transaction.category_id,
            type=transaction.type,
            amount=transaction.amount,
            description=transaction.description,
            date=transaction.date,
        )
        self._s.add(m)
        self._s.flush()
        return self.get(transaction.user_id, m.id)

    def update(self, transaction: Transaction) -> Transaction:
        m = self._owned(transaction.user_id, transaction.id)
        m.category_id = transaction.category_id
        m.type = transaction.type
        m.amount = transaction.amount
        m.description = transaction.description
        m.date = transaction.date
        self._s.flush()
        self._s.expire(m)
        return self.get(transaction.user_id, transaction.id)

    def delete(self, user_id: int, transaction_id: int) -> None:
        m = self._owned(user_id, transaction_id)
        if m:
            self._s.delete(m)
            self._s.flush()


_INCOME = case((TransactionModel.type == "income", TransactionModel.amount), else_=0)
_EXPENSE = case((TransactionModel.type == "expense", TransactionModel.amount), else_=0)


class SqlReportRepository:
    def __init__(self, session: Session):
        self._s = session

    def totals(self, user_id: int, start: date | None = None, end: date | None = None) -> tuple[Decimal, Decimal]:
        q = select(func.coalesce(func.sum(_INCOME), 0), func.coalesce(func.sum(_EXPENSE), 0)).where(
            TransactionModel.user_id == user_id
        )
        if start and end:
            q = q.where(TransactionModel.date >= start, TransactionModel.date <= end)
        income, expense = self._s.execute(q).one()
        return income, expense

    def expenses_by_category(self, user_id: int, start: date, end: date) -> list[CategoryTotal]:
        total = func.sum(TransactionModel.amount)
        rows = self._s.execute(
            select(
                CategoryModel.id,
                func.coalesce(CategoryModel.name, "Sin categoría"),
                func.coalesce(CategoryModel.color, "#9ca3af"),
                func.coalesce(CategoryModel.icon, ""),
                total,
            )
            .select_from(TransactionModel)
            .outerjoin(CategoryModel, CategoryModel.id == TransactionModel.category_id)
            .where(
                TransactionModel.user_id == user_id,
                TransactionModel.type == "expense",
                TransactionModel.date >= start,
                TransactionModel.date <= end,
            )
            .group_by(CategoryModel.id, CategoryModel.name, CategoryModel.color, CategoryModel.icon)
            .order_by(total.desc())
        ).all()
        return [CategoryTotal(category_id=cid, name=n, color=c, icon=i, total=t) for cid, n, c, i, t in rows]

    def monthly_totals(self, user_id: int, start: date, end: date) -> dict[str, tuple[Decimal, Decimal]]:
        ym = func.to_char(TransactionModel.date, "YYYY-MM")
        rows = self._s.execute(
            select(ym, func.sum(_INCOME), func.sum(_EXPENSE))
            .where(TransactionModel.user_id == user_id, TransactionModel.date >= start, TransactionModel.date <= end)
            .group_by(ym)
        ).all()
        return {month: (income, expense) for month, income, expense in rows}
