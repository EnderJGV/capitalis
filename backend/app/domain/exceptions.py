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


class AccountNotFound(DomainError):
    message = "Cuenta no encontrada"


class AccountRequired(DomainError):
    message = "Elige una cuenta: primero registra una si todavía no tienes"


class AccountArchived(DomainError):
    message = "La cuenta está archivada"


class AccountHasMovements(DomainError):
    message = "La cuenta tiene movimientos: archívala en lugar de eliminarla"


class AccountCurrencyLocked(DomainError):
    message = "No se puede cambiar la moneda de una cuenta con movimientos"


class DuplicateAccount(DomainError):
    message = "Ya tienes una cuenta con ese nombre"


class SameAccountTransfer(DomainError):
    message = "La cuenta de origen y la de destino deben ser distintas"


class InvalidFee(DomainError):
    message = "La comisión no puede ser negativa"


class TransferNotFound(DomainError):
    message = "Transferencia no encontrada"


class TransferFeeLocked(DomainError):
    message = "Esta comisión pertenece a una transferencia: edítala desde la transferencia"


class RateUnavailable(DomainError):
    message = "No se pudo obtener la cotización; escribe el tipo de cambio a mano"


class UnknownInstitution(DomainError):
    message = "La institución no existe en el catálogo"


class CardNotFound(DomainError):
    message = "Tarjeta no encontrada"


class InvalidCardDays(DomainError):
    message = "Los días de cierre y de vencimiento deben estar entre 1 y 31"


class InvalidLast4(DomainError):
    message = "Escribe solo los últimos 4 dígitos de la tarjeta"


class InvalidCreditLimit(DomainError):
    message = "El límite no puede ser negativo"


class PaymentAccountIsCard(DomainError):
    message = "La cuenta de pago debe ser una cuenta, no una tarjeta"


class InvalidInstallments(DomainError):
    message = "El número de cuotas debe estar entre 2 y 48"


class InstallmentsOnlyOnCards(DomainError):
    message = "Las compras en cuotas solo se registran en tarjetas de crédito"


class ForeignFeeLocked(DomainError):
    message = "Esta tarifa pertenece a una compra en otra moneda: edítala desde la compra"


class RefundOnlyOnCards(DomainError):
    message = "Los reembolsos solo se registran en tarjetas de crédito"
