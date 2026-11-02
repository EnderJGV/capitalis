from functools import lru_cache

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..container import Container
from ..domain.entities import User

bearer = HTTPBearer(auto_error=False)


@lru_cache
def get_container() -> Container:
    return Container()


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    container: Container = Depends(get_container),
) -> User:
    return container.authenticate_user.execute(creds.credentials if creds else None)
