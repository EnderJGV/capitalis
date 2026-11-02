"""Utilidades del pipeline del catálogo: descargas con caché local y normalización de nombres."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import time
import unicodedata
from dataclasses import asdict, dataclass, field
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".cache"
OUTPUT = ROOT.parents[1] / "app" / "data" / "catalog"
USER_AGENT = "CapitalisResearch/0.1 (catalog research)"

KINDS = ("bank", "digital", "broker", "cooperative", "exchange")


@dataclass
class Record:
    """Una institución tal como la entrega una fuente, antes de unificar."""

    name: str
    country: str  # ISO 3166-1 alfa-2 o "INTL"
    kind: str  # uno de KINDS
    source: str
    source_id: str
    legal_name: str = ""
    domain: str | None = None
    popularity: float = 0.0
    aliases: list[str] = field(default_factory=list)
    qid: str | None = None
    color: str | None = None
    id: str | None = None  # id estable fijado por la curaduría

    def to_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items() if v not in (None, "", [], 0.0)}


def _curl(url: str, data: dict) -> bytes:
    """POST con curl: la política de robots de Wikimedia rechaza el cliente httpx aunque el User-Agent sea correcto."""
    args = ["curl", "-s", "--fail", "--max-time", "180", "-H", f"User-Agent: {USER_AGENT}",
            "-H", "Accept: application/sparql-results+json"]
    for k, v in data.items():
        args += ["--data-urlencode", f"{k}={v}"]
    return subprocess.run(args + [url], check=True, capture_output=True).stdout


def fetch(
    url: str,
    *,
    params: dict | None = None,
    cache_days: float = 30,
    as_json: bool = True,
    data: dict | None = None,
    use_curl: bool = False,
):
    """GET (o POST con `data`) con caché en disco, para no repetir descargas al reconstruir el catálogo."""
    CACHE.mkdir(exist_ok=True)
    key = hashlib.sha1(json.dumps([url, params, data], sort_keys=True).encode()).hexdigest()
    path = CACHE / key
    if path.exists() and time.time() - path.stat().st_mtime < cache_days * 86400:
        raw = path.read_bytes()
    elif use_curl:
        for attempt in range(4):
            try:
                raw = _curl(url, data or {})
                break
            except subprocess.CalledProcessError:
                if attempt == 3:
                    raise
                time.sleep(10 * (attempt + 1))
        path.write_bytes(raw)
    else:
        headers = {"User-Agent": USER_AGENT, "Accept": "application/json, text/csv, */*"}
        for attempt in range(4):
            try:
                if data is not None:
                    r = httpx.post(url, data=data, headers=headers, timeout=180, follow_redirects=True)
                else:
                    r = httpx.get(url, params=params, headers=headers, timeout=180, follow_redirects=True)
                if r.status_code == 429 or r.status_code >= 500:
                    raise httpx.HTTPStatusError("retry", request=r.request, response=r)
                r.raise_for_status()
                raw = r.content
                break
            except httpx.HTTPError:
                if attempt == 3:
                    raise
                time.sleep(5 * (attempt + 1))
        path.write_bytes(raw)
    return json.loads(raw) if as_json else raw


# --- Normalización -------------------------------------------------------------------------------

_LEGAL_SUFFIXES = re.compile(
    r"[\s,.-]*\b("
    r"s\.?\s?a\.?(\s?b\.?)?(\s?de\s?c\.?\s?v\.?)?|s/a|ltda\.?|limitada|s\.?\s?r\.?\s?l\.?|s\.?\s?a\.?\s?s\.?|c\.?\s?a\.?|"
    r"n\.?\s?a\.?|national association|inc\.?|incorporated|corp\.?|corporation|co\.?|llc|l\.?l\.?c\.?|plc|ltd\.?|limited|"
    r"ag|gmbh|kgaa|eg|se|spa|s\.p\.a\.|b\.?v\.?|n\.?v\.?|oyj|asa|ab|a/s|as|kk|"
    r"institui[cç][aã]o de pagamento|banco m[uú]ltiplo|em liquida[cç][aã]o extrajudicial"
    r")\b\.?\s*$",
    re.IGNORECASE,
)


def strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))


def search_key(text: str) -> str:
    """Clave para buscar y comparar: sin acentos, minúsculas, solo letras y números."""
    return re.sub(r"[^a-z0-9]+", " ", strip_accents(text).lower()).strip()


def clean_name(name: str) -> str:
    """Quita sufijos legales y, si viene todo en mayúsculas, lo pasa a mayúsculas de título."""
    text = re.sub(r"\s+", " ", name).strip(" -,.")
    for _ in range(3):
        stripped = _LEGAL_SUFFIXES.sub("", text).strip(" -,.")
        if stripped == text or not stripped:
            break
        text = stripped
    letters = [c for c in text if c.isalpha()]
    if letters and sum(c.isupper() for c in letters) / len(letters) > 0.8 and len(text) > 4:
        small = {"de", "do", "da", "dos", "das", "del", "el", "la", "las", "los", "y", "e", "of", "the", "and", "für", "und"}
        words_not_acronyms = {"sul", "sur", "sol", "mar", "san", "rio", "oro", "new", "one", "bay", "sea", "bank"}
        words = []
        for i, w in enumerate(text.lower().split(" ")):
            vowels = sum(ch in "aeiouáéíóú" for ch in w)
            # Siglas: palabras cortas con pocas vocales (BBVA, BCP, ICBC, XP, UBS); "NU" o "SOL" no lo son.
            acronym = (
                w.isalpha()
                and w not in small
                and w not in words_not_acronyms
                and 2 <= len(w) <= 4
                and vowels <= (0 if len(w) == 2 else 1)
            )
            if acronym:
                words.append(w.upper())
            elif w in small and i > 0:
                words.append(w)
            else:
                words.append(w[:1].upper() + w[1:])
        text = " ".join(words)
    return text


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", strip_accents(text).lower()).strip("-")[:48]


def domain_from_url(url: str | None) -> str | None:
    if not url:
        return None
    url = url.strip().lower()
    url = re.sub(r"^[a-z]+://", "", url)
    host = url.split("/")[0].split("?")[0].split(":")[0]
    host = re.sub(r"^(www\d?|m|portal|web|home)\.", "", host)
    return host if "." in host else None
