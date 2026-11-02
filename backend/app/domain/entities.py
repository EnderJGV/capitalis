from dataclasses import dataclass
from datetime import date as Date
from decimal import Decimal
from typing import Literal

from .exceptions import InvalidAmount

TxType = Literal["income", "expense"]
Language = Literal["es", "pt", "en"]


@dataclass
class User:
    id: int | None
    name: str
    email: str
    password_hash: str
    currency: str = "BRL"
    language: str = "es"


@dataclass
class Category:
    id: int | None
    user_id: int
    name: str
    type: TxType
    color: str = "#6b7280"
    icon: str = ""


@dataclass
class Transaction:
    id: int | None
    user_id: int
    type: TxType
    amount: Decimal
    date: Date
    description: str = ""
    category_id: int | None = None
    category: Category | None = None

    def __post_init__(self):
        if self.amount <= 0:
            raise InvalidAmount()


@dataclass(frozen=True)
class CategoryTotal:
    category_id: int | None
    name: str
    color: str
    total: Decimal
    icon: str = ""


@dataclass(frozen=True)
class MonthTotal:
    month: str
    income: Decimal
    expense: Decimal


@dataclass(frozen=True)
class Summary:
    month: str
    income: Decimal
    expense: Decimal
    balance: Decimal
    total_balance: Decimal
    expenses_by_category: list[CategoryTotal]
    last_months: list[MonthTotal]
