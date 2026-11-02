from fastapi import APIRouter, Depends, status

from ...container import Container
from ...domain.entities import User
from ..dependencies import get_container, get_current_user
from ..schemas import LoginIn, RegisterIn, TokenOut, UserOut, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, c: Container = Depends(get_container)):
    return c.register_user.execute(data.name, data.email, data.password, data.currency)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, c: Container = Depends(get_container)):
    return c.login_user.execute(data.email, data.password)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(data: UserUpdate, user: User = Depends(get_current_user), c: Container = Depends(get_container)):
    return c.update_profile.execute(user, data.name, data.currency)
