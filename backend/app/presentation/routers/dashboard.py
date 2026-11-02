from fastapi import APIRouter, Depends

from ...container import Container
from ...domain.entities import User
from ..dependencies import get_container, get_current_user
from ..schemas import SummaryOut
from .accounts import account_out
from .cards import card_out

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=SummaryOut)
def summary(month: str | None = None, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    s = c.get_summary.execute(user, month)
    return SummaryOut(
        month=s.month,
        income=s.income,
        expense=s.expense,
        balance=s.balance,
        total_balance=s.total_balance,
        expenses_by_category=s.expenses_by_category,
        last_months=s.last_months,
        currency=s.currency,
        approximate=s.approximate,
        missing_currencies=s.missing_currencies,
        accounts=[account_out(a) for a in s.accounts],
        cards=[card_out(card) for card in s.cards],
    )
