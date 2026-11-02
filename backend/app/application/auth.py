from dataclasses import dataclass, replace

from ..domain.defaults import DEFAULT_CATEGORIES_BY_LANGUAGE
from ..domain.entities import Category, User
from ..domain.exceptions import EmailAlreadyRegistered, InvalidCredentials, Unauthenticated
from .ports import PasswordHasher, TokenService, UnitOfWorkFactory


@dataclass(frozen=True)
class AuthResult:
    access_token: str
    user: User


class RegisterUser:
    def __init__(self, uow_factory: UnitOfWorkFactory, hasher: PasswordHasher, tokens: TokenService):
        self._uow_factory = uow_factory
        self._hasher = hasher
        self._tokens = tokens

    def execute(self, name: str, email: str, password: str, currency: str, language: str = "es") -> AuthResult:
        email = email.lower()
        with self._uow_factory() as uow:
            if uow.users.get_by_email(email):
                raise EmailAlreadyRegistered()
            user = uow.users.add(
                User(
                    id=None,
                    name=name,
                    email=email,
                    password_hash=self._hasher.hash(password),
                    currency=currency,
                    language=language,
                )
            )
            uow.categories.add_many(
                [
                    Category(id=None, user_id=user.id, name=n, type=t, color=c, icon=i)
                    for n, t, c, i in DEFAULT_CATEGORIES_BY_LANGUAGE.get(language, DEFAULT_CATEGORIES_BY_LANGUAGE["es"])
                ]
            )
            uow.commit()
        return AuthResult(self._tokens.create(user.id), user)


class LoginUser:
    def __init__(self, uow_factory: UnitOfWorkFactory, hasher: PasswordHasher, tokens: TokenService):
        self._uow_factory = uow_factory
        self._hasher = hasher
        self._tokens = tokens

    def execute(self, email: str, password: str) -> AuthResult:
        with self._uow_factory() as uow:
            user = uow.users.get_by_email(email.lower())
        if not user or not self._hasher.verify(password, user.password_hash):
            raise InvalidCredentials()
        return AuthResult(self._tokens.create(user.id), user)


class AuthenticateUser:
    """Resolves a bearer token to its user."""

    def __init__(self, uow_factory: UnitOfWorkFactory, tokens: TokenService):
        self._uow_factory = uow_factory
        self._tokens = tokens

    def execute(self, token: str | None) -> User:
        user_id = self._tokens.decode(token) if token else None
        if user_id is None:
            raise Unauthenticated()
        with self._uow_factory() as uow:
            user = uow.users.get(user_id)
        if not user:
            raise Unauthenticated()
        return user


class UpdateProfile:
    def __init__(self, uow_factory: UnitOfWorkFactory):
        self._uow_factory = uow_factory

    def execute(self, user: User, name: str | None, currency: str | None, language: str | None = None) -> User:
        changes = {k: v for k, v in {"name": name, "currency": currency, "language": language}.items() if v is not None}
        with self._uow_factory() as uow:
            updated = uow.users.update(replace(user, **changes))
            uow.commit()
        return updated
