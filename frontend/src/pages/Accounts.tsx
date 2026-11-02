import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRightIcon, LandmarkIcon, PlusIcon, WalletIcon } from 'lucide-react'
import { AccountCard } from '@/components/app/AccountCard'
import { BrandBackdrop } from '@/components/app/BrandBackdrop'
import { EmptyState } from '@/components/app/EmptyState'
import { PageHeader } from '@/components/app/PageHeader'
import { useQuickActions } from '@/components/app/TransactionEditorProvider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import type { Account } from '@/domain/types'
import { useCountUp } from '@/hooks/use-count-up'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { accountsApi } from '@/services/api'
import { currencyName, useMoney } from '@/utils/format'

export default function Accounts() {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const money = useMoney()
  const { openAccount, openTransfer, revision } = useQuickActions()
  const [showArchived, setShowArchived] = useState(false)
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [error, setError] = useState('')
  const main = user?.currency ?? 'BRL'

  useEffect(() => {
    let cancelled = false
    accountsApi
      .list(showArchived)
      .then((list) => !cancelled && setAccounts(list))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [showArchived, revision])

  const active = useMemo(() => (accounts ?? []).filter((a) => !a.archived), [accounts])
  const total = active.reduce((sum, a) => sum + Number(a.converted_balance ?? 0), 0)
  const missing = [...new Set(active.filter((a) => a.converted_balance === null).map((a) => a.currency))]
  const approximate = active.some((a) => a.currency !== main)

  // Agrupadas por moneda, con el total de cada grupo en esa moneda.
  const groups = useMemo(() => {
    const byCurrency = new Map<string, Account[]>()
    for (const a of accounts ?? []) byCurrency.set(a.currency, [...(byCurrency.get(a.currency) ?? []), a])
    return [...byCurrency.entries()].sort(([a], [b]) => (a === main ? -1 : b === main ? 1 : a.localeCompare(b)))
  }, [accounts, main])

  return (
    <>
      <PageHeader title={t.accounts.title}>
        <Button variant="outline" size="lg" onClick={() => openTransfer()} disabled={active.length < 2}>
          <ArrowLeftRightIcon />
          {t.accounts.transfer}
        </Button>
        <Button size="lg" onClick={() => openAccount()}>
          <PlusIcon />
          {t.accounts.new}
        </Button>
      </PageHeader>
      <p className="-mt-3 mb-5 type-meta text-muted-foreground sm:-mt-4">{t.accounts.subtitle}</p>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 type-meta text-destructive">
          {error}
        </p>
      )}

      {!accounts ? (
        <div className="grid gap-4" aria-busy="true" aria-label={t.accounts.loading}>
          <Skeleton className="h-36 w-full rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      ) : accounts.length === 0 && !showArchived ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={WalletIcon}
            title={t.accounts.emptyTitle}
            description={t.accounts.emptyDescription}
            action={
              <Button size="lg" onClick={() => openAccount()}>
                <PlusIcon />
                {t.accounts.addFirst}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <NetWorth
            total={total}
            currency={main}
            approximate={approximate}
            missing={missing}
            count={active.length}
            money={money}
          />

          {groups.map(([currency, list]) => {
            const subtotal = list.filter((a) => !a.archived).reduce((sum, a) => sum + Number(a.balance), 0)
            return (
              <section key={currency} aria-labelledby={`currency-${currency}`}>
                <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
                  <h2 id={`currency-${currency}`} className="type-heading flex items-center gap-2">
                    <LandmarkIcon className="size-5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
                    {currency}
                    <span className="type-meta font-normal text-muted-foreground">
                      {currencyName(currency, locale)}
                    </span>
                  </h2>
                  <span className="tabular type-meta font-semibold">{money(subtotal, currency)}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((a) => (
                    <AccountCard key={a.id} account={a} mainCurrency={main} />
                  ))}
                </div>
              </section>
            )
          })}

          <label className="flex w-fit cursor-pointer items-center gap-2 px-1 type-meta text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            {t.accounts.showArchived}
          </label>
        </div>
      )}
    </>
  )
}

interface NetWorthProps {
  total: number
  currency: string
  approximate: boolean
  missing: string[]
  count: number
  money: (value: string | number, currency?: string) => string
}

function NetWorth({ total, currency, approximate, missing, count, money }: NetWorthProps) {
  const { t } = useI18n()
  const animated = useCountUp(total)
  return (
    <section className="relative isolate overflow-hidden rounded-xl bg-sidebar p-5 text-sidebar-foreground sm:p-6">
      <BrandBackdrop className="-z-10" />
      <div className="flex items-center justify-between gap-3">
        <p className="type-meta font-medium">{t.accounts.netWorth}</p>
        <span className="rounded-full bg-white/10 px-2.5 py-1 type-caption">
          {format(count === 1 ? t.accounts.countOne : t.accounts.countMany, { n: count })}
        </span>
      </div>
      <p className="mt-2 type-display text-sidebar-accent-foreground">
        {approximate && '≈ '}
        {money(animated, currency)}
      </p>
      {approximate && <p className="mt-1 type-caption">{format(t.balance.approximate, { currency })}</p>}
      {missing.length > 0 && (
        <p className="mt-1 type-caption text-[#F7A39E]">{format(t.balance.missing, { currencies: missing.join(', ') })}</p>
      )}
    </section>
  )
}
