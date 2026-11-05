"""Construye el catálogo mundial de instituciones financieras.

Uso (desde backend/):  .venv/Scripts/python -m scripts.catalog.build
Las descargas quedan en scripts/catalog/.cache (30-60 días), así que reconstruir es rápido.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date

from .common import KINDS, OUTPUT, Record, fetch, search_key, slugify
from .curated.brands import BRANDS as CORE_BRANDS
from .curated.legacy import LEGACY_IDS
from .curated.world import WORLD

BRANDS = CORE_BRANDS + WORLD
from .sources import brasil, fdic, wikidata

# Moneda principal cuando Wikidata registra varias (dolarización, monedas paralelas, etc.).
CURRENCY_OVERRIDES = {
    "PA": "USD", "EC": "USD", "SV": "USD", "TL": "USD", "FM": "USD", "MH": "USD", "PW": "USD", "BQ": "USD",
    "VG": "USD", "TC": "USD", "PR": "USD", "VE": "VES", "CU": "CUP", "ZW": "ZWG", "PS": "ILS", "XK": "EUR",
    "ME": "EUR", "AD": "EUR", "MC": "EUR", "SM": "EUR", "VA": "EUR", "LI": "CHF", "KI": "AUD", "NR": "AUD",
    "TV": "AUD", "CK": "NZD", "NU": "NZD", "GL": "DKK", "FO": "DKK", "BT": "BTN", "NA": "NAD", "LS": "LSL",
    "SZ": "SZL", "HK": "HKD", "MO": "MOP", "CW": "ANG", "SX": "ANG", "AW": "AWG",
}

def log(msg: str) -> None:
    print(msg, flush=True)


class Entry:
    """Institución unificada (lo que se publica en el catálogo)."""

    def __init__(self, id: str, name: str, country: str, kind: str):
        self.id, self.name, self.country, self.kind = id, name, country, kind
        self.domain: str | None = None
        self.color: str | None = None
        self.legal_names: set[str] = set()
        self.aliases: set[str] = set()
        self.score = 0.0
        self.sources: set[str] = set()
        self.curated = False

    def absorb(self, r: Record) -> None:
        self.sources.add(r.source)
        if r.legal_name and search_key(r.legal_name) != search_key(self.name):
            self.legal_names.add(r.legal_name)
        self.aliases.update(a for a in r.aliases if search_key(a) != search_key(self.name))
        if not self.curated:
            self.domain = self.domain or r.domain
            self.score = max(self.score, r.popularity + (1 if r.domain else 0))
            # Preferir un nombre de marca de Wikidata sobre la razón social de un registro oficial.
            if r.source == "wikidata" and self.sources - {"wikidata"} and len(r.name) < len(self.name):
                self.name = r.name

    def to_json(self) -> dict:
        data = {"id": self.id, "name": self.name, "kind": self.kind, "score": round(self.score, 2)}
        if self.domain:
            data["domain"] = self.domain
        if self.color:
            data["color"] = self.color
        if self.legal_names:
            data["legal"] = sorted(self.legal_names)[:2]
        if self.aliases:
            data["aliases"] = sorted(self.aliases)[:6]
        return data


def build() -> None:
    log("1/4 Descargando fuentes…")
    countries, wiki_records = wikidata.collect(log)
    records = wiki_records + fdic.collect(log) + brasil.collect(log)
    log(f"   registros totales: {len(records)}")

    log("2/4 Aplicando curaduría…")
    entries: dict[str, Entry] = {}
    curated_by_country: dict[str, list[tuple[Entry, re.Pattern | None, set[str]]]] = defaultdict(list)
    total = len(BRANDS)
    for rank, (bid, name, cc, kind, domain, color, aliases, pattern) in enumerate(BRANDS):
        e = Entry(bid, name, cc, kind)
        e.domain, e.color, e.curated = domain, color, True
        e.aliases.update(aliases)
        e.sources.add("curated")
        e.score = 1000 + (total - rank)  # siempre por encima de lo no curado, en el orden de la lista
        entries[bid] = e
        keys = {search_key(name)} | {search_key(a) for a in aliases}
        curated_by_country[cc].append((e, re.compile(pattern) if pattern else None, keys))

    def curated_match(r: Record) -> Entry | None:
        keys = {search_key(r.name), search_key(r.legal_name or r.name)}
        for scope in (r.country, "INTL"):
            for e, pattern, names in curated_by_country.get(scope, []):
                if keys & names:
                    return e
                if pattern and any(pattern.search(k) for k in keys):
                    return e
                if r.domain and e.domain and r.domain == e.domain and scope == r.country:
                    return e
        return None

    # Bancos centrales y de desarrollo: no se abren cuentas personales en ellos.
    not_for_people = re.compile(
        r"\b(central bank|banco central|reserve bank|development bank|banco de desarrollo|banco de fomento|"
        r"desenvolvimento|investment bank of|export import bank|eximbank|world bank|monetary authority)\b"
    )

    pool: list[Record] = []
    matched = 0
    for r in records:
        if not_for_people.search(search_key(r.legal_name or r.name)) or not_for_people.search(search_key(r.name)):
            continue
        e = curated_match(r)
        if e:
            e.absorb(r)
            matched += 1
        else:
            pool.append(r)
    log(f"   registros unidos a marcas curadas: {matched}")

    log("3/4 Unificando duplicados…")
    by_key: dict[tuple[str, str], Entry] = {}
    used_ids = set(entries)
    for r in sorted(pool, key=lambda r: -r.popularity):
        if r.kind not in KINDS or not r.name.strip():
            continue
        name_key = (r.country, search_key(r.name))
        domain_key = (r.country, "@" + r.domain) if r.domain else None
        e = by_key.get(name_key) or (by_key.get(domain_key) if domain_key else None)
        if not e:
            # Nombres en alfabetos no latinos no generan slug: se usa el id de la fuente.
            base = f"{r.country.lower()}-{slugify(r.name) or slugify(r.source_id)}"
            new_id, n = base, 2
            while new_id in used_ids:
                new_id, n = f"{base}-{n}", n + 1
            used_ids.add(new_id)
            e = Entry(new_id, r.name, r.country, r.kind)
            entries[new_id] = e
        e.absorb(r)
        by_key[name_key] = e
        if domain_key:
            by_key[domain_key] = e

    log("4/4 Escribiendo archivos…")
    missing_legacy = LEGACY_IDS - set(entries)
    if missing_legacy:
        sys.exit(f"Faltan ids que ya usan cuentas existentes: {sorted(missing_legacy)}")

    per_country: dict[str, list[Entry]] = defaultdict(list)
    for e in entries.values():
        per_country[e.country].append(e)

    supported = {code.upper() for code in fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json")}
    country_rows = []
    for c in countries + [{"iso": "INTL", "name": "International", "currencies": ["USD"]}]:
        iso = c["iso"]
        currency = CURRENCY_OVERRIDES.get(iso) or next((x for x in c["currencies"] if x in supported), None) or (
            c["currencies"][0] if c["currencies"] else None
        )
        country_rows.append({"code": iso, "name": c["name"], "currency": currency, "count": len(per_country.get(iso, []))})

    currencies = sorted({row["currency"] for row in country_rows if row["currency"]} | {"USD", "EUR"})
    currency_rows = [{"code": code, "convertible": code in supported} for code in currencies]

    out_dir = OUTPUT / "institutions"
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*.json"):
        old.unlink()
    for cc, items in per_country.items():
        items.sort(key=lambda e: (-e.score, e.name.lower()))
        (out_dir / f"{cc}.json").write_text(
            json.dumps([e.to_json() for e in items], ensure_ascii=False, separators=(",", ":")), "utf-8"
        )
    (OUTPUT / "countries.json").write_text(json.dumps(country_rows, ensure_ascii=False, indent=1), "utf-8")
    (OUTPUT / "currencies.json").write_text(json.dumps(currency_rows, indent=1), "utf-8")
    write_report(entries, country_rows, currency_rows, len(records), matched)
    log(f"Listo: {len(entries)} instituciones en {len(per_country)} países → {OUTPUT}")


def write_report(entries, country_rows, currency_rows, n_records, matched) -> None:
    by_country = Counter(e.country for e in entries.values())
    by_kind = Counter(e.kind for e in entries.values())
    with_domain = sum(1 for e in entries.values() if e.domain)
    focus = ["BR", "MX", "VE", "CO", "AR", "CL", "PE", "EC", "UY", "PY", "BO", "PA", "CR", "GT", "HN", "SV", "NI",
             "DO", "CU", "PR", "US", "CA", "ES", "PT", "GB", "DE", "FR", "IT", "INTL"]
    kinds_by_country = defaultdict(Counter)
    for e in entries.values():
        kinds_by_country[e.country][e.kind] += 1

    lines = [
        "# Catálogo mundial de instituciones financieras",
        "",
        f"Generado el {date.today().isoformat()} con `python -m scripts.catalog.build`.",
        "",
        "## Resumen",
        "",
        f"- **{len(entries):,} instituciones** en **{sum(1 for r in country_rows if r['count'])} países/territorios** "
        f"(de {len(country_rows)} con código ISO).",
        f"- Con dominio (logo real): {with_domain:,} ({with_domain * 100 // max(len(entries), 1)} %). Las demás usan monograma.",
        "- Por tipo: " + ", ".join(f"{k} {v:,}" for k, v in by_kind.most_common()),
        f"- Registros leídos de las fuentes: {n_records:,}; unidos a marcas curadas: {matched:,}; marcas curadas: {len(BRANDS)}.",
        f"- Monedas: {len(currency_rows)} ({sum(1 for c in currency_rows if c['convertible'])} con cotización disponible).",
        "",
        "## Fuentes",
        "",
        "| Fuente | Licencia | Uso |",
        "|---|---|---|",
        "| Wikidata | CC0 | Bancos de todos los países, cooperativas, corretoras, neobancos, pagos y exchanges; popularidad por artículos de Wikipedia |",
        "| FDIC BankFind | Dominio público | Todos los bancos activos de EE. UU. con sitio web y activos |",
        "| BrasilAPI (lista del Banco Central do Brasil) | Datos públicos | Bancos, IP, SCD, DTVM y corretoras de Brasil |",
        "| Curaduría (`curated/brands.py`) | Propia | Nombre comercial, dominio, color y orden de las instituciones más usadas |",
        "",
        "No se usaron: NCUA (bloquea descargas automáticas, HTTP 403), lista de broker-dealers de la SEC (exige un e-mail de",
        "contacto real; además son mayormente institucionales) ni el registro de la EBA (descarga no automatizable).",
        "",
        "## Países foco",
        "",
        "| País | Total | Bancos | Digitales | Corretoras | Cooperativas | Exchanges | Top 5 |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for cc in focus:
        items = sorted((e for e in entries.values() if e.country == cc), key=lambda e: -e.score)
        k = kinds_by_country[cc]
        lines.append(
            f"| {cc} | {by_country[cc]} | {k['bank']} | {k['digital']} | {k['broker']} | {k['cooperative']} | {k['exchange']} | "
            + ", ".join(e.name for e in items[:5])
            + " |"
        )
    lines += ["", "## Todos los países", "", "| Código | País | Moneda | Instituciones |", "|---|---|---|---|"]
    for row in sorted(country_rows, key=lambda r: (-r["count"], r["code"])):
        lines.append(f"| {row['code']} | {row['name']} | {row['currency'] or '—'} | {row['count']} |")
    thin = [r["code"] for r in country_rows if r["count"] < 3]
    lines += ["", f"## Países con poca cobertura (< 3): {len(thin)}", "", ", ".join(thin), ""]
    (OUTPUT / "REPORT.md").write_text("\n".join(lines), "utf-8")


if __name__ == "__main__":
    build()
