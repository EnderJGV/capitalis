import { useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nProvider'
import { getLocale, getMessages } from '../i18n/runtime'

// Fechas y meses usan el idioma actual del usuario (ver i18n/runtime).

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
  return new Date(y, m - 1, 1).toLocaleDateString(getLocale(), { month: 'short' })
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(getLocale(), { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Formatea montos en la moneda principal del usuario, o en `currency` si se indica (p. ej., la de una cuenta). */
export function useMoney(): (value: string | number, currency?: string) => string {
  const { user } = useAuth()
  const { locale } = useI18n()
  const main = user?.currency ?? 'BRL'
  return useCallback(
    (value, currency) =>
      new Intl.NumberFormat(locale, { style: 'currency', currency: currency ?? main }).format(Number(value)),
    [main, locale],
  )
}

/** Símbolo corto de una moneda en el idioma actual (R$, US$, €…). */
export function currencySymbol(currency: string, locale = getLocale()): string {
  return (
    new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value ?? currency
  )
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function monthLabel(month: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(getLocale(), { month: style, year: 'numeric' })
}

/** "Hoy", "Ayer" o "lunes, 2 de noviembre" (en el idioma del usuario) para encabezar grupos de movimientos. */
export function dayHeading(iso: string): string {
  if (iso === todayISO()) return getMessages().format.today
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return getMessages().format.yesterday
  const sameYear = y === new Date().getFullYear()
  const label = date.toLocaleDateString(getLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  return capitalize(label)
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function useCurrencySymbol(): string {
  const { user } = useAuth()
  const { locale } = useI18n()
  const currency = user?.currency ?? 'BRL'
  return (
    new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0).find((p) => p.type === 'currency')
      ?.value ?? currency
  )
}
