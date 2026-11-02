from datetime import date

from fastapi import APIRouter, Depends, Response, status

from ...application.transactions import TransactionData
from ...container import Container
from ...domain.entities import User
from ..dependencies import get_container, get_current_user
from ..schemas import TransactionIn, TransactionOut, TxType

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    month: str | None = None,
    start: date | None = None,
    end: date | None = None,
    type: TxType | None = None,
    category_id: int | None = None,
    account_id: int | None = None,
    user: User = Depends(get_current_user),
    c: Container = Depends(get_container),
):
    """Filtra por mes (YYYY-MM) o por un rango de fechas [start, end]; `month` tiene prioridad."""
    return c.list_transactions.execute(user.id, month, type, category_id, start, end, account_id)


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)
):
    return c.create_transaction.execute(user.id, TransactionData(**data.model_dump()))


@router.put("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    data: TransactionIn,
    user: User = Depends(get_current_user),
    c: Container = Depends(get_container),
):
    return c.update_transaction.execute(user.id, transaction_id, TransactionData(**data.model_dump()))


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int, user: User = Depends(get_current_user), c: Container = Depends(get_container)
):
    c.delete_transaction.execute(user.id, transaction_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
