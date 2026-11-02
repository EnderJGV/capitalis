import { PiggyBankIcon, ReceiptTextIcon, TriangleAlertIcon } from 'lucide-react'
import type { CategoryTotal } from '@/domain/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { rich, useI18n } from '@/i18n/I18nProvider'
import { format, getMessages } from '@/i18n/runtime'
import { cn } from '@/lib/utils'
import { CategoryAvatar } from './CategoryAvatar'

const MAX_SEGMENTS = 6

interface Props {
  income: number
  expense: number
  categories: CategoryTotal[]
  /** Formatea montos en la moneda del usuario. */
  money: (value: string | number) => string
  /** Cambiarlo reinicia la animación de crecimiento (p. ej., al cambiar de mes). */
  animationKey?: string
  className?: string
}

interface Segment {
  key: string
  name: string
  color: string
  icon: string
  total: number
}

function toSegments(categories: CategoryTotal[]): Segment[] {
  const sorted = [...categories].sort((a, b) => Number(b.total) - Number(a.total))
  const head = sorted.slice(0, MAX_SEGMENTS - 1)
  const tail = sorted.slice(MAX_SEGMENTS - 1)
  const toSegment = (c: CategoryTotal): Segment => ({
    key: String(c.category_id ?? 'none'),
    name: c.name,
    color: c.color,
    icon: c.icon,
    total: Number(c.total),
  })
  const segments = head.map(toSegment)
  if (tail.length === 1) {
    segments.push(toSegment(tail[0]))
  } else if (tail.length > 1) {
    segments.push({
      key: 'rest',
      name: format(getMessages().strip.others, { n: tail.length }),
      color: 'var(--muted-foreground)',
      icon: '',
      total: tail.reduce((sum, c) => sum + Number(c.total), 0),
    })
  }
  return segments
}

/**
 * La franja del mes, en versión compacta: una línea con cuánto queda, una barra fina por categorías
 * y una leyenda pequeña. Si se gastó más de lo que entró, la barra entera se vuelve roja.
 */
export function MonthStrip({ income, expense, categories, money, animationKey, className }: Props) {
  const { t } = useI18n()
  const remaining = income - expense
  const overspent = remaining < 0
  const empty = income === 0 && expense === 0
  const segments = toSegments(categories)
  const base = Math.max(income, expense, 1)
  const usedPct = income > 0 ? Math.round((expense / income) * 100) : null

  const summary = overspent
    ? format(t.strip.summaryOverspent, { amount: money(-remaining) })
    : format(t.strip.summaryLeft, { expense: money(expense), income: money(income), left: money(remaining) })

  return (
    <section className={cn('rounded-xl border bg-card px-4 py-3.5 sm:px-5', className)} aria-label={t.strip.label}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {empty ? (
          <p className="flex items-center gap-2 type-meta text-muted-foreground">
            <ReceiptTextIcon className="size-4 shrink-0" aria-hidden />
            {t.strip.empty}
          </p>
        ) : overspent ? (
          <p className="flex items-center gap-2 type-meta">
            <TriangleAlertIcon className="size-4 shrink-0 text-expense" aria-hidden />
            <span>
              {rich(t.strip.overspent, {
                amount: <strong className="tabular font-semibold text-expense">{money(-remaining)}</strong>,
              })}
            </span>
          </p>
        ) : (
          <p className="flex items-center gap-2 type-meta">
            <PiggyBankIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              {rich(t.strip.left, {
                amount: <strong className="tabular font-semibold">{money(remaining)}</strong>,
                income: <span className="tabular">{money(income)}</span>,
              })}
            </span>
          </p>
        )}
        {usedPct !== null && (
          <span className={cn('tabular type-caption font-medium', overspent ? 'text-expense' : 'text-muted-foreground')}>
            {format(t.strip.used, { pct: usedPct })}
          </span>
        )}
      </div>

      <div
        key={animationKey}
        role="img"
        aria-label={empty ? t.strip.noMovements : summary}
        className="mt-2.5 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full animate-strip-grow motion-reduce:animate-none"
      >
        {empty ? (
          <div className="h-full flex-1 bg-muted" />
        ) : overspent ? (
          <div className="h-full flex-1 bg-expense" />
        ) : (
          <>
            {segments.map((s) => (
              <Tooltip key={s.key}>
                <TooltipTrigger asChild>
                  <div
                    className="h-full shrink-0 transition-opacity hover:opacity-80"
                    style={{ width: `${Math.max((s.total / base) * 100, 0.8)}%`, background: s.color }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {s.icon} {s.name}: <span className="tabular">{money(s.total)}</span>
                </TooltipContent>
              </Tooltip>
            ))}
            {remaining > 0 && <div className="h-full min-w-1 flex-1 bg-available" />}
          </>
        )}
      </div>

      {segments.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 type-caption">
          {segments.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <CategoryAvatar color={s.color} icon={s.icon} size="xs" />
              <span>{s.name}</span>
              <span className="tabular text-muted-foreground">{money(s.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function MonthStripSkeleton({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <div className={cn('rounded-xl border bg-card px-4 py-3.5 sm:px-5', className)} aria-busy="true" aria-label={t.strip.loading}>
      <Skeleton className="h-4 w-64" />
      <Skeleton className="mt-3 h-2.5 w-full rounded-full" />
      <div className="mt-3 flex gap-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}
