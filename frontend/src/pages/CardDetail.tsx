import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HandCoinsIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  ReceiptTextIcon,
} from 'lucide-react'
import { BrandBackdrop } from '@/components/app/BrandBackdrop'
import { CreditCardVisual } from '@/components/app/CreditCardVisual'
import { EmptyState } from '@/components/app/EmptyState'
import { SectionTitle } from '@/components/app/StatCard'
import { TransactionList, TransactionListSkeleton } from '@/components/app/TransactionList'
import { useQuickActions } from '@/components/app/TransactionEditorProvider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { CreditCard, InstallmentProgress, Statement, Transaction, Transfer } from '@/domain/types'
import { useCountUp } from '@/hooks/use-count-up'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { dueLabel, focusStatement, paymentAccountFor, STATUS_TONE, usedPercent } from '@/lib/cards'
import { cn } from '@/lib/utils'
import { cardsApi, transactionsApi, transfersApi } from '@/services/api'
import { capitalize, formatDate, monthLabel, useMoney } from '@/utils/format'

const LAST_ACCOUNT_KEY = 'capitalis-last-account'

/** Detalle de una tarjeta: deuda y límite, facturas (‹ ›) con su estado y "Pagar factura". */
export default function CardDetail({ cardId }: { cardId: number }) {
  const { t } = useI18n()
  const money = useMoney()
  const { accounts, openNew, openEdit, openEditTransfer, openTransfer, openCard, revision } = useQuickActions()
  const [card, setCard] = useState<CreditCard | null>(null)
  const [statements, setStatements] = useState<Statement[] | null>(null)
  const [month, setMonth] = useState<string | null>(null)
  const [items, setItems] = useState<{ txs: Transaction[]; transfers: Transfer[] } | null>(null)
  const [installments, setInstallments] = useState<InstallmentProgress[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setError('')
    Promise.all([cardsApi.get(cardId), cardsApi.statements(cardId), cardsApi.installments(cardId)])
      .then(([c, list, plans]) => {
        if (cancelled) return
        setCard(c)
        setStatements(list)
        setInstallments(plans)
        // Primero, la factura que importa hoy: la próxima a pagar o la abierta.
        setMonth((current) => (current && list.some((s) => s.month === current) ? current : focusStatement(c).month))
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [cardId, revision])

  const index = statements?.findIndex((s) => s.month === month) ?? -1
  const statement = index >= 0 ? statements![index] : null

  // Movimientos del ciclo de la factura elegida (compras, cuotas, reembolsos y pagos).
  useEffect(() => {
    if (!statement) return
    let cancelled = false
    setItems(null)
    const range = { account_id: cardId, start: statement.start_date, end: statement.closing_date }
    Promise.all([transactionsApi.list(range), transfersApi.list(range)])
      .then(([txs, transfers]) => !cancelled && setItems({ txs, transfers }))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId, statement?.month, statement?.start_date, revision])

  const animatedDebt = useCountUp(Number(card?.debt ?? 0))
  const payFrom = useMemo(() => (card ? paymentAccountFor(card, accounts ?? []) : undefined), [card, accounts])

  function newPurchase() {
    // El editor propone la última cuenta usada: se marca esta tarjeta para que venga elegida.
    try {
      localStorage.setItem(LAST_ACCOUNT_KEY, String(cardId))
    } catch {
      // Sin almacenamiento: el usuario elige la tarjeta a mano.
    }
    openNew()
  }

  function pay(s: Statement) {
    if (!card) return
    // Los pagos saldan primero las facturas más viejas: para dejar esta en cero hay que cubrir también
    // lo pendiente de las anteriores.
    const upTo = (statements ?? []).filter((x) => x.closing_date <= s.closing_date)
    const amount = upTo.reduce((sum, x) => sum + Math.round(Number(x.pending) * 100), 0) / 100
    openTransfer({
      fromAccountId: payFrom?.id,
      toAccountId: card.id,
      amount: amount.toFixed(2),
      description: format(t.cards.payDescription, { name: card.name }),
    })
  }

  async function toggleArchived() {
    if (!card) return
    try {
      const updated = await cardsApi.update(card.id, {
        name: card.name,
        currency: card.currency,
        institution: card.institution,
        ...card.card,
        archived: !card.archived,
      })
      setCard(updated)
      toast.success(updated.archived ? t.cards.archivedToast : t.cards.unarchivedToast)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.cardEditor.saveError)
    }
  }

  const heroGhost = 'text-sidebar-accent-foreground hover:bg-white/10 hover:text-sidebar-accent-foreground'
  const focus = card ? focusStatement(card) : null
  const used = card ? usedPercent(card) : 0
  const over = card ? Number(card.available) < 0 : false

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3 text-muted-foreground">
        <Link to="/cuentas">
          <ArrowLeftIcon />
          {t.cards.back}
        </Link>
      </Button>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 type-meta text-destructive">
          {error}
        </p>
      )}

      {!card ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <section className="relative isolate overflow-hidden rounded-xl bg-sidebar p-5 text-sidebar-foreground sm:p-7">
          <BrandBackdrop className="-z-10" />
          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,19rem)_1fr]">
            <CreditCardVisual
              name={card.name}
              network={card.card.network}
              last4={card.card.last4}
              institution={card.institution}
              info={card.institution_info}
              className="mx-auto max-w-76"
            />

            <div className="min-w-0">
              <h1 className="type-heading truncate text-sidebar-accent-foreground">{card.name}</h1>
              <p className="truncate type-caption">
                {card.institution_info && card.institution_info.name !== card.name ? `${card.institution_info.name} · ` : ''}
                {t.accounts.kinds.credit_card} · {card.currency}
                {card.archived && ` · ${t.accounts.archived}`}
              </p>

              <p className="mt-5 type-meta">{t.cards.debtTotal}</p>
              <p className="type-display text-sidebar-accent-foreground">{money(animatedDebt, card.currency)}</p>
              {Number(card.credit_balance) > 0 && (
                <p className="tabular type-meta text-income">
                  {t.cards.creditBalance}: {money(card.credit_balance, card.currency)}
                </p>
              )}

              <div className="mt-4 flex max-w-md flex-col gap-1.5">
                <div className="h-2 overflow-hidden rounded-full bg-white/10" role="meter" aria-label={t.cards.limit} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(used)}>
                  <div
                    className={cn('h-full rounded-full', over || used >= 90 ? 'bg-expense' : 'bg-sidebar-primary')}
                    style={{ width: `${used}%` }}
                  />
                </div>
                <p className="tabular type-caption">
                  {over
                    ? format(t.cards.overLimit, { amount: money(-Number(card.available), card.currency) })
                    : format(t.cards.limitOf, {
                        available: money(card.available, card.currency),
                        limit: money(card.card.credit_limit, card.currency),
                      })}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  size="lg"
                  className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                  onClick={newPurchase}
                  disabled={card.archived}
                >
                  <PlusIcon />
                  {t.cards.newPurchase}
                </Button>
                {focus && Number(focus.pending) > 0 && (
                  <Button size="lg" variant="ghost" className={heroGhost} onClick={() => pay(focus)} disabled={card.archived}>
                    <HandCoinsIcon />
                    {t.cards.pay}
                  </Button>
                )}
                <Button size="lg" variant="ghost" className={heroGhost} onClick={() => openCard(card)}>
                  <PencilIcon />
                  {t.accounts.edit}
                </Button>
                <Button size="lg" variant="ghost" className={heroGhost} onClick={toggleArchived}>
                  {card.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                  {card.archived ? t.accounts.unarchive : t.accounts.archive}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Factura elegida */}
      <section className="mt-6" aria-labelledby="statement-title">
        {!statement || !card ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <div className="rounded-xl border bg-card">
            <div className="flex items-center gap-1 border-b p-2">
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={t.cards.previousStatement}
                disabled={index <= 0}
                onClick={() => setMonth(statements![index - 1].month)}
              >
                <ChevronLeftIcon />
              </Button>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 text-center sm:flex-row sm:justify-center sm:gap-2">
                <h2 id="statement-title" className="truncate type-heading">
                  {format(t.cards.statementOf, { month: capitalize(monthLabel(statement.due_date.slice(0, 7))) })}
                </h2>
                <span className={cn('rounded-full px-2 py-0.5 type-caption font-semibold', STATUS_TONE[statement.status])}>
                  {t.cards.status[statement.status]}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={t.cards.nextStatement}
                disabled={index >= statements!.length - 1}
                onClick={() => setMonth(statements![index + 1].month)}
              >
                <ChevronRightIcon />
              </Button>
            </div>

            <dl className="grid grid-cols-3 divide-x">
              <Figure label={t.cards.total} value={money(statement.total, card.currency)} />
              <Figure label={t.cards.paid} value={money(statement.paid, card.currency)} tone="text-income" />
              <Figure
                label={t.cards.pending}
                value={money(statement.pending, card.currency)}
                tone={statement.status === 'overdue' ? 'text-expense' : undefined}
              />
            </dl>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
              <p className="type-meta text-muted-foreground">
                {format(statement.status === 'open' || statement.status === 'future' ? t.cards.closes : t.cards.closed, {
                  date: formatDate(statement.closing_date),
                })}
                {' · '}
                <span className={cn(statement.status === 'overdue' && 'font-semibold text-expense')}>
                  {statement.status === 'paid' ? format(t.cards.due, { date: formatDate(statement.due_date) }) : dueLabel(t, statement)}
                </span>
              </p>
              {Number(statement.pending) > 0 && statement.status !== 'future' && (
                <Button onClick={() => pay(statement)} disabled={card.archived}>
                  <HandCoinsIcon />
                  {t.cards.pay}
                </Button>
              )}
            </div>
          </div>
        )}
      </section>

      {card && installments.length > 0 && (
        <section className="mt-6" aria-labelledby="installments-title">
          <SectionTitle id="installments-title" icon={LayersIcon}>
            {t.cards.installmentsTitle}
          </SectionTitle>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {installments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="tabular flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 type-caption font-bold text-primary">
                  {p.charged}/{p.installments}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.description || money(p.total_amount, card.currency)}</p>
                  <div className="my-1.5 h-1.5 max-w-xs overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(p.charged / p.installments) * 100}%` }} />
                  </div>
                  <p className="truncate type-caption text-muted-foreground">
                    {format(t.cards.installmentProgress, { charged: p.charged, total: p.installments })}
                    {p.next_date && ` · ${format(t.cards.nextInstallment, { date: formatDate(p.next_date) })}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular font-semibold">
                    {format(t.cards.remaining, { amount: money(p.remaining, card.currency) })}
                  </p>
                  <p className="tabular type-caption text-muted-foreground">
                    {p.installments}× {money(p.installment_amount, card.currency)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6" aria-labelledby="statement-movements">
        <SectionTitle id="statement-movements" icon={ReceiptTextIcon}>
          {t.cards.purchases}
        </SectionTitle>
        {!items ? (
          <TransactionListSkeleton rows={4} />
        ) : items.txs.length + items.transfers.length === 0 ? (
          <div className="rounded-xl border bg-card">
            <EmptyState icon={ReceiptTextIcon} title={t.cards.noPurchases} />
          </div>
        ) : (
          <TransactionList
            items={items.txs}
            transfers={items.transfers}
            accountId={cardId}
            onSelect={openEdit}
            onSelectTransfer={openEditTransfer}
          />
        )}
      </section>
    </>
  )
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 px-3 py-3 text-center sm:px-4">
      <dt className="truncate type-caption text-muted-foreground">{label}</dt>
      <dd className={cn('tabular truncate type-meta font-semibold sm:text-base', tone)}>{value}</dd>
    </div>
  )
}
