class DomainError(Exception):
    message = "Error de dominio"

    def __init__(self, message: str | None = None):
        super().__init__(message or self.message)
        self.message = message or self.message


class EmailAlreadyRegistered(DomainError):
    message = "El email ya está registrado"


class InvalidCredentials(DomainError):
    message = "Email o contraseña incorrectos"


class Unauthenticated(DomainError):
    message = "No autenticado"


class EntityNotFound(DomainError):
    message = "Recurso no encontrado"


class DuplicateCategory(DomainError):
    message = "Ya existe una categoría con ese nombre y tipo"


class CategoryHasTransactions(DomainError):
    message = "No se puede cambiar el tipo: tiene transacciones"


class CategoryTypeMismatch(DomainError):
    message = "La categoría no coincide con el tipo"


class InvalidMonth(DomainError):
    message = "month debe tener formato YYYY-MM"


class InvalidAmount(DomainError):
    message = "El monto debe ser mayor que 0"


class InvalidDateRange(DomainError):
    message = "La fecha inicial no puede ser posterior a la final"
