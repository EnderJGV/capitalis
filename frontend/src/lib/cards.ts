import type { Account, CreditCard, Statement, StatementStatus } from '@/domain/types'
import type { Messages } from '@/i18n/messages/es'
import { format } from '@/i18n/runtime'
import { formatDate, todayISO } from '@/utils/format'

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
