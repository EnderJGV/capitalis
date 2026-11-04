import type { Goal, GoalKind, GoalPace } from '@/domain/types'
import type { Messages } from '@/i18n/messages/es'

export interface GoalTemplate {
  /** Clave del nombre en t.goalEditor.templates. */
  key: keyof Messages['goalEditor']['templates']
  kind: GoalKind
  icon: string
  color: string
}

/** Plantillas para empezar: cambian el tipo, el emoji y el color; la lógica es la misma para todas. */
export const GOAL_TEMPLATES: GoalTemplate[] = [
  { key: 'car', kind: 'material', icon: '🚗', color: '#3F74C4' },
  { key: 'house', kind: 'material', icon: '🏠', color: '#7E62C6' },
  { key: 'tech', kind: 'material', icon: '📱', color: '#2E8B74' },
  { key: 'bike', kind: 'material', icon: '🏍️', color: '#D0583F' },
  { key: 'gift', kind: 'material', icon: '🎁', color: '#C0508F' },
  { key: 'trip', kind: 'personal', icon: '✈️', color: '#3F74C4' },
  { key: 'studies', kind: 'personal', icon: '🎓', color: '#B57A12' },
  { key: 'emergency', kind: 'personal', icon: '🛟', color: '#D0583F' },
  { key: 'wedding', kind: 'personal', icon: '💍', color: '#C0508F' },
  { key: 'health', kind: 'personal', icon: '🩺', color: '#3E9A55' },
  { key: 'other', kind: 'personal', icon: '⭐', color: '#64788F' },
]

/** Colores de la etiqueta de ritmo. */
export const PACE_TONE: Record<GoalPace, string> = {
  on_track: 'bg-income/12 text-income',
  slightly_behind: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  behind: 'bg-expense/12 text-expense',
  overdue: 'bg-expense/12 text-expense',
}

/** Los objetivos todavía abiertos reservan dinero; los logrados y archivados no. */
export const isOpen = (goal: Pick<Goal, 'status'>) => goal.status === 'active' || goal.status === 'completed'

/** Meses que quedan hasta la fecha límite, contando el actual (mínimo 1); igual que el servidor. */
export function monthsLeft(targetDate: string, today = new Date()): number {
  const [y, m] = targetDate.split('-').map(Number)
  return Math.max(1, (y - today.getFullYear()) * 12 + (m - 1 - today.getMonth()) + 1)
}

/** Lo que hay que aportar por mes, redondeado hacia arriba al centavo. */
export function monthlyNeeded(remaining: number, months: number): number {
  return remaining <= 0 ? 0 : Math.ceil((remaining / Math.max(1, months)) * 100 - 1e-9) / 100
}

export function addMonthsISO(months: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth() + months, from.getDate())
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
