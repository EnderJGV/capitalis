from datetime import date
from decimal import Decimal

from ..domain.exceptions import RateUnavailable
from .ports import ExchangeRateProvider, UnitOfWorkFactory

ONE = Decimal("1")


class CurrencyConverter:
    """Convierte montos entre monedas con la cotización de un día.

    Las cotizaciones (base USD) se piden al proveedor como mucho una vez por fecha: se guardan en la
    base de datos y en memoria. La tasa A→B se calcula cruzada: usd[B] / usd[A].
    """

    def __init__(self, uow_factory: UnitOfWorkFactory, provider: ExchangeRateProvider):
        self._uow_factory = uow_factory
        self._provider = provider
        self._memo: dict[date, dict[str, Decimal]] = {}

    def usd_rates(self, on: date) -> dict[str, Decimal] | None:
        on = min(on, date.today())
        if on in self._memo:
            return self._memo[on]
        with self._uow_factory() as uow:
            cached = uow.rates.usd_rates(on)
        if cached:
            self._memo[on] = cached
            return cached

        # Para hoy se usa la última publicación disponible; para fechas pasadas, la de ese día.
        fetched = self._provider.usd_rates(None if on == date.today() else on)
        if not fetched:
            return None
        with self._uow_factory() as uow:
            uow.rates.save_usd_rates(on, fetched)
            uow.commit()
        self._memo[on] = fetched
        return fetched

    def rate(self, base: str, quote: str, on: date) -> Decimal | None:
        if base == quote:
            return ONE
        rates = self.usd_rates(on)
        if not rates or base not in rates or quote not in rates:
            return None
        return rates[quote] / rates[base]

    def convert(self, amount: Decimal, base: str, quote: str, on: date) -> Decimal | None:
        rate = self.rate(base, quote, on)
        return None if rate is None else (amount * rate).quantize(Decimal("0.01"))


class GetRate:
    def __init__(self, converter: CurrencyConverter):
        self._converter = converter

    def execute(self, base: str, quote: str, on: date | None = None) -> tuple[Decimal, date]:
        on = min(on or date.today(), date.today())
        rate = self._converter.rate(base, quote, on)
        if rate is None:
            raise RateUnavailable()
        return rate.quantize(Decimal("0.00000001")), on
