from fastapi import APIRouter, Depends

from ...container import Container
from ...domain.entities import User
from ..dependencies import get_container, get_current_user
from ..schemas import SummaryOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=SummaryOut)
def summary(month: str | None = None, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return c.get_summary.execute(user.id, month)
