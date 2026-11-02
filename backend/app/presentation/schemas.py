from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

TxType = Literal["income", "expense"]
Currency = Literal["BRL", "USD", "EUR", "ARS", "MXN", "CLP", "COP", "PEN"]


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    currency: Currency = "BRL"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    currency: Currency | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    currency: str


class TokenOut(BaseModel):
    access_token: str
    user: UserOut


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    type: TxType
    color: str = Field(default="#6b7280", pattern=r"^#[0-9a-fA-F]{6}$")


class CategoryOut(CategoryIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class TransactionIn(BaseModel):
    type: TxType
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    description: str = Field(default="", max_length=255)
    date: date
    category_id: int | None = None


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: TxType
    amount: Decimal
    description: str
    date: date
    category_id: int | None
    category: CategoryOut | None = None


class CategoryTotalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    category_id: int | None
    name: str
    color: str
    total: Decimal


class MonthTotalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    month: str
    income: Decimal
    expense: Decimal


class SummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    month: str
    income: Decimal
    expense: Decimal
    balance: Decimal
    total_balance: Decimal
    expenses_by_category: list[CategoryTotalOut]
    last_months: list[MonthTotalOut]
