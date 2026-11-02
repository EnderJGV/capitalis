"""BrasilAPI: lista oficial de instituciones del Banco Central do Brasil (bancos, IP, SCD, DTVM, corretoras)."""

from __future__ import annotations

import re

from ..common import Record, clean_name, fetch

API = "https://brasilapi.com.br/api/banks/v1"

_BROKER = re.compile(r"corretora|dtvm|distribuidora de t[ií]tulos|valores mobili", re.I)
_DIGITAL = re.compile(r"institui[cç][aã]o de pagamento|sociedade de cr[eé]dito direto|\bscd\b|pagamentos|\bip\b", re.I)
_COOP = re.compile(r"cooperativa|sicoob|sicredi|cresol|unicred|ailos|\bcoop\b", re.I)


def kind_of(legal_name: str) -> str:
    if _COOP.search(legal_name):
        return "cooperative"
    if _BROKER.search(legal_name):
        return "broker"
    if _DIGITAL.search(legal_name):
        return "digital"
    return "bank"


def collect(progress=print) -> list[Record]:
    records = []
    for row in fetch(API):
        legal = (row.get("fullName") or row.get("name") or "").strip()
        if not legal:
            continue
        short = (row.get("name") or legal).strip()
        records.append(
            Record(
                name=clean_name(short if len(short) > 3 else legal),
                legal_name=legal,
                country="BR",
                kind=kind_of(legal),
                source="bcb",
                source_id=str(row.get("ispb") or row.get("code")),
                aliases=[str(row["code"])] if row.get("code") else [],
                popularity=0.5,
            )
        )
    progress(f"  brasil (BCB): {len(records)}")
    return records
