import { ArrowLeftRightIcon } from 'lucide-react'
import type { Transaction, Transfer } from '@/domain/types'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n/I18nProvider'
import { TYPE_ICON } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { dayHeading, useMoney } from '@/utils/format'

interface Props {
  items: Transaction[]
  /** Transferencias que se mezclan con los movimientos en cada día. */
  transfers?: Transfer[]
  onSelect: (tx: Transaction) => void
  onSelectTransfer?: (transfer: Transfer) => void
  /** Muestra el saldo de cada día junto al encabezado (solo si todo el día está en una moneda). */
  showSubtotals?: boolean
  /** Vista de una cuenta: las transferencias se muestran como salida (−) o entrada (+) de esa cuenta. */
  accountId?: number
  className?: string
}

type Item = { kind: 'tx'; date: string; id: number; tx: Transaction } | { kind: 'transfer'; date: string; id: number; transfer: Transfer }

interface DayGroup {
  date: string
  items: Item[]
}

function groupByDay(items: Item[]): DayGroup[] {
  const sorted = [...items].sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1))
  const groups = new Map<string, DayGroup>()
  for (const item of sorted) {
    const group = groups.get(item.date) ?? { date: item.date, items: [] }
    group.items.push(item)
    groups.set(item.date, group)
  }
  return [...groups.values()]
}

function signed(value: number): string {
  if (value > 0) return '+'
  if (value < 0) return '−'
  return ''
}

/** Saldo del día y su moneda, o null si el día mezcla monedas (no se puede sumar sin convertir). */
function daySubtotal(group: DayGroup, accountId?: number): { total: number; currency: string } | null {
  let total = 0
  let currency: string | null = null
  for (const item of group.items) {
    let amount: number
    let cur: string | undefined
    if (item.kind === 'tx') {
      amount = (item.tx.type === 'income' ? 1 : -1) * Number(item.tx.amount)
      cur = item.tx.account?.currency
    } else if (accountId) {
      const out = item.transfer.from_account_id === accountId
      amount = out ? -Number(item.transfer.amount) : Number(item.transfer.received_amount)
      cur = out ? item.transfer.from_account?.currency : item.transfer.to_account?.currency
    } else {
      continue // sin perspectiva de cuenta, una transferencia no cambia el total
    }
    if (!cur || (currency && cur !== currency)) return null
    currency = cur
    total += amount
  }
  return currency ? { total, currency } : null
}

/** Lista de movimientos y transferencias agrupada por día, al estilo de una app bancaria. */
export function TransactionList({
  items,
  transfers = [],
  onSelect,
  onSelectTransfer,
  showSubtotals = false,
  accountId,
  className,
}: Props) {
  const { t } = useI18n()
  const money = useMoney()
  const all: Item[] = [
    ...items.map((tx) => ({ kind: 'tx' as const, date: tx.date, id: tx.id, tx })),
    ...transfers.map((transfer) => ({ kind: 'transfer' as const, date: transfer.date, id: transfer.id, transfer })),
  ]
  const rowClass =
    'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset'

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card', className)}>
      {groupByDay(all).map((group) => {
        const subtotal = showSubtotals ? daySubtotal(group, accountId) : null
        return (
          <section key={group.date} aria-label={dayHeading(group.date)} className="border-b last:border-b-0">
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-1.5 type-caption">
              <h3 className="font-semibold text-muted-foreground">{dayHeading(group.date)}</h3>
              {subtotal && (
                <span className="tabular font-medium text-muted-foreground">
                  {signed(subtotal.total)}
                  {money(Math.abs(subtotal.total), subtotal.currency)}
                </span>
              )}
            </div>
            <ul className="divide-y">
              {group.items.map((item) =>
                item.kind === 'tx' ? (
                  <li key={`tx-${item.id}`}>
                    <button type="button" onClick={() => onSelect(item.tx)} className={rowClass}>
                      <TypeBadge tx={item.tx} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {item.tx.description ||
                            item.tx.category?.name ||
                            (item.tx.type === 'income' ? t.common.income : t.common.expense)}
                        </span>
                        <span className="block truncate type-meta text-muted-foreground">
                          {item.tx.category?.name ?? t.common.noCategory}
                          {item.tx.account && !accountId && ` · ${item.tx.account.name}`}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'tabular shrink-0 font-semibold',
                          item.tx.type === 'income' ? 'text-income' : 'text-foreground',
                        )}
                      >
                        {item.tx.type === 'income' ? '+' : '−'}
                        {money(item.tx.amount, item.tx.account?.currency)}
                      </span>
                    </button>
                  </li>
                ) : (
                  <li key={`tr-${item.id}`}>
                    <TransferRow
                      transfer={item.transfer}
                      accountId={accountId}
                      className={rowClass}
                      onClick={() => onSelectTransfer?.(item.transfer)}
                    />
                  </li>
                ),
              )}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function TransferRow({
  transfer,
  accountId,
  className,
  onClick,
}: {
  transfer: Transfer
  accountId?: number
  className: string
  onClick: () => void
}) {
  const { t } = useI18n()
  const money = useMoney()
  const fromName = transfer.from_account?.name ?? '?'
  const toName = transfer.to_account?.name ?? '?'
  const fromCur = transfer.from_account?.currency
  const toCur = transfer.to_account?.currency
  const outgoing = accountId === transfer.from_account_id
  const incoming = accountId === transfer.to_account_id

  return (
    <button type="button" onClick={onClick} className={className}>
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
        role="img"
        aria-label={t.transfer.label}
      >
        <ArrowLeftRightIcon className="size-4" strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{transfer.description || `${fromName} → ${toName}`}</span>
        <span className="block truncate type-meta text-muted-foreground">
          {t.transfer.label} · {fromName} → {toName}
        </span>
      </span>
      <span className="shrink-0 text-right">
        {outgoing || incoming ? (
          <span className={cn('tabular block font-semibold', incoming && 'text-income')}>
            {incoming ? `+${money(transfer.received_amount, toCur)}` : `−${money(transfer.amount, fromCur)}`}
          </span>
        ) : (
          <>
            <span className="tabular block font-semibold">{money(transfer.amount, fromCur)}</span>
            {fromCur !== toCur && (
              <span className="tabular block type-caption text-muted-foreground">
                → {money(transfer.received_amount, toCur)}
              </span>
            )}
          </>
        )}
      </span>
    </button>
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
