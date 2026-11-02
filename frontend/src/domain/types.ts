export type TxType = 'income' | 'expense'

export const CURRENCIES = ['BRL', 'USD', 'EUR', 'ARS', 'MXN', 'CLP', 'COP', 'PEN'] as const
export type Currency = (typeof CURRENCIES)[number]

export interface User {
  id: number
  name: string
  email: string
  currency: Currency
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
}

export type CategoryInput = Omit<Category, 'id'>

export interface Transaction {
  id: number
  type: TxType
  amount: string
  description: string
  date: string
  category_id: number | null
  category: Category | null
}

export interface TransactionInput {
  type: TxType
  amount: string
  description: string
  date: string
  category_id: number | null
}

export interface TransactionFilters {
  month?: string
  type?: TxType | ''
  category_id?: number | ''
}

export interface CategoryTotal {
  category_id: number | null
  name: string
  color: string
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
}
