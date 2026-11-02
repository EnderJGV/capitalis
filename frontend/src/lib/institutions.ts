import type { Currency } from '@/domain/types'

export const INSTITUTION_COUNTRIES = ['BR', 'MX', 'VE', 'CO', 'US', 'AR', 'CL', 'PE', 'EU', 'INTL'] as const
export type InstitutionCountry = (typeof INSTITUTION_COUNTRIES)[number]

export interface Institution {
  /** Id estable que se guarda en la cuenta (accounts.institution). */
  id: string
  name: string
  country: InstitutionCountry
  kind: 'bank' | 'digital' | 'wallet'
  /** Dominio para pedir el logo; sin dominio se usa el monograma. */
  domain?: string
  /** Color de marca para el monograma de respaldo. */
  color: string
  /** Moneda sugerida al crear la cuenta. */
  currency: Currency
}

const bank = (id: string, name: string, country: InstitutionCountry, domain: string, color: string, currency: Currency): Institution => ({
  id,
  name,
  country,
  kind: 'bank',
  domain,
  color,
  currency,
})
const digital = (id: string, name: string, country: InstitutionCountry, domain: string, color: string, currency: Currency): Institution => ({
  id,
  name,
  country,
  kind: 'digital',
  domain,
  color,
  currency,
})

