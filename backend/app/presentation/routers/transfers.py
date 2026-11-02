from datetime import date

from fastapi import APIRouter, Depends, Response, status

from ...application.transfers import TransferData
from ...container import Container
from ...domain.entities import User
from ..dependencies import get_container, get_current_user
from ..schemas import TransferIn, TransferOut

router = APIRouter(prefix="/transfers", tags=["transfers"])


@router.get("", response_model=list[TransferOut])
def list_transfers(
    month: str | None = None,
    start: date | None = None,
    end: date | None = None,
    account_id: int | None = None,
    user: User = Depends(get_current_user),
    c: Container = Depends(get_container),
):
    """Filtra por mes (YYYY-MM) o por rango [start, end]; con `account_id`, las que salen o llegan a esa cuenta."""
    return c.list_transfers.execute(user.id, month, start, end, account_id)


@router.post("", response_model=TransferOut, status_code=status.HTTP_201_CREATED)
def create_transfer(data: TransferIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return c.create_transfer.execute(user, TransferData(**data.model_dump()))


@router.put("/{transfer_id}", response_model=TransferOut)
def update_transfer(
    transfer_id: int, data: TransferIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)
):
    return c.update_transfer.execute(user, transfer_id, TransferData(**data.model_dump()))


@router.delete("/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transfer(transfer_id: int, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    c.delete_transfer.execute(user.id, transfer_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
