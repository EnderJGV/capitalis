from fastapi import APIRouter, Depends, Response, status

from ...application.cards import CardData
from ...container import Container
from ...domain.entities import CardOverview, User
from ..dependencies import get_container, get_current_user
from ..schemas import CardIn, CardOut, StatementOut
from .accounts import account_fields, check_institution

router = APIRouter(prefix="/cards", tags=["cards"])


def card_out(o: CardOverview) -> CardOut:
    return CardOut(
        **account_fields(o.account),
        debt=o.debt,
        available=o.available,
        credit_balance=o.credit_balance,
        current_statement=StatementOut.model_validate(o.current),
        next_due=StatementOut.model_validate(o.next_due) if o.next_due else None,
    )


@router.get("", response_model=list[CardOut])
def list_cards(
    include_archived: bool = False, user: User = Depends(get_current_user), c: Container = Depends(get_container)
):
    return [card_out(o) for o in c.list_cards.execute(user.id, include_archived)]


@router.get("/{card_id}", response_model=CardOut)
def get_card(card_id: int, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return card_out(c.get_card.execute(user.id, card_id))


@router.get("/{card_id}/statements", response_model=list[StatementOut])
def list_statements(card_id: int, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    """Todas las facturas de la tarjeta, de la más vieja a la más nueva (la abierta siempre aparece).

    Los movimientos de una factura se piden a /transactions con account_id, start=start_date y end=closing_date.
    """
    return [StatementOut.model_validate(s) for s in c.get_statements.execute(user.id, card_id)]


@router.post("", response_model=CardOut, status_code=status.HTTP_201_CREATED)
def create_card(data: CardIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    check_institution(data.institution)
    return card_out(c.create_card.execute(user.id, CardData(**data.model_dump())))


@router.put("/{card_id}", response_model=CardOut)
def update_card(
    card_id: int, data: CardIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)
):
    check_institution(data.institution)
    return card_out(c.update_card.execute(user.id, card_id, CardData(**data.model_dump())))


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(card_id: int, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    c.delete_card.execute(user.id, card_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
