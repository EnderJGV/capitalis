from datetime import date

from fastapi import APIRouter, Depends, Query

from ...container import Container
from ...domain.entities import User
from ..dependencies import get_container, get_current_user
from ..schemas import Currency, RateOut

router = APIRouter(prefix="/rates", tags=["rates"])


@router.get("", response_model=RateOut)
def get_rate(
    base: Currency = Query(alias="from"),
    quote: Currency = Query(alias="to"),
    on: date | None = Query(default=None, alias="date"),
    _: User = Depends(get_current_user),
    c: Container = Depends(get_container),
):
    """Cotización aproximada: 1 `from` = `rate` `to` en la fecha indicada (hoy por defecto)."""
    rate, used_date = c.get_rate.execute(base, quote, on)
    return RateOut(base=base, quote=quote, rate=rate, date=used_date)
