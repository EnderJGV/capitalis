import type {
  AuthResponse,
  Category,
  CategoryInput,
  Currency,
  Summary,
  Transaction,
  TransactionFilters,
  TransactionInput,
  User,
} from '../domain/types'
import { http } from './http'

export const authApi = {
  register: (data: { name: string; email: string; password: string; currency: Currency }) =>
    http<AuthResponse>('/auth/register', { method: 'POST', body: data }),
  login: (data: { email: string; password: string }) =>
    http<AuthResponse>('/auth/login', { method: 'POST', body: data }),
  me: () => http<User>('/auth/me'),
  updateMe: (data: { name?: string; currency?: Currency }) =>
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
