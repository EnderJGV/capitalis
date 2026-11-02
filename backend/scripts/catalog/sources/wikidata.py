"""Wikidata (CC0): países con su moneda e instituciones financieras de todo el mundo."""

from __future__ import annotations

import time

from ..common import Record, clean_name, domain_from_url, fetch

SPARQL = "https://query.wikidata.org/sparql"

# Clases que no sirven para cuentas personales.
EXCLUDED = {"Q66344", "Q1068236", "Q1199009"}  # banco central, banco de desarrollo, banco multilateral
COOPERATIVE = {"Q745877", "Q3277997", "Q1371849", "Q2394624"}  # credit union, banco cooperativo, caja rural
DIGITAL = {"Q60767305", "Q1640628", "Q1956140", "Q15911314"}  # neobanco, banco directo, PSP, dinero electrónico

# Clases que se consultan de forma global (son pocas instancias): Qid -> tipo
GLOBAL_CLASSES = {
    "Q2073644": "broker",  # brokerage firm
    "Q11774490": "broker",  # online broker
    "Q60767305": "digital",  # neobank
    "Q1956140": "digital",  # payment service provider
    "Q745877": "cooperative",  # credit union
    "Q25401607": "exchange",  # cryptocurrency exchange
}


def _query(sparql: str) -> list[dict]:
    data = fetch(SPARQL, data={"query": sparql}, cache_days=60, use_curl=True)
    time.sleep(1.0)  # cortesía con el servicio público
    return [{k: v["value"] for k, v in row.items()} for row in data["results"]["bindings"]]


def countries() -> list[dict]:
    """Países y territorios actuales con ISO2, QID y su(s) moneda(s) vigente(s)."""
    rows = _query(
        """
        SELECT ?country ?iso ?cur ?rank ?end ?label WHERE {
          ?country wdt:P297 ?iso .
          FILTER NOT EXISTS { ?country wdt:P576 ?dissolved }
          OPTIONAL { ?country rdfs:label ?label FILTER(LANG(?label) = "en") }
          OPTIONAL {
            ?country p:P38 ?st . ?st ps:P38 ?c ; wikibase:rank ?rank . ?c wdt:P498 ?cur .
            OPTIONAL { ?st pq:P582 ?end }
          }
        }
        """
    )
    result: dict[str, dict] = {}
    for r in rows:
        iso = r["iso"].upper()
        qid = r["country"].rsplit("/", 1)[-1]
        # Un mismo código ISO puede tener varios ítems (p. ej. CY: República de Chipre y la isla): se usan todos.
        entry = result.setdefault(iso, {"iso": iso, "qids": [], "name": r.get("label", iso), "currencies": []})
        if qid not in entry["qids"]:
            entry["qids"].append(qid)
        if r.get("cur") and not r.get("end") and not r.get("rank", "").endswith("DeprecatedRank"):
            preferred = r.get("rank", "").endswith("PreferredRank")
            entry["currencies"].append((0 if preferred else 1, r["cur"].upper()))
    for entry in result.values():
        entry["currencies"] = [c for _, c in sorted(set(entry["currencies"]))]
    return sorted(result.values(), key=lambda e: e["iso"])


def _label(r: dict) -> str | None:
    return r.get("label_en") or r.get("label_es") or r.get("label_pt") or r.get("label_any")


def _record(r: dict, country: str, kind: str) -> Record | None:
    name = _label(r)
    if not name or name.startswith("Q") and name[1:].isdigit():
        return None
    qid = r["item"].rsplit("/", 1)[-1]
    aliases = sorted({a for a in (r.get("aliases") or "").split("|") if a and a != name})[:6]
    return Record(
        name=clean_name(name),
        legal_name=name,
        country=country,
        kind=kind,
        source="wikidata",
        source_id=qid,
        qid=qid,
        domain=domain_from_url(r.get("website")),
        popularity=float(r.get("sitelinks", 0)),
        aliases=aliases,
    )


