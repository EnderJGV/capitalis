import { addMonths, currentMonth, todayISO, toISODate } from '@/utils/format'

export type PeriodPreset = 'thisMonth' | 'last30' | 'lastMonth' | 'last3' | 'custom'

export const PERIOD_PRESETS: Exclude<PeriodPreset, 'custom'>[] = ['thisMonth', 'last30', 'lastMonth', 'last3']

export interface Period {
  preset: PeriodPreset
  /** YYYY-MM-DD, ambos incluidos. */
  start: string
  end: string
}

function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  return { start: `${month}-01`, end: toISODate(new Date(y, m, 0)) }
}

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toISODate(d)
}

export function presetPeriod(preset: Exclude<PeriodPreset, 'custom'>): Period {
  switch (preset) {
    case 'thisMonth':
      return { preset, ...monthBounds(currentMonth()) }
    case 'last30':
      return { preset, start: daysAgo(29), end: todayISO() }
    case 'lastMonth':
      return { preset, ...monthBounds(addMonths(currentMonth(), -1)) }
    case 'last3':
      return { preset, start: monthBounds(addMonths(currentMonth(), -2)).start, end: monthBounds(currentMonth()).end }
  }
}

/** Período de un mes concreto (p. ej., al venir desde "Ver todos" del Resumen con ?mes=). */
export function monthPeriod(month: string): Period {
  return month === currentMonth() ? presetPeriod('thisMonth') : { preset: 'custom', ...monthBounds(month) }
}

/** Por defecto: el mes actual, el más reciente. */
export const DEFAULT_PERIOD = (): Period => presetPeriod('thisMonth')
