"""FDIC BankFind (dominio público): todos los bancos activos de EE. UU., con sitio web y activos."""

from __future__ import annotations

import math

from ..common import Record, clean_name, domain_from_url, fetch

API = "https://api.fdic.gov/banks/institutions"


def collect(progress=print) -> list[Record]:
    records: list[Record] = []
    offset = 0
    while True:
        page = fetch(
            API,
            params={
                "filters": "ACTIVE:1",
                "fields": "NAME,WEBADDR,ASSET,CERT,STALP",
                "limit": 10000,
                "offset": offset,
                "sort_by": "ASSET",
                "sort_order": "DESC",
            },
        )
        rows = page.get("data", [])
        for row in rows:
            d = row["data"]
            asset = float(d.get("ASSET") or 0)  # miles de USD
            records.append(
                Record(
                    name=clean_name(d["NAME"]),
                    legal_name=d["NAME"],
                    country="US",
                    kind="bank",
                    source="fdic",
                    source_id=str(d.get("CERT")),
                    domain=domain_from_url(d.get("WEBADDR")),
                    # Popularidad comparable con Wikidata: log de los activos (los grandes ≈ 15-20).
                    popularity=round(max(math.log10(asset + 1) * 2 - 6, 0), 2),
                )
            )
        offset += len(rows)
        if not rows or offset >= page["meta"]["total"]:
            break
    progress(f"  fdic: {len(records)}")
    return records
