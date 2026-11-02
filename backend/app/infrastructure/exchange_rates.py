"""Cotizaciones desde currency-api (https://github.com/fawazahmed0/exchange-api): gratuita, sin clave,
150+ monedas (incluido VES) y con historial por fecha."""

import logging
from datetime import date
from decimal import Decimal, InvalidOperation

import httpx

log = logging.getLogger(__name__)

SOURCES = (
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{version}/v1/currencies/usd.json",
    "https://{version}.currency-api.pages.dev/v1/currencies/usd.json",
)


class CurrencyApiRateProvider:
    def __init__(self, timeout: float = 5.0):
        self._timeout = timeout

    def usd_rates(self, on: date | None) -> dict[str, Decimal] | None:
        version = on.isoformat() if on else "latest"
        for template in SOURCES:
            url = template.format(version=version)
            try:
                response = httpx.get(url, timeout=self._timeout, follow_redirects=True)
                response.raise_for_status()
                raw = response.json().get("usd", {})
                rates = {}
                for code, value in raw.items():
                    if len(code) == 3 and isinstance(value, (int, float)) and value > 0:
                        rates[code.upper()] = Decimal(str(value))
                if rates:
                    rates["USD"] = Decimal("1")
                    return rates
            except (httpx.HTTPError, ValueError, InvalidOperation) as error:
                log.warning("Cotizaciones no disponibles en %s: %s", url, error)
        return None
