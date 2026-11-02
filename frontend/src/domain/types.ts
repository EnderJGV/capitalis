export type TxType = 'income' | 'expense'

export const CURRENCIES = [
  'BRL', 'USD', 'EUR', 'ARS', 'MXN', 'CLP', 'COP', 'PEN', 'VES', 'GBP', 'CAD', 'UYU', 'PYG', 'BOB', 'DOP',
] as const
export type Currency = (typeof CURRENCIES)[number]

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

export const ACCOUNT_KINDS = ['checking', 'savings', 'digital', 'cash', 'investment'] as const
export type AccountKind = (typeof ACCOUNT_KINDS)[number]

/** Datos mínimos de una cuenta que acompañan a un movimiento o transferencia. */
export interface AccountRef {
  id: number
  name: string
  currency: Currency
  kind: AccountKind
  /** Id del catálogo de instituciones (lib/institutions.ts) o null. */
  institution: string | null
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
}

export interface TransactionInput {
  type: TxType
  amount: string
  description: string
  date: string
  category_id: number | null
  account_id: number | null
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
}
