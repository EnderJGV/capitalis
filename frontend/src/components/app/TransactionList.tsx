import type { Transaction } from '@/domain/types'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n/I18nProvider'
import { TYPE_ICON } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { dayHeading, useMoney } from '@/utils/format'

interface Props {
  items: Transaction[]
  onSelect: (tx: Transaction) => void
  /** Muestra el saldo de cada día junto al encabezado. */
  showSubtotals?: boolean
  className?: string
}

interface DayGroup {
  date: string
  items: Transaction[]
  subtotal: number
}

function groupByDay(items: Transaction[]): DayGroup[] {
  const groups = new Map<string, DayGroup>()
  for (const tx of items) {
    const group = groups.get(tx.date) ?? { date: tx.date, items: [], subtotal: 0 }
    group.items.push(tx)
    group.subtotal += (tx.type === 'income' ? 1 : -1) * Number(tx.amount)
    groups.set(tx.date, group)
  }
  return [...groups.values()]
}

function signed(value: number): string {
  if (value > 0) return '+'
  if (value < 0) return '−'
  return ''
}

/** Lista de movimientos agrupada por día, al estilo de una app bancaria, en un único card. */
export function TransactionList({ items, onSelect, showSubtotals = false, className }: Props) {
  const { t } = useI18n()
  const money = useMoney()

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card', className)}>
      {groupByDay(items).map((group) => (
        <section key={group.date} aria-label={dayHeading(group.date)} className="border-b last:border-b-0">
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-1.5 type-caption">
            <h3 className="font-semibold text-muted-foreground">{dayHeading(group.date)}</h3>
            {showSubtotals && (
              <span className="tabular font-medium text-muted-foreground">
                {signed(group.subtotal)}
                {money(Math.abs(group.subtotal))}
              </span>
            )}
          </div>
          <ul className="divide-y">
            {group.items.map((tx) => (
              <li key={tx.id}>
                <button
                  type="button"
                  onClick={() => onSelect(tx)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset"
                >
                  <TypeBadge tx={tx} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {tx.description || tx.category?.name || (tx.type === 'income' ? t.common.income : t.common.expense)}
                    </span>
                    <span className="block truncate type-meta text-muted-foreground">
                      {tx.category?.name ?? t.common.noCategory}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'tabular shrink-0 font-semibold',
                      tx.type === 'income' ? 'text-income' : 'text-foreground',
                    )}
                  >
                    {tx.type === 'income' ? '+' : '−'}
                    {money(tx.amount)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** Círculo con el color de la categoría y su emoji; sin emoji, la flecha del tipo de movimiento. */
function TypeBadge({ tx }: { tx: Transaction }) {
  const { t } = useI18n()
  const Icon = TYPE_ICON[tx.type]
  const color = tx.category?.color ?? 'var(--muted-foreground)'
  const emoji = tx.category?.icon
  return (
    <span
      className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-lg leading-none"
      style={{ color }}
      aria-label={tx.type === 'income' ? t.common.income : t.common.expense}
      role="img"
    >
      <span className="absolute inset-0 rounded-full bg-current opacity-15" />
      {emoji ? <span className="relative">{emoji}</span> : <Icon className="relative size-4" strokeWidth={2.25} />}
    </span>
  )
}

export function TransactionListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  const { t } = useI18n()
  return (
    <div
      className={cn('overflow-hidden rounded-xl border bg-card', className)}
      aria-busy="true"
      aria-label={t.movements.loading}
    >
      <div className="border-b bg-muted/50 px-4 py-2">
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
