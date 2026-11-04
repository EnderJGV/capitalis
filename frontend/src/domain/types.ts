export type TxType = 'income' | 'expense'

/** Código ISO 4217 (BRL, USD, EUR…). La lista completa viene del catálogo del servidor. */
export type Currency = string

export type InstitutionKind = 'bank' | 'digital' | 'broker' | 'cooperative' | 'exchange'

/** Institución del catálogo mundial (resultado de búsqueda). */
export interface CatalogInstitution {
  id: string
  name: string
  country: string
  kind: InstitutionKind
  domain: string | null
  color: string | null
}

/** Lo que una cuenta necesita de su institución para dibujar el logo. */
export interface InstitutionInfo {
  name: string
  kind: InstitutionKind
  domain: string | null
  color: string | null
}

export interface CatalogCountry {
  code: string
  name: string
  currency: string | null
  count: number
}

export interface User {
  id: number
  name: string
  email: string
  currency: Currency
  /** Idioma de la interfaz elegido por el usuario: 'es' | 'pt' | 'en'. */
  language: string
}

export interface AuthResponse {
  access_token: string
  user: User
}

export interface Category {
  id: number
  name: string
  type: TxType
  color: string
  /** Emoji opcional para identificar la categoría de un vistazo. */
  icon: string
}

export type CategoryInput = Omit<Category, 'id'>

/** Tipos que se eligen al crear una cuenta. Las tarjetas ('credit_card') se crean aparte, con su configuración. */
export const ACCOUNT_KINDS = ['checking', 'savings', 'digital', 'cash', 'investment'] as const
export type AccountKind = (typeof ACCOUNT_KINDS)[number] | 'credit_card'

export const CARD_NETWORKS = [
  'visa',
  'mastercard',
  'amex',
  'elo',
  'hipercard',
  'diners',
  'discover',
  'jcb',
  'unionpay',
  'cabal',
  'other',
] as const
export type CardNetwork = (typeof CARD_NETWORKS)[number]

/** Configuración de una tarjeta de crédito. Nunca incluye el número completo ni el código de seguridad. */
export interface CardConfig {
  network: CardNetwork
  last4: string | null
  credit_limit: string
  closing_day: number
  due_day: number
  /** Cuenta desde la que se paga la factura por defecto. */
  payment_account_id: number | null
}

/** Datos mínimos de una cuenta que acompañan a un movimiento o transferencia. */
export interface AccountRef {
  id: number
  name: string
  currency: Currency
  kind: AccountKind
  /** Id de la institución en el catálogo, "cash" (efectivo) o null. */
  institution: string | null
  institution_info: InstitutionInfo | null
  /** Solo en las tarjetas de crédito. */
  card: CardConfig | null
}

export interface Account extends AccountRef {
  initial_balance: string
  archived: boolean
  balance: string
  /** Saldo en la moneda principal del usuario (null si no hay cotización). */
  converted_balance: string | null
}

export interface AccountInput {
  name: string
  currency: Currency
  kind: AccountKind
  institution: string | null
  initial_balance: string
  archived: boolean
}

export type StatementStatus = 'future' | 'open' | 'closed' | 'partial' | 'overdue' | 'paid' | 'credit'

/** Factura de una tarjeta: los movimientos de start_date a closing_date (inclusive). */
export interface Statement {
  /** Mes del cierre (YYYY-MM): identifica la factura. */
  month: string
  start_date: string
  closing_date: string
  due_date: string
  charges: string
  credits: string
  total: string
  paid: string
  pending: string
  status: StatementStatus
}

/** Tarjeta con su deuda, límite disponible y las facturas que importan hoy. */
export interface CreditCard extends Account {
  card: CardConfig
  debt: string
  /** Límite − deuda; negativo si se pasó del límite. */
  available: string
  credit_balance: string
  current_statement: Statement
  /** Factura cerrada más vieja con saldo pendiente, si hay. */
  next_due: Statement | null
}

export interface CardInput {
  name: string
  currency: Currency
  institution: string | null
  network: CardNetwork
  last4: string | null
  credit_limit: string
  closing_day: number
  due_day: number
  payment_account_id: number | null
  archived: boolean
}

export interface Transfer {
  id: number
  from_account_id: number
  to_account_id: number
  from_account: AccountRef | null
  to_account: AccountRef | null
  amount: string
  received_amount: string
  rate: string
  fee: string
  date: string
  description: string
}

export interface TransferInput {
  from_account_id: number
  to_account_id: number
  amount: string
  /** Obligatorio solo si las monedas son distintas. */
  received_amount: string | null
  fee: string
  date: string
  description: string
}

export type GoalKind = 'material' | 'personal'
/** active → completed (meta alcanzada, sigue reservado) → achieved (logrado); archived = abandonado. */
export type GoalStatus = 'active' | 'completed' | 'achieved' | 'archived'
export type GoalPace = 'on_track' | 'slightly_behind' | 'behind' | 'overdue'

