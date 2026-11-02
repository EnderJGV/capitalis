import type { Account, CreditCard, Statement, StatementStatus } from '@/domain/types'
import type { Messages } from '@/i18n/messages/es'
import { format } from '@/i18n/runtime'
import { formatDate, todayISO } from '@/utils/format'

/** Una factura entra en el aviso si vence en este plazo (o ya venció). */
export const DUE_SOON_DAYS = 7

export interface StatementAlert {
  card: CreditCard
  statement: Statement
  overdue: boolean
}

/**
 * La factura que hay que pagar de cada tarjeta, si está vencida o vence en los próximos 7 días.
 * `next_due` es la cerrada más vieja con saldo; si no hay, se mira la abierta.
 */
export function statementAlerts(cards: CreditCard[]): StatementAlert[] {
  const alerts: StatementAlert[] = []
  for (const card of cards) {
    const statement = card.next_due ?? card.current_statement
    if (Number(statement.pending) <= 0) continue
    const days = daysUntil(statement.due_date)
    const overdue = statement.status === 'overdue' || days < 0
    if (!overdue && days > DUE_SOON_DAYS) continue
    alerts.push({ card, statement, overdue })
  }
  return alerts.sort((a, b) => a.statement.due_date.localeCompare(b.statement.due_date))
}

/** Hay alguna factura vencida (punto rojo del menú). */
export function hasOverdueStatement(cards: Pick<CreditCard, 'next_due'>[]): boolean {
  return cards.some((card) => card.next_due?.status === 'overdue')
}

/** Días desde hoy hasta una fecha ISO (negativo si ya pasó). */
export function daysUntil(iso: string, today = todayISO()): number {
  const [y, m, d] = iso.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000)
}

/** "Vence hoy", "Vence en 3 días", "Venció el 10 nov 2026"… */
export function dueLabel(t: Messages, statement: Statement): string {
  const days = daysUntil(statement.due_date)
  if (statement.status === 'overdue' || days < 0) return format(t.cards.overdue, { date: formatDate(statement.due_date) })
  if (days === 0) return t.cards.dueToday
  if (days === 1) return t.cards.dueTomorrow
  if (days <= 7) return format(t.cards.dueIn, { n: days })
  return format(t.cards.due, { date: formatDate(statement.due_date) })
}

function dayInMonth(year: number, month: number, day: number): Date {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return new Date(Date.UTC(year, month - 1, Math.min(day, last)))
}

/**
 * Mes (YYYY-MM) del vencimiento de la factura en la que entra un gasto de ese día; igual que el
 * servidor: el día de cierre entra en esa factura y, si el mes es más corto, cierra el último día.
 */
export function statementDueMonth(iso: string, closingDay: number, dueDay: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  let closing = dayInMonth(y, m, closingDay)
  if (Date.UTC(y, m - 1, d) > closing.getTime()) closing = dayInMonth(y, m + 1, closingDay)
  const offset = dueDay > closingDay ? 0 : 1
  const due = dayInMonth(closing.getUTCFullYear(), closing.getUTCMonth() + 1 + offset, dueDay)
  return `${due.getUTCFullYear()}-${String(due.getUTCMonth() + 1).padStart(2, '0')}`
}

/** El día siguiente al cierre: lo que se compra ese día entra en la factura del mes siguiente. */
export function bestPurchaseDay(closingDay: number): number {
  return closingDay >= 31 ? 1 : closingDay + 1
}

/** Colores de la etiqueta de estado de una factura. */
export const STATUS_TONE: Record<StatementStatus, string> = {
  future: 'bg-muted text-muted-foreground',
  open: 'bg-primary/12 text-primary',
  closed: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  partial: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  overdue: 'bg-expense/12 text-expense',
  paid: 'bg-income/12 text-income',
  credit: 'bg-income/12 text-income',
}

/** Factura que conviene mostrar primero: la próxima a pagar o, si no hay, la abierta. */
export function focusStatement(card: CreditCard): Statement {
  return card.next_due ?? card.current_statement
}

/** Porcentaje del límite usado (0–100; 100 si no hay límite y hay deuda). */
export function usedPercent(card: CreditCard): number {
  const limit = Number(card.card.credit_limit)
  const debt = Number(card.debt)
  if (limit <= 0) return debt > 0 ? 100 : 0
  return Math.min(100, Math.max(0, (debt / limit) * 100))
}

/** Cuenta desde la que se propone pagar: la de pago de la tarjeta o la primera cuenta activa. */
export function paymentAccountFor(card: Pick<Account, 'card' | 'currency'>, accounts: Account[]): Account | undefined {
  const usable = accounts.filter((a) => !a.archived && a.kind !== 'credit_card')
  return (
    usable.find((a) => a.id === card.card?.payment_account_id) ??
    usable.find((a) => a.currency === card.currency) ??
    usable[0]
  )
}