/** Catálogo de bancos y billeteras conocidos. Agregar más es solo sumar entradas. */
export const INSTITUTIONS: Institution[] = [
  // Brasil
  digital('br-nubank', 'Nubank', 'BR', 'nubank.com.br', '#820AD1', 'BRL'),
  bank('br-itau', 'Itaú', 'BR', 'itau.com.br', '#EC7000', 'BRL'),
  bank('br-bradesco', 'Bradesco', 'BR', 'bradesco.com.br', '#CC092F', 'BRL'),
  bank('br-bb', 'Banco do Brasil', 'BR', 'bb.com.br', '#F8D117', 'BRL'),
  bank('br-caixa', 'Caixa', 'BR', 'caixa.gov.br', '#005CA9', 'BRL'),
  bank('br-santander', 'Santander Brasil', 'BR', 'santander.com.br', '#EC0000', 'BRL'),
  digital('br-inter', 'Inter', 'BR', 'bancointer.com.br', '#FF7A00', 'BRL'),
  digital('br-c6', 'C6 Bank', 'BR', 'c6bank.com.br', '#242424', 'BRL'),
  bank('br-btg', 'BTG Pactual', 'BR', 'btgpactual.com', '#0B2341', 'BRL'),
  digital('br-picpay', 'PicPay', 'BR', 'picpay.com', '#21C25E', 'BRL'),
  digital('br-mercadopago', 'Mercado Pago', 'BR', 'mercadopago.com.br', '#00B1EA', 'BRL'),
  digital('br-pagbank', 'PagBank', 'BR', 'pagbank.com.br', '#1BB99A', 'BRL'),
  bank('br-sicredi', 'Sicredi', 'BR', 'sicredi.com.br', '#3FA110', 'BRL'),
  bank('br-sicoob', 'Sicoob', 'BR', 'sicoob.com.br', '#003641', 'BRL'),
  digital('br-neon', 'Neon', 'BR', 'neon.com.br', '#00A5F0', 'BRL'),

  // México
  bank('mx-bbva', 'BBVA México', 'MX', 'bbva.mx', '#004481', 'MXN'),
  bank('mx-banorte', 'Banorte', 'MX', 'banorte.com', '#EB0029', 'MXN'),
  bank('mx-santander', 'Santander México', 'MX', 'santander.com.mx', '#EC0000', 'MXN'),
  bank('mx-banamex', 'Banamex', 'MX', 'banamex.com', '#002D72', 'MXN'),
  bank('mx-hsbc', 'HSBC México', 'MX', 'hsbc.com.mx', '#DB0011', 'MXN'),
  bank('mx-scotiabank', 'Scotiabank México', 'MX', 'scotiabank.com.mx', '#EC111A', 'MXN'),
  bank('mx-azteca', 'Banco Azteca', 'MX', 'bancoazteca.com.mx', '#00A651', 'MXN'),
  bank('mx-inbursa', 'Inbursa', 'MX', 'inbursa.com', '#003B71', 'MXN'),
  digital('mx-nu', 'Nu México', 'MX', 'nu.com.mx', '#820AD1', 'MXN'),

  // Venezuela
  bank('ve-bdv', 'Banco de Venezuela', 'VE', 'bancodevenezuela.com', '#C8102E', 'VES'),
  bank('ve-banesco', 'Banesco', 'VE', 'banesco.com', '#00953A', 'VES'),
  bank('ve-mercantil', 'Mercantil', 'VE', 'mercantilbanco.com', '#0033A0', 'VES'),
  bank('ve-provincial', 'BBVA Provincial', 'VE', 'provincial.com', '#004481', 'VES'),
  bank('ve-bnc', 'BNC', 'VE', 'bncenlinea.com', '#00539F', 'VES'),
  bank('ve-bancaribe', 'Bancaribe', 'VE', 'bancaribe.com.ve', '#0067B1', 'VES'),
  bank('ve-tesoro', 'Banco del Tesoro', 'VE', 'bt.gob.ve', '#B5121B', 'VES'),
  bank('ve-bicentenario', 'Bicentenario', 'VE', 'bicentenariobu.com', '#D52B1E', 'VES'),
  bank('ve-exterior', 'Banco Exterior', 'VE', 'bancoexterior.com', '#E30613', 'VES'),
  bank('ve-bfc', 'BFC Banco Fondo Común', 'VE', 'bfc.com.ve', '#00A859', 'VES'),

  // Colombia
  bank('co-bancolombia', 'Bancolombia', 'CO', 'bancolombia.com', '#FDDA24', 'COP'),
  bank('co-davivienda', 'Davivienda', 'CO', 'davivienda.com', '#ED1C27', 'COP'),
  bank('co-bogota', 'Banco de Bogotá', 'CO', 'bancodebogota.com', '#002E6D', 'COP'),
  bank('co-bbva', 'BBVA Colombia', 'CO', 'bbva.com.co', '#004481', 'COP'),
  bank('co-occidente', 'Banco de Occidente', 'CO', 'bancodeoccidente.com.co', '#0055A5', 'COP'),
  bank('co-popular', 'Banco Popular', 'CO', 'bancopopular.com.co', '#00843D', 'COP'),
  bank('co-colpatria', 'Scotiabank Colpatria', 'CO', 'scotiabankcolpatria.com', '#EC111A', 'COP'),
  digital('co-nequi', 'Nequi', 'CO', 'nequi.com.co', '#210049', 'COP'),
  digital('co-daviplata', 'Daviplata', 'CO', 'daviplata.com', '#ED1C27', 'COP'),
  digital('co-nu', 'Nu Colombia', 'CO', 'nu.com.co', '#820AD1', 'COP'),

  // Estados Unidos
  bank('us-chase', 'Chase', 'US', 'chase.com', '#117ACA', 'USD'),
  bank('us-bofa', 'Bank of America', 'US', 'bankofamerica.com', '#012169', 'USD'),
  bank('us-wells', 'Wells Fargo', 'US', 'wellsfargo.com', '#D71E28', 'USD'),
  bank('us-citi', 'Citi', 'US', 'citi.com', '#056DAE', 'USD'),
  bank('us-capitalone', 'Capital One', 'US', 'capitalone.com', '#004977', 'USD'),
  bank('us-usbank', 'U.S. Bank', 'US', 'usbank.com', '#0C2074', 'USD'),
  bank('us-pnc', 'PNC', 'US', 'pnc.com', '#EF7622', 'USD'),
  bank('us-td', 'TD Bank', 'US', 'td.com', '#34A853', 'USD'),
  bank('us-schwab', 'Charles Schwab', 'US', 'schwab.com', '#00A0DF', 'USD'),
  digital('us-ally', 'Ally', 'US', 'ally.com', '#650360', 'USD'),

  // Argentina
  bank('ar-nacion', 'Banco Nación', 'AR', 'bna.com.ar', '#005A9C', 'ARS'),
  bank('ar-galicia', 'Galicia', 'AR', 'galicia.ar', '#F57C00', 'ARS'),
  bank('ar-santander', 'Santander Argentina', 'AR', 'santander.com.ar', '#EC0000', 'ARS'),
  bank('ar-bbva', 'BBVA Argentina', 'AR', 'bbva.com.ar', '#004481', 'ARS'),
  bank('ar-macro', 'Banco Macro', 'AR', 'macro.com.ar', '#1E3C72', 'ARS'),
  digital('ar-brubank', 'Brubank', 'AR', 'brubank.com', '#6C2EB9', 'ARS'),
  digital('ar-uala', 'Ualá', 'AR', 'uala.com.ar', '#3E5BF6', 'ARS'),
  digital('ar-mercadopago', 'Mercado Pago Argentina', 'AR', 'mercadopago.com.ar', '#00B1EA', 'ARS'),

  // Chile
  bank('cl-bancoestado', 'BancoEstado', 'CL', 'bancoestado.cl', '#F58220', 'CLP'),
  bank('cl-bancochile', 'Banco de Chile', 'CL', 'bancochile.cl', '#002464', 'CLP'),
  bank('cl-santander', 'Santander Chile', 'CL', 'santander.cl', '#EC0000', 'CLP'),
  bank('cl-bci', 'BCI', 'CL', 'bci.cl', '#00377B', 'CLP'),
  bank('cl-scotiabank', 'Scotiabank Chile', 'CL', 'scotiabankchile.cl', '#EC111A', 'CLP'),
  bank('cl-itau', 'Itaú Chile', 'CL', 'itau.cl', '#EC7000', 'CLP'),

  // Perú
  bank('pe-bcp', 'BCP', 'PE', 'viabcp.com', '#002A8D', 'PEN'),
  bank('pe-interbank', 'Interbank', 'PE', 'interbank.pe', '#00A94F', 'PEN'),
  bank('pe-bbva', 'BBVA Perú', 'PE', 'bbva.pe', '#004481', 'PEN'),
  bank('pe-scotiabank', 'Scotiabank Perú', 'PE', 'scotiabank.com.pe', '#EC111A', 'PEN'),
  digital('pe-yape', 'Yape', 'PE', 'yape.com.pe', '#742284', 'PEN'),

  // Europa
  bank('eu-santander', 'Santander', 'EU', 'santander.com', '#EC0000', 'EUR'),
  bank('eu-bbva', 'BBVA', 'EU', 'bbva.es', '#004481', 'EUR'),
  bank('eu-caixabank', 'CaixaBank', 'EU', 'caixabank.es', '#007EAE', 'EUR'),
  bank('eu-ing', 'ING', 'EU', 'ing.com', '#FF6200', 'EUR'),
  digital('eu-n26', 'N26', 'EU', 'n26.com', '#36A18B', 'EUR'),
  digital('eu-bunq', 'bunq', 'EU', 'bunq.com', '#25A1DA', 'EUR'),

  // Digitales / internacionales
  digital('intl-wise', 'Wise', 'INTL', 'wise.com', '#9FE870', 'USD'),
  digital('intl-payoneer', 'Payoneer', 'INTL', 'payoneer.com', '#FF4800', 'USD'),
  digital('intl-paypal', 'PayPal', 'INTL', 'paypal.com', '#003087', 'USD'),
  digital('intl-revolut', 'Revolut', 'INTL', 'revolut.com', '#191C1F', 'EUR'),
  digital('intl-skrill', 'Skrill', 'INTL', 'skrill.com', '#811E68', 'USD'),
  digital('intl-zinli', 'Zinli', 'INTL', 'zinli.com', '#6A2CF5', 'USD'),
  digital('intl-airtm', 'AirTM', 'INTL', 'airtm.com', '#2364F6', 'USD'),
  digital('intl-mercury', 'Mercury', 'INTL', 'mercury.com', '#5266EB', 'USD'),
]

/** Ids especiales que no son instituciones del catálogo. */
export const CASH_ID = 'cash'

const BY_ID = new Map(INSTITUTIONS.map((i) => [i.id, i]))

export function findInstitution(id: string | null | undefined): Institution | undefined {
  return id ? BY_ID.get(id) : undefined
}

/** País sugerido según la moneda principal del usuario, para abrir el catálogo ya filtrado. */
export function countryForCurrency(currency: Currency): InstitutionCountry | null {
  const map: Partial<Record<Currency, InstitutionCountry>> = {
    BRL: 'BR', MXN: 'MX', VES: 'VE', COP: 'CO', USD: 'US', ARS: 'AR', CLP: 'CL', PEN: 'PE', EUR: 'EU',
  }
  return map[currency] ?? null
}
