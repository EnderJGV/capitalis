import type {
  Account,
  AccountInput,
  AuthResponse,
  CardInput,
  CatalogCountry,
  CatalogInstitution,
  InstitutionKind,
  Category,
  CategoryInput,
  ContributionInput,
  ContributionResult,
  CreditCard,
  Currency,
  Goal,
  GoalDetail,
  GoalInput,
  GoalStatus,
  InstallmentProgress,
  Rate,
  Statement,
  Summary,
  Transaction,
  TransactionFilters,
  TransactionInput,
  Transfer,
  TransferInput,
  User,
} from '../domain/types'
import { http } from './http'

export const authApi = {
  register: (data: { name: string; email: string; password: string; currency: Currency; language: string }) =>
    http<AuthResponse>('/auth/register', { method: 'POST', body: data }),
  login: (data: { email: string; password: string }) =>
    http<AuthResponse>('/auth/login', { method: 'POST', body: data }),
  me: () => http<User>('/auth/me'),
  updateMe: (data: { name?: string; currency?: Currency; language?: string }) =>
    http<User>('/auth/me', { method: 'PATCH', body: data }),
}

export const categoriesApi = {
  list: () => http<Category[]>('/categories'),
  create: (data: CategoryInput) => http<Category>('/categories', { method: 'POST', body: data }),
  update: (id: number, data: CategoryInput) => http<Category>(`/categories/${id}`, { method: 'PUT', body: data }),
  remove: (id: number) => http<void>(`/categories/${id}`, { method: 'DELETE' }),
}

export const transactionsApi = {
  list: (filters: TransactionFilters) => http<Transaction[]>('/transactions', { query: { ...filters } }),
  create: (data: TransactionInput) => http<Transaction>('/transactions', { method: 'POST', body: data }),
  update: (id: number, data: TransactionInput) =>
    http<Transaction>(`/transactions/${id}`, { method: 'PUT', body: data }),
  remove: (id: number) => http<void>(`/transactions/${id}`, { method: 'DELETE' }),
}

export const dashboardApi = {
  summary: (month: string) => http<Summary>('/dashboard/summary', { query: { month } }),
}

export const accountsApi = {
  list: (includeArchived = false) =>
    http<Account[]>('/accounts', { query: { include_archived: includeArchived ? 'true' : undefined } }),
  get: (id: number) => http<Account>(`/accounts/${id}`),
  create: (data: AccountInput) => http<Account>('/accounts', { method: 'POST', body: data }),
  update: (id: number, data: AccountInput) => http<Account>(`/accounts/${id}`, { method: 'PUT', body: data }),
  remove: (id: number) => http<void>(`/accounts/${id}`, { method: 'DELETE' }),
}

export const cardsApi = {
  list: (includeArchived = false) =>
    http<CreditCard[]>('/cards', { query: { include_archived: includeArchived ? 'true' : undefined } }),
  get: (id: number) => http<CreditCard>(`/cards/${id}`),
  /** Todas las facturas, de la más vieja a la más nueva (la abierta siempre aparece). */
  statements: (id: number) => http<Statement[]>(`/cards/${id}/statements`),
  /** Compras en cuotas en curso. */
  installments: (id: number) => http<InstallmentProgress[]>(`/cards/${id}/installments`),
  create: (data: CardInput) => http<CreditCard>('/cards', { method: 'POST', body: data }),
  update: (id: number, data: CardInput) => http<CreditCard>(`/cards/${id}`, { method: 'PUT', body: data }),
  remove: (id: number) => http<void>(`/cards/${id}`, { method: 'DELETE' }),
}

export const goalsApi = {
  list: () => http<Goal[]>('/goals'),
  get: (id: number) => http<GoalDetail>(`/goals/${id}`),
  create: (data: GoalInput) => http<Goal>('/goals', { method: 'POST', body: data }),
  update: (id: number, data: GoalInput) => http<Goal>(`/goals/${id}`, { method: 'PUT', body: data }),
  remove: (id: number) => http<void>(`/goals/${id}`, { method: 'DELETE' }),
  setStatus: (id: number, status: Exclude<GoalStatus, 'completed'>) =>
    http<Goal>(`/goals/${id}/status`, { method: 'POST', body: { status } }),
  addContribution: (id: number, data: ContributionInput) =>
    http<ContributionResult>(`/goals/${id}/contributions`, { method: 'POST', body: data }),
  updateContribution: (id: number, contributionId: number, data: ContributionInput) =>
    http<ContributionResult>(`/goals/${id}/contributions/${contributionId}`, { method: 'PUT', body: data }),
  removeContribution: (id: number, contributionId: number) =>
    http<ContributionResult>(`/goals/${id}/contributions/${contributionId}`, { method: 'DELETE' }),
}

export const transfersApi = {
  list: (filters: { month?: string; start?: string; end?: string; account_id?: number | '' }) =>
    http<Transfer[]>('/transfers', { query: { ...filters } }),
  create: (data: TransferInput) => http<Transfer>('/transfers', { method: 'POST', body: data }),
  update: (id: number, data: TransferInput) => http<Transfer>(`/transfers/${id}`, { method: 'PUT', body: data }),
  remove: (id: number) => http<void>(`/transfers/${id}`, { method: 'DELETE' }),
}

export const ratesApi = {
  /** Cotización aproximada: 1 `from` = rate `to` en la fecha indicada. */
  get: (from: Currency, to: Currency, date?: string) => http<Rate>('/rates', { query: { from, to, date } }),
}

export const catalogApi = {
  countries: () => http<CatalogCountry[]>('/catalog/countries'),
  currencies: () => http<string[]>('/catalog/currencies'),
  institutions: (params: {
    country?: string
    q?: string
    kind?: InstitutionKind | ''
    /** País que va primero en la búsqueda mundial. */
    prefer?: string
    offset?: number
    limit?: number
  }) =>
    http<{ total: number; items: CatalogInstitution[] }>('/catalog/institutions', { query: { ...params } }),
}
