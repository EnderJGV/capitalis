import { useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function todayISO(): string {
  const d = new Date()
  return `${currentMonth()}-${String(d.getDate()).padStart(2, '0')}`
}

export function shortMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'short' })
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function useMoney(): (value: string | number) => string {
  const { user } = useAuth()
  const currency = user?.currency ?? 'BRL'
  return useCallback(
    (value) => new Intl.NumberFormat('es', { style: 'currency', currency }).format(Number(value)),
    [currency],
  )
}
