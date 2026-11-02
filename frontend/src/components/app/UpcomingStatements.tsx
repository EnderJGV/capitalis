import { Link } from 'react-router-dom'
import { BellIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Account, CreditCard, Statement } from '@/domain/types'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { dueLabel, paymentAccountFor, statementAlerts } from '@/lib/cards'
import { cn } from '@/lib/utils'
import { useMoney } from '@/utils/format'
import { CardChip } from './CreditCardVisual'
import { SectionTitle } from './StatCard'

interface Props {
  cards: CreditCard[]
  /** Cuentas desde las que se puede pagar (incluye tarjetas; se filtran al elegir). */
  accounts: Account[]
  onPay: (preset: { fromAccountId?: number; toAccountId: number; amount: string; description: string }) => void
}

/** Facturas vencidas (rojo) o que vencen en 7 días (ámbar), con el monto pendiente y "Pagar". */
export function UpcomingStatements({ cards, accounts, onPay }: Props) {
  const { t } = useI18n()
  const money = useMoney()
  const alerts = statementAlerts(cards)
  if (alerts.length === 0) return null

  return (
    <section aria-labelledby="upcoming-title" className="mb-4">
      <SectionTitle id="upcoming-title" icon={BellIcon}>
        {t.dashboard.upcoming}
      </SectionTitle>
      <ul className="flex flex-col gap-2">
        {alerts.map(({ card, statement, overdue }) => (
          <li key={`${card.id}-${statement.month}`}>
            <StatementAlertRow
              card={card}
              statement={statement}
              overdue={overdue}
              amount={money(statement.pending, card.currency)}
              onPay={() => {
                const from = paymentAccountFor(card, accounts)
                onPay({
                  fromAccountId: from?.id,
                  toAccountId: card.id,
                  amount: statement.pending,
                  description: format(t.cards.payDescription, { name: card.name }),
                })
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

function StatementAlertRow({
  card,
  statement,
  overdue,
  amount,
  onPay,
}: {
  card: CreditCard
  statement: Statement
  overdue: boolean
  amount: string
  onPay: () => void
}) {
  const { t } = useI18n()
  const last4 = card.card.last4

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4',
        overdue ? 'border-expense/35 bg-expense/5' : 'border-amber-500/40 bg-amber-500/10',
      )}
    >
      <Link
        to={`/cuentas/${card.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <CardChip
          name={card.name}
          network={card.card.network}
          institution={card.institution}
          info={card.institution_info}
          className="h-10 w-[60px]"
        />
        <span className="min-w-0">
          <span className="block truncate font-semibold">
            {card.name}
            {last4 && <span className="tabular ml-1.5 font-medium text-muted-foreground">•••• {last4}</span>}
          </span>
          <span className={cn('block truncate type-caption', overdue ? 'font-semibold text-expense' : 'text-amber-700 dark:text-amber-300')}>
            {dueLabel(t, statement)}
          </span>
        </span>
      </Link>
      <div className="flex items-center justify-between gap-3 sm:shrink-0 sm:justify-end">
        <span className={cn('tabular font-semibold', overdue && 'text-expense')}>{amount}</span>
        <Button type="button" size="sm" onClick={onPay} className="shrink-0">
          {t.cards.pay}
        </Button>
      </div>
    </div>
  )
}
