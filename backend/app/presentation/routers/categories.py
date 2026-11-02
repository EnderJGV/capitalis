from fastapi import APIRouter, Depends, Response, status

from ...container import Container
from ...domain.entities import User
from ..dependencies import get_container, get_current_user
from ..schemas import CategoryIn, CategoryOut

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return c.list_categories.execute(user.id)


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryIn, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return c.create_category.execute(user.id, data.name, data.type, data.color)


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    data: CategoryIn,
    user: User = Depends(get_current_user),
    c: Container = Depends(get_container),
):
    return c.update_category.execute(user.id, category_id, data.name, data.type, data.color)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    c.delete_category.execute(user.id, category_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