_FIELDS = """
  OPTIONAL { ?item wdt:P856 ?site }
  ?item wikibase:sitelinks ?links .
  OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") }
  OPTIONAL { ?item rdfs:label ?es FILTER(LANG(?es) = "es") }
  OPTIONAL { ?item rdfs:label ?pt FILTER(LANG(?pt) = "pt") }
  OPTIONAL { ?item rdfs:label ?anyLabel }
  OPTIONAL { ?item skos:altLabel ?alias FILTER(LANG(?alias) IN ("en", "es", "pt")) }
"""


def banks_of(country_qids: list[str], iso: str) -> list[Record]:
    values = " ".join(f"wd:{q}" for q in country_qids)
    rows = _query(
        f"""
        SELECT ?item (SAMPLE(?site) AS ?website) (MAX(?links) AS ?sitelinks) (SAMPLE(?en) AS ?label_en)
               (SAMPLE(?es) AS ?label_es) (SAMPLE(?pt) AS ?label_pt) (SAMPLE(?anyLabel) AS ?label_any)
               (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?aliases)
               (GROUP_CONCAT(DISTINCT STRAFTER(STR(?class), "entity/"); separator="|") AS ?classes) WHERE {{
          VALUES ?country {{ {values} }}
          ?item wdt:P17 ?country ; wdt:P31 ?class .
          ?class wdt:P279* wd:Q22687 .
          FILTER NOT EXISTS {{ ?item wdt:P576 ?dissolved }}
          {_FIELDS}
        }} GROUP BY ?item
        """
    )
    records = []
    for r in rows:
        classes = set((r.get("classes") or "").split("|"))
        if classes & EXCLUDED:
            continue
        kind = "cooperative" if classes & COOPERATIVE else "digital" if classes & DIGITAL else "bank"
        rec = _record(r, iso, kind)
        if rec:
            records.append(rec)
    return records


def global_class(class_qid: str, kind: str, iso_by_qid: dict[str, str]) -> list[Record]:
    rows = _query(
        f"""
        SELECT ?item (SAMPLE(?country) AS ?country_of) (SAMPLE(?site) AS ?website) (MAX(?links) AS ?sitelinks)
               (SAMPLE(?en) AS ?label_en) (SAMPLE(?es) AS ?label_es) (SAMPLE(?pt) AS ?label_pt)
               (SAMPLE(?anyLabel) AS ?label_any) (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?aliases) WHERE {{
          ?item wdt:P31 wd:{class_qid} .
          FILTER NOT EXISTS {{ ?item wdt:P576 ?dissolved }}
          OPTIONAL {{ ?item wdt:P17 ?country }}
          {_FIELDS}
        }} GROUP BY ?item
        """
    )
    records = []
    for r in rows:
        country_qid = (r.get("country_of") or "").rsplit("/", 1)[-1]
        rec = _record(r, iso_by_qid.get(country_qid, "INTL"), kind)
        if rec:
            records.append(rec)
    return records


def collect(progress=print) -> tuple[list[dict], list[Record]]:
    all_countries = countries()
    iso_by_qid = {qid: c["iso"] for c in all_countries for qid in c["qids"]}
    records: list[Record] = []
    for i, c in enumerate(all_countries, 1):
        try:
            found = banks_of(c["qids"], c["iso"])
        except Exception as error:  # noqa: BLE001 - un país que falla no detiene el resto
            progress(f"  ! {c['iso']}: {error}")
            continue
        records += found
        if found:
            progress(f"  wikidata {i}/{len(all_countries)} {c['iso']}: {len(found)}")
    for class_qid, kind in GLOBAL_CLASSES.items():
        found = global_class(class_qid, kind, iso_by_qid)
        progress(f"  wikidata clase {class_qid} ({kind}): {len(found)}")
        records += found
    return all_countries, records