/** Objetivo de ahorro con su progreso. Siempre se mide en dinero. */
export interface Goal {
  id: number
  name: string
  kind: GoalKind
  icon: string
  color: string
  target_amount: string
  currency: Currency
  target_date: string | null
  note: string
  status: GoalStatus
  completed_on: string | null
  created_on: string
  saved: string
  remaining: string
  /** Lo ahorrado por encima de la meta. */
  over: string
  /** 0–100. */
  percent: number
  months_left: number | null
  /** Cuánto aportar por mes para llegar a la fecha límite. */
  monthly_needed: string | null
  pace: GoalPace | null
  projected_date: string | null
}

export interface GoalInput {
  name: string
  kind: GoalKind
  icon: string
  color: string
  target_amount: string
  currency: Currency
  target_date: string | null
  note: string
  /** Solo al crear: lo que ya se tiene ahorrado. */
  initial_amount?: string | null
}

/** Aporte (positivo) o retiro (negativo) virtual: el dinero sigue en su cuenta. */
export interface GoalContribution {
  id: number
  goal_id: number
  amount: string
  date: string
  note: string
  account_id: number | null
}

export interface GoalDetail extends Goal {
  contributions: GoalContribution[]
}

export interface ContributionInput {
  amount: string
  date: string
  note: string
  account_id: number | null
}

export interface ContributionResult {
  goal: Goal
  contribution: GoalContribution | null
  /** El objetivo acaba de llegar a la meta con este cambio. */
  just_completed: boolean
}

/** Objetivos en el Resumen: lo reservado (en la moneda principal) y los más cercanos. */
export interface GoalsOverview {
  reserved: string
  free: string
  active_count: number
  top: Goal[]
}

export interface Rate {
  base: Currency
  quote: Currency
  rate: string
  date: string
}

export interface Transaction {
  id: number
  type: TxType
  amount: string
  description: string
  date: string
  category_id: number | null
  category: Category | null
  account_id: number
  account: AccountRef | null
  /** Si no es null, es la comisión de esa transferencia (se edita desde la transferencia). */
  transfer_id: number | null
  /** Cuota `installment_number` de `installment_count` de una compra en cuotas. */
  installment_number: number | null
  installment_count: number | null
  /** La compra entera: editar o borrar una cuota cambia todas. */
  installment_plan: { id: number; total_amount: string; installments: number; purchase_date: string } | null
  /** Ingreso en una tarjeta que devuelve una compra: resta del gasto de su categoría. */
  is_refund: boolean
  /** Compra en otra moneda: monto y moneda originales y el tipo de cambio aplicado. */
  original_amount: string | null
  original_currency: string | null
  exchange_rate: string | null
  /** Si no es null, es la tarifa internacional de esa compra (se edita desde la compra). */
  parent_id: number | null
  /** Monto de la tarifa internacional enlazada a esta compra. */
  foreign_fee: string | null
}

export interface TransactionInput {
  type: TxType
  amount: string
  description: string
  date: string
  category_id: number | null
  account_id: number | null
  /** Compra en cuotas (solo gastos de tarjeta): `amount` es el total. */
  installments?: number | null
  is_refund?: boolean
  original_amount?: string | null
  original_currency?: string | null
  /** % de tarifa internacional (IOF) sobre `amount`. */
  foreign_fee_percent?: string | null
}

/** Compra en cuotas que todavía tiene cuotas por cargar. */
export interface InstallmentProgress {
  id: number
  description: string
  category_id: number | null
  total_amount: string
  installments: number
  purchase_date: string
  installment_amount: string
  /** Cuotas ya cargadas (hasta hoy). */
  charged: number
  /** Lo que falta cargar en las facturas siguientes. */
  remaining: string
  next_date: string | null
}

export interface TransactionFilters {
  month?: string
  /** Rango de fechas (YYYY-MM-DD), alternativo a `month`. */
  start?: string
  end?: string
  type?: TxType | ''
  category_id?: number | ''
  account_id?: number | ''
}

export interface CategoryTotal {
  category_id: number | null
  name: string
  color: string
  icon: string
  total: string
}

export interface MonthTotal {
  month: string
  income: string
  expense: string
}

export interface Summary {
  month: string
  income: string
  expense: string
  balance: string
  total_balance: string
  expenses_by_category: CategoryTotal[]
  last_months: MonthTotal[]
  /** Moneda principal en la que vienen todos los totales. */
  currency: Currency
  /** true si algún monto se convirtió desde otra moneda (totales aproximados). */
  approximate: boolean
  /** Monedas sin cotización: sus montos quedan fuera de los totales. */
  missing_currencies: string[]
  accounts: Account[]
  /** Tarjetas activas, para los avisos de vencimiento. */
  cards: CreditCard[]
  goals: GoalsOverview | null
}
