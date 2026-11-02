import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  ArrowLeftRightIcon,
  HistoryIcon,
  PencilIcon,
  PlusIcon,
  ReceiptTextIcon,
} from 'lucide-react'
import { BrandBackdrop } from '@/components/app/BrandBackdrop'
import { EmptyState } from '@/components/app/EmptyState'
import { InstitutionLogo } from '@/components/app/InstitutionLogo'
import { SectionTitle } from '@/components/app/StatCard'
import { TransactionList, TransactionListSkeleton } from '@/components/app/TransactionList'
import { useQuickActions } from '@/components/app/TransactionEditorProvider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Account, Transaction, Transfer } from '@/domain/types'
import { useCountUp } from '@/hooks/use-count-up'
import { useI18n } from '@/i18n/I18nProvider'
import { accountsApi, transactionsApi, transfersApi } from '@/services/api'
import { useMoney } from '@/utils/format'
import CardDetail from './CardDetail'

const LAST_ACCOUNT_KEY = 'capitalis-last-account'

/** /cuentas/:id muestra una cuenta o, si es una tarjeta de crédito, su detalle con las facturas. */
export default function AccountDetail() {
  const { id } = useParams()
  const accountId = Number(id)
  const { accounts } = useQuickActions()
  if (!accounts) return <Skeleton className="mt-11 h-44 w-full rounded-xl" />
  const known = accounts.find((a) => a.id === accountId)
  if (known?.kind === 'credit_card') return <CardDetail key={accountId} cardId={accountId} />
  return <BankAccountDetail key={accountId} accountId={accountId} />
}

function BankAccountDetail({ accountId }: { accountId: number }) {
  const { t } = useI18n()
  const money = useMoney()
  const { openNew, openEdit, openTransfer, openEditTransfer, openAccount, revision } = useQuickActions()
  const [account, setAccount] = useState<Account | null>(null)
  const [items, setItems] = useState<{ txs: Transaction[]; transfers: Transfer[] } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setError('')
    Promise.all([
      accountsApi.get(accountId),
      transactionsApi.list({ account_id: accountId }),
      transfersApi.list({ account_id: accountId }),
    ])
      .then(([acc, txs, transfers]) => {
        if (cancelled) return
        setAccount(acc)
        setItems({ txs, transfers })
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [accountId, revision])

  const animated = useCountUp(Number(account?.balance ?? 0))

  function newMovementHere() {
    // El editor propone la última cuenta usada: se marca esta para que venga elegida.
    try {
      localStorage.setItem(LAST_ACCOUNT_KEY, String(accountId))
    } catch {
      // Sin almacenamiento: el usuario elige la cuenta a mano.
    }
    openNew()
  }

  async function toggleArchived() {
    if (!account) return
    try {
      const updated = await accountsApi.update(account.id, {
        name: account.name,
        currency: account.currency,
        kind: account.kind,
        institution: account.institution,
        initial_balance: account.initial_balance,
        archived: !account.archived,
      })
      setAccount({ ...account, ...updated })
      toast.success(updated.archived ? t.accounts.archivedToast : t.accounts.unarchivedToast)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.accountEditor.saveError)
    }
  }

  const institution = account?.institution_info

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3 text-muted-foreground">
        <Link to="/cuentas">
          <ArrowLeftIcon />
          {t.accounts.back}
        </Link>
      </Button>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 type-meta text-destructive">
          {error}
        </p>
      )}

      {!account ? (
        <Skeleton className="h-44 w-full rounded-xl" />
      ) : (
        <section className="relative isolate overflow-hidden rounded-xl bg-sidebar p-5 text-sidebar-foreground sm:p-7">
          <BrandBackdrop className="-z-10" />
          <div className="flex items-center gap-3">
            <InstitutionLogo institution={account.institution} info={account.institution_info} name={account.name} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="type-heading truncate text-sidebar-accent-foreground">{account.name}</h1>
              <p className="truncate type-caption">
                {institution && institution.name !== account.name ? `${institution.name} · ` : ''}
                {t.accounts.kinds[account.kind]} · {account.currency}
                {account.archived && ` · ${t.accounts.archived}`}
              </p>
            </div>
          </div>
          <p className="mt-6 type-meta">{t.accounts.balance}</p>
          <p className="type-display text-sidebar-accent-foreground">{money(animated, account.currency)}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="lg" className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" onClick={newMovementHere} disabled={account.archived}>
              <PlusIcon />
              {t.nav.newMovement}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-sidebar-accent-foreground hover:bg-white/10 hover:text-sidebar-accent-foreground"
              onClick={() => openTransfer({ fromAccountId: account.id })}
              disabled={account.archived}
            >
              <ArrowLeftRightIcon />
              {t.accounts.transferFromHere}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-sidebar-accent-foreground hover:bg-white/10 hover:text-sidebar-accent-foreground"
              onClick={() => openAccount(account)}
            >
              <PencilIcon />
              {t.accounts.edit}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-sidebar-accent-foreground hover:bg-white/10 hover:text-sidebar-accent-foreground"
              onClick={toggleArchived}
            >
              {account.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
              {account.archived ? t.accounts.unarchive : t.accounts.archive}
            </Button>
          </div>
        </section>
      )}

      <section className="mt-6" aria-labelledby="account-movements">
        <SectionTitle id="account-movements" icon={HistoryIcon}>
          {t.accounts.movementsTitle}
        </SectionTitle>
        {!items ? (
          <TransactionListSkeleton rows={5} />
        ) : items.txs.length + items.transfers.length === 0 ? (
          <div className="rounded-xl border bg-card">
            <EmptyState icon={ReceiptTextIcon} title={t.accounts.noMovements} />
          </div>
        ) : (
          <TransactionList
            items={items.txs}
            transfers={items.transfers}
            accountId={accountId}
            onSelect={openEdit}
            onSelectTransfer={openEditTransfer}
            showSubtotals
          />
        )}
      </section>
    </>
  )
}
