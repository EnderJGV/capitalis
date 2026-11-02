from fastapi import APIRouter, Depends, Response, status

from ...application.accounts import AccountData
from ...container import Container
from ...domain.entities import AccountBalance, User
from ..dependencies import get_container, get_current_user
from ...domain.exceptions import UnknownInstitution
from ...infrastructure.catalog import get_catalog
from ..schemas import AccountIn, AccountOut


def _check_institution(institution: str | None) -> None:
    if institution and not get_catalog().exists(institution):
        raise UnknownInstitution()

router = APIRouter(prefix="/accounts", tags=["accounts"])


def account_out(item: AccountBalance) -> AccountOut:
    a = item.account
    return AccountOut(
        id=a.id,
        name=a.name,
        currency=a.currency,
        kind=a.kind,
        institution=a.institution,
        initial_balance=a.initial_balance,
        archived=a.archived,
        balance=a.balance if a.balance is not None else a.initial_balance,
        converted_balance=item.converted_balance,
    )


@router.get("", response_model=list[AccountOut])
def list_accounts(
    include_archived: bool = False, user: User = Depends(get_current_user), c: Container = Depends(get_container)
):
    return [account_out(item) for item in c.list_accounts.execute(user, include_archived)]


@router.get("/{account_id}", response_model=AccountOut)
def get_account(account_id: int, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return account_out(AccountBalance(c.get_account.execute(user.id, account_id), None))


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(data: AccountIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    _check_institution(data.institution)
    return account_out(AccountBalance(c.create_account.execute(user.id, AccountData(**data.model_dump())), None))


@router.put("/{account_id}", response_model=AccountOut)
def update_account(
    account_id: int, data: AccountIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)
):
    _check_institution(data.institution)
    updated = c.update_account.execute(user.id, account_id, AccountData(**data.model_dump()))
    return account_out(AccountBalance(updated, None))


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: int, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    c.delete_account.execute(user.id, account_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
