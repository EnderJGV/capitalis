"""Catálogo mundial de instituciones financieras, cargado en memoria desde app/data/catalog.

Los archivos los genera `python -m scripts.catalog.build`. ~18 mil registros ≈ 3 MB: no necesita base de datos.
"""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "catalog"
SPECIAL_IDS = {"cash"}


def _key(text: str) -> str:
    plain = "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", plain.lower()).strip()


@dataclass(frozen=True)
class Institution:
    id: str
    name: str
    country: str
    kind: str
    score: float
    domain: str | None
    color: str | None
    search: str  # nombre + razón social + alias, normalizado


@dataclass(frozen=True)
class Country:
    code: str
    name: str
    currency: str | None
    count: int


class InstitutionCatalog:
    def __init__(self, data_dir: Path = DATA_DIR):
        self.countries: list[Country] = [
            Country(c["code"], c["name"], c.get("currency"), c["count"])
            for c in json.loads((data_dir / "countries.json").read_text("utf-8"))
        ]
        self.currencies: list[str] = [c["code"] for c in json.loads((data_dir / "currencies.json").read_text("utf-8"))]
        self.by_country: dict[str, list[Institution]] = {}
        self.by_id: dict[str, Institution] = {}
        for path in (data_dir / "institutions").glob("*.json"):
            code = path.stem
            items = []
            for row in json.loads(path.read_text("utf-8")):
                names = [row["name"], *row.get("legal", []), *row.get("aliases", [])]
                inst = Institution(
                    id=row["id"],
                    name=row["name"],
                    country=code,
                    kind=row["kind"],
                    score=row.get("score", 0),
                    domain=row.get("domain"),
                    color=row.get("color"),
                    search=" | ".join(_key(n) for n in names),
                )
                items.append(inst)
                self.by_id[inst.id] = inst
            self.by_country[code] = items  # ya vienen ordenadas por popularidad

    def get(self, institution_id: str) -> Institution | None:
        return self.by_id.get(institution_id)

    def exists(self, institution_id: str) -> bool:
        return institution_id in SPECIAL_IDS or institution_id in self.by_id

    def search(
        self,
        *,
        country: str | None = None,
        query: str | None = None,
        kind: str | None = None,
        prefer: str | None = None,
        offset: int = 0,
        limit: int = 60,
    ) -> tuple[int, list[Institution]]:
        """Instituciones de un país (o del mundo) filtradas por tipo y por texto; las más populares primero."""
        pool = self.by_country.get(country, []) if country else [i for items in self.by_country.values() for i in items]
        if kind:
            pool = [i for i in pool if i.kind == kind]
        q = _key(query or "")
        if q:
            words = q.split()
            ranked = []
            for i in pool:
                if not all(w in i.search for w in words):
                    continue
                name = _key(i.name)
                tier = 0 if name == q else 1 if name.startswith(q) else 2 if q in name else 3
                ranked.append(((tier, -i.score), i))
            ranked.sort(key=lambda pair: pair[0])
            pool = [i for _, i in ranked]
        elif not country:
            # En todo el mundo: primero el país preferido (el de la moneda del usuario), luego el resto.
            pool = sorted(pool, key=lambda i: (i.country != prefer, -i.score))
        return len(pool), pool[offset : offset + limit]


@lru_cache(maxsize=1)
def get_catalog() -> InstitutionCatalog:
    return InstitutionCatalog()
