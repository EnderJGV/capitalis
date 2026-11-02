from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from ..domain import exceptions as exc

STATUS_BY_ERROR: dict[type[exc.DomainError], int] = {
    exc.EmailAlreadyRegistered: status.HTTP_409_CONFLICT,
    exc.DuplicateCategory: status.HTTP_409_CONFLICT,
    exc.CategoryHasTransactions: status.HTTP_409_CONFLICT,
    exc.InvalidCredentials: status.HTTP_401_UNAUTHORIZED,
    exc.Unauthenticated: status.HTTP_401_UNAUTHORIZED,
    exc.EntityNotFound: status.HTTP_404_NOT_FOUND,
    exc.CategoryTypeMismatch: status.HTTP_422_UNPROCESSABLE_ENTITY,
    exc.InvalidMonth: status.HTTP_422_UNPROCESSABLE_ENTITY,
    exc.InvalidAmount: status.HTTP_422_UNPROCESSABLE_ENTITY,
    exc.InvalidDateRange: status.HTTP_422_UNPROCESSABLE_ENTITY,
}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(exc.DomainError)
    async def handle_domain_error(_: Request, error: exc.DomainError):
        code = STATUS_BY_ERROR.get(type(error), status.HTTP_400_BAD_REQUEST)
        # "code" es estable (nombre de la excepción): el frontend lo usa para mostrar el mensaje en el idioma del usuario.
        return JSONResponse({"detail": error.message, "code": type(error).__name__}, status_code=code)
