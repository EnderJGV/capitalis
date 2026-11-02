import { Link } from 'react-router-dom'
import { ArchiveIcon, ChevronRightIcon } from 'lucide-react'
import type { CreditCard } from '@/domain/types'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { dueLabel, focusStatement, STATUS_TONE, usedPercent } from '@/lib/cards'
import { cn } from '@/lib/utils'
import { capitalize, formatDate, monthLabel, useMoney } from '@/utils/format'
import { CardChip } from './CreditCardVisual'

/** Ficha de tarjeta: la factura que importa hoy, su estado y el límite usado. */
export function CreditCardTile({ card, className }: { card: CreditCard; className?: string }) {
  const { t } = useI18n()
  const money = useMoney()
  const statement = focusStatement(card)
  const isOpen = statement.status === 'open'
  const used = usedPercent(card)
  const over = Number(card.available) < 0
  const institution = card.institution_info

  return (
    <Link
      to={`/cuentas/${card.id}`}
      className={cn(
        'group flex flex-col gap-4 rounded-xl border bg-card p-4 transition-colors outline-none hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-ring/40',
        card.archived && 'opacity-70',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <CardChip
          name={card.name}
          network={card.card.network}
          institution={card.institution}
          info={card.institution_info}
          className="h-10 w-[60px]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{card.name}</p>
          <p className="truncate type-caption text-muted-foreground">
            {institution && institution.name !== card.name ? `${institution.name} · ` : ''}
            {card.card.last4 ? `•••• ${card.card.last4}` : t.accounts.kinds.credit_card}
          </p>
        </div>
        {card.archived ? (
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 type-caption text-muted-foreground">
            <ArchiveIcon className="size-3" />
            {t.accounts.archived}
          </span>
        ) : (
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate type-caption text-muted-foreground">
            {isOpen
              ? t.cards.currentStatement
              : format(t.cards.statementOf, { month: capitalize(monthLabel(statement.due_date.slice(0, 7))) })}
          </p>
          <p className="tabular truncate type-figure">{money(isOpen ? statement.total : statement.pending, card.currency)}</p>
          <p className={cn('truncate type-caption', statement.status === 'overdue' ? 'font-semibold text-expense' : 'text-muted-foreground')}>
            {isOpen ? format(t.cards.closes, { date: formatDate(statement.closing_date) }) : dueLabel(t, statement)}
          </p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 type-caption font-semibold', STATUS_TONE[statement.status])}>
          {t.cards.status[statement.status]}
        </span>
      </div>

      {/* Límite usado */}
      <div className="flex flex-col gap-1.5">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-label={t.cards.limit}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(used)}
        >
          <div
            className={cn('h-full rounded-full transition-[width]', over || used >= 90 ? 'bg-expense' : 'bg-primary')}
            style={{ width: `${used}%` }}
          />
        </div>
        <p className="tabular truncate type-caption text-muted-foreground">
          {over
            ? format(t.cards.overLimit, { amount: money(-Number(card.available), card.currency) })
            : format(t.cards.limitOf, {
                available: money(card.available, card.currency),
                limit: money(card.card.credit_limit, card.currency),
              })}
        </p>
      </div>
    </Link>
  )
}
