from collections import Counter

from scripts.catalog.common import clean_name, domain_from_url, search_key, slugify
from scripts.catalog.curated.brands import BRANDS as CORE
from scripts.catalog.curated.world import WORLD

BRANDS = CORE + WORLD
from scripts.catalog.sources.brasil import kind_of

KINDS = {"bank", "digital", "broker", "cooperative", "exchange"}


def test_clean_name_strips_legal_suffixes_and_fixes_case():
    assert clean_name("NU PAGAMENTOS S.A.") == "Nu Pagamentos"
    assert clean_name("JPMorgan Chase Bank, National Association") == "JPMorgan Chase Bank"
    assert clean_name("BANCO DO BRASIL S.A.") == "Banco do Brasil"
    assert clean_name("Banco Inter S.A.") == "Banco Inter"
    assert clean_name("Grupo Financiero Banorte, S.A.B. de C.V.") == "Grupo Financiero Banorte"


def test_search_key_ignores_accents_case_and_punctuation():
    assert search_key("Itaú Unibanco") == search_key("ITAU-UNIBANCO") == "itau unibanco"
    assert search_key("Crypto.com") == "crypto com"


def test_domain_from_url():
    assert domain_from_url("https://www.nubank.com.br/") == "nubank.com.br"
    assert domain_from_url("www.jpmorganchase.com") == "jpmorganchase.com"
    assert domain_from_url("http://m.bbva.mx/personas") == "bbva.mx"
    assert domain_from_url("") is None


def test_brasil_kind_from_legal_name():
    assert kind_of("XP INVESTIMENTOS CORRETORA DE CÂMBIO, TÍTULOS E VALORES MOBILIÁRIOS S/A") == "broker"
    assert kind_of("NU PAGAMENTOS S.A. - INSTITUIÇÃO DE PAGAMENTO") == "digital"
    assert kind_of("BANCO COOPERATIVO SICOOB S.A.") == "cooperative"
    assert kind_of("Banco Inter S.A.") == "bank"


def test_curated_brands_are_consistent():
    ids = [b[0] for b in BRANDS]
    duplicated = [i for i, n in Counter(ids).items() if n > 1]
    assert not duplicated, duplicated
    for bid, name, country, kind, domain, color, aliases, pattern in BRANDS:
        assert kind in KINDS, bid
        assert country == "INTL" or (len(country) == 2 and country.isupper()), bid
        assert name.strip() and slugify(bid) == bid, bid
        assert color is None or (color.startswith("#") and len(color) == 7), bid
        assert domain is None or "." in domain, bid


def test_legacy_ids_are_kept():
    # Ids que ya están guardados en cuentas (catálogo anterior del frontend).
    legacy = {"br-nubank", "br-itau", "mx-bbva", "ve-banesco", "co-nequi", "us-chase", "ar-uala", "cl-bci",
              "pe-yape", "eu-santander", "eu-n26", "eu-bunq", "intl-wise", "intl-payoneer", "intl-mercury"}
    assert legacy <= {b[0] for b in BRANDS}
