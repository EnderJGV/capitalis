from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ...domain.entities import User
from ...infrastructure.catalog import Institution, get_catalog
from ..dependencies import get_current_user

router = APIRouter(prefix="/catalog", tags=["catalog"])


class CountryOut(BaseModel):
    code: str
    name: str
    currency: str | None
    count: int


class InstitutionOut(BaseModel):
    id: str
    name: str
    country: str
    kind: str
    domain: str | None = None
    color: str | None = None


class InstitutionPage(BaseModel):
    total: int
    items: list[InstitutionOut]


def institution_out(i: Institution) -> InstitutionOut:
    return InstitutionOut(id=i.id, name=i.name, country=i.country, kind=i.kind, domain=i.domain, color=i.color)


@router.get("/countries", response_model=list[CountryOut])
def countries(_: User = Depends(get_current_user)):
    """Países con su moneda y cuántas instituciones tienen (solo los que tienen alguna)."""
    return [
        CountryOut(code=c.code, name=c.name, currency=c.currency, count=c.count) for c in get_catalog().countries if c.count
    ]


@router.get("/currencies", response_model=list[str])
def currencies(_: User = Depends(get_current_user)):
    return get_catalog().currencies


@router.get("/institutions", response_model=InstitutionPage)
def institutions(
    country: str | None = Query(default=None, max_length=8),
    q: str | None = Query(default=None, max_length=80),
    kind: str | None = Query(default=None, pattern="^(bank|digital|broker|cooperative|exchange)$"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=60, ge=1, le=200),
    _: User = Depends(get_current_user),
):
    """Búsqueda sin acentos por nombre, razón social o alias; sin `country`, busca en todo el mundo."""
    total, items = get_catalog().search(
        country=country.upper() if country else None, query=q, kind=kind, offset=offset, limit=limit
    )
    return InstitutionPage(total=total, items=[institution_out(i) for i in items])


@router.get("/institutions/{institution_id}", response_model=InstitutionOut)
def institution(institution_id: str, _: User = Depends(get_current_user)):
    found = get_catalog().get(institution_id)
    if not found:
        raise HTTPException(status_code=404, detail="Institución no encontrada")
    return institution_out(found)
