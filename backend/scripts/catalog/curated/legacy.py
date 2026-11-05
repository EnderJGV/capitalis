"""Ids del primer catálogo de instituciones (el que estaba en el frontend, antes del catálogo mundial).

Ya están guardados en `accounts.institution`, así que el catálogo nunca puede dejar de tenerlos.
"""

LEGACY_IDS = frozenset(
    """
    ar-bbva ar-brubank ar-galicia ar-macro ar-mercadopago ar-nacion ar-santander ar-uala
    br-bb br-bradesco br-btg br-c6 br-caixa br-inter br-itau br-mercadopago br-neon br-nubank br-pagbank
    br-picpay br-santander br-sicoob br-sicredi
    cl-bancochile cl-bancoestado cl-bci cl-itau cl-santander cl-scotiabank
    co-bancolombia co-bbva co-bogota co-colpatria co-daviplata co-davivienda co-nequi co-nu co-occidente co-popular
    eu-bbva eu-bunq eu-caixabank eu-ing eu-n26 eu-santander
    intl-airtm intl-mercury intl-payoneer intl-paypal intl-revolut intl-skrill intl-wise intl-zinli
    mx-azteca mx-banamex mx-banorte mx-bbva mx-hsbc mx-inbursa mx-nu mx-santander mx-scotiabank
    pe-bbva pe-bcp pe-interbank pe-scotiabank pe-yape
    us-ally us-bofa us-capitalone us-chase us-citi us-pnc us-schwab us-td us-usbank us-wells
    ve-bancaribe ve-banesco ve-bdv ve-bfc ve-bicentenario ve-bnc ve-exterior ve-mercantil ve-provincial ve-tesoro
    """.split()
)
