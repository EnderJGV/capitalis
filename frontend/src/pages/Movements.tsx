import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarRangeIcon, ChartPieIcon, ListIcon, PlusIcon, ReceiptTextIcon, ScaleIcon, SearchIcon, XIcon } from 'lucide-react'
import { CategoryAvatar } from '@/components/app/CategoryAvatar'
import { CategoryChips } from '@/components/app/CategoryChips'
import { EmptyState } from '@/components/app/EmptyState'
import { InstitutionLogo } from '@/components/app/InstitutionLogo'
import { MovementFilters } from '@/components/app/MovementFilters'
import { PageHeader } from '@/components/app/PageHeader'
import { SectionTitle, StatCard } from '@/components/app/StatCard'
import { TransactionList, TransactionListSkeleton } from '@/components/app/TransactionList'
import { useTransactionEditor } from '@/components/app/TransactionEditorProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Category, Transaction, Transfer, TxType } from '@/domain/types'
import { format } from '@/i18n/runtime'
import { useI18n } from '@/i18n/I18nProvider'
import { TYPE_ICON } from '@/lib/icons'
import { DEFAULT_PERIOD, monthPeriod, type Period } from '@/lib/periods'
import { categoriesApi, transactionsApi, transfersApi } from '@/services/api'
import { formatDate, useMoney } from '@/utils/format'

type TypeFilter = TxType | 'all'

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

interface CategoryShare {
  key: string
  name: string
  color: string
  icon: string
  total: number
}

export default function Movements() {
  const { t } = useI18n()
  const money = useMoney()
  const { openNew, openEdit, openEditTransfer, accounts, revision } = useTransactionEditor()
  const [params] = useSearchParams()
  // Por defecto, el mes actual; si se llega desde "Ver todos" del Resumen (?mes=), ese mes.
  const [period, setPeriod] = useState<Period>(() => {
    const mes = params.get('mes')
    return mes && MONTH_RE.test(mes) ? monthPeriod(mes) : DEFAULT_PERIOD()
  })
  const [type, setType] = useState<TypeFilter>('all')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [accountId, setAccountId] = useState<number | null>(null)
  const [transfers, setTransfers] = useState<Transfer[] | null>(null)
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Transaction[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch((e: Error) => setError(e.message))
  }, [revision])

  useEffect(() => {
    let cancelled = false
    setError('')
    setItems(null)
    // Las transferencias no son ingresos ni gastos ni tienen categoría: se ocultan con esos filtros.
    const withTransfers = type === 'all' && categoryId === null
    Promise.all([
      transactionsApi.list({
        start: period.start,
        end: period.end,
        type: type === 'all' ? '' : type,
        category_id: categoryId ?? '',
        account_id: accountId ?? '',
      }),
      withTransfers
        ? transfersApi.list({ start: period.start, end: period.end, account_id: accountId ?? '' })
        : Promise.resolve([]),
    ])
      .then(([txs, trs]) => {
        if (cancelled) return
        setItems(txs)
        setTransfers(trs)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [period.start, period.end, type, categoryId, accountId, revision])

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase()
    if (!items || !q) return items
    return items.filter((tx) =>
      [tx.description, tx.category?.name ?? '', tx.account?.name ?? ''].some((s) => s.toLocaleLowerCase().includes(q)),
    )
  }, [items, search])

  const visibleTransfers = useMemo(() => {
    const q = search.trim().toLocaleLowerCase()
    if (!transfers || !q) return transfers ?? []
    return transfers.filter((tr) =>
      [tr.description, tr.from_account?.name ?? '', tr.to_account?.name ?? ''].some((s) =>
        s.toLocaleLowerCase().includes(q),
      ),
    )
  }, [transfers, search])

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    const byCategory = new Map<string, CategoryShare>()
    for (const tx of visible ?? []) {
      const amount = Number(tx.amount)
      if (tx.type === 'income') {
        income += amount
        continue
      }
      expense += amount
      const key = String(tx.category_id ?? 'none')
      const share = byCategory.get(key) ?? {
        key,
        name: tx.category?.name ?? t.common.noCategory,
        color: tx.category?.color ?? 'var(--muted-foreground)',
        icon: tx.category?.icon ?? '',
        total: 0,
      }
      share.total += amount
      byCategory.set(key, share)
    }
    const shares = [...byCategory.values()].sort((a, b) => b.total - a.total)
    return { income, expense, balance: income - expense, shares }
  }, [visible, t])

  const categoryOptions = type === 'all' ? categories : categories.filter((c) => c.type === type)
  const selectedCategory = categories.find((c) => c.id === categoryId)
  const periodChanged = period.preset !== 'thisMonth'
  const filtered = type !== 'all' || categoryId !== null || accountId !== null || search.trim() !== '' || periodChanged
  const panelActive = Number(periodChanged) + Number(categoryId !== null) + Number(accountId !== null)
  const selectedAccount = accounts?.find((a) => a.id === accountId)
  const periodLabel =
    period.preset === 'custom'
      ? `${formatDate(period.start)} – ${formatDate(period.end)}`
      : t.movements.presets[period.preset]

  function changeType(next: TypeFilter) {
    setType(next)
    if (next !== 'all' && selectedCategory?.type !== next) setCategoryId(null)
  }

  function resetPanel() {
    setPeriod(DEFAULT_PERIOD())
    setCategoryId(null)
    setAccountId(null)
  }

  function clearFilters() {
    resetPanel()
    setType('all')
    setSearch('')
  }

  const countLabel = (n: number) => format(n === 1 ? t.movements.countOne : t.movements.countMany, { n })

  return (
    <>
      <PageHeader title={t.movements.title}>
        <Button size="lg" className="hidden sm:inline-flex" onClick={openNew}>
          <PlusIcon />
          {t.common.new}
          <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1.5 text-[11px] font-medium opacity-80 lg:inline">
            N
          </kbd>
        </Button>
      </PageHeader>

      {/* Barra de filtros: en móvil queda fija bajo la barra superior al hacer scroll. */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 mb-4 flex flex-col gap-2.5 border-b bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-5 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
          <div className="flex gap-2 md:order-last md:ml-auto">
            <div className="relative flex-1 md:w-72 md:flex-none">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                aria-label={t.movements.searchLabel}
                placeholder={t.movements.searchPlaceholder}
                className="h-11 bg-card pr-11 pl-10 md:h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
              />
              {search && (
                <button
                  type="button"
                  aria-label={t.movements.clearSearch}
                  onClick={() => setSearch('')}
                  className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 md:size-7"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
            <MovementFilters
              period={period}
              onPeriodChange={setPeriod}
              categories={categoryOptions}
              categoryId={categoryId}
              onCategoryChange={setCategoryId}
              accounts={(accounts ?? []).filter((a) => !a.archived)}
              accountId={accountId}
              onAccountChange={setAccountId}
              activeCount={panelActive}
              onReset={resetPanel}
            />
          </div>

          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={type}
            onValueChange={(v) => v && changeType(v as TypeFilter)}
            aria-label={t.movements.filterType}
            className="w-full bg-card md:w-auto"
          >
            <ToggleGroupItem value="all" className="h-10 flex-1 px-3.5 md:h-9 md:flex-none">
              <ListIcon />
              {t.common.all}
            </ToggleGroupItem>
            <ToggleGroupItem value="income" className="h-10 flex-1 px-3.5 data-[state=on]:text-income md:h-9 md:flex-none">
              <TYPE_ICON.income />
              {t.common.incomes}
            </ToggleGroupItem>
            <ToggleGroupItem value="expense" className="h-10 flex-1 px-3.5 data-[state=on]:text-expense md:h-9 md:flex-none">
              <TYPE_ICON.expense />
              {t.common.expenses}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Móvil: acceso rápido a las categorías con un toque. En escritorio se eligen desde "Filtrar". */}
        <CategoryChips className="md:hidden" categories={categoryOptions} value={categoryId} onChange={setCategoryId} />

        {/* Filtros activos del panel, removibles */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            icon={<CalendarRangeIcon className="size-3.5" />}
            label={periodLabel}
            onRemove={periodChanged ? () => setPeriod(DEFAULT_PERIOD()) : undefined}
            removeLabel={format(t.movements.removeFilter, { name: periodLabel })}
          />
          {selectedAccount && (
            <FilterPill
              icon={<InstitutionLogo institution={selectedAccount.institution} name={selectedAccount.name} size="xs" />}
              label={selectedAccount.name}
              onRemove={() => setAccountId(null)}
              removeLabel={format(t.movements.removeFilter, { name: selectedAccount.name })}
            />
          )}
          {selectedCategory && (
            <FilterPill
              className="hidden md:inline-flex"
              icon={<CategoryAvatar color={selectedCategory.color} icon={selectedCategory.icon} size="xs" />}
              label={selectedCategory.name}
              onRemove={() => setCategoryId(null)}
              removeLabel={format(t.movements.removeFilter, { name: selectedCategory.name })}
            />
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 type-meta text-destructive">
          {error}
        </p>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {!visible ? (
            <TransactionListSkeleton rows={6} />
          ) : visible.length + visibleTransfers.length === 0 ? (
            <div className="rounded-xl border bg-card">
              {filtered ? (
                <EmptyState
                  icon={SearchIcon}
                  title={t.movements.noMatch}
                  action={
                    <Button variant="outline" size="lg" onClick={clearFilters}>
                      {t.movements.removeFilters}
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={ReceiptTextIcon}
                  title={t.movements.emptyTitle}
                  description={t.movements.emptyDescription}
                  action={
                    <Button size="lg" onClick={openNew}>
                      <PlusIcon />
                      {t.dashboard.registerMovement}
                    </Button>
                  }
                />
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 flex min-h-8 items-center justify-between gap-3 px-1">
                <p className="type-meta text-muted-foreground">
                  {countLabel(visible.length + visibleTransfers.length)}
                  <span className="xl:hidden">
                    {' · '}
                    <span className="tabular text-income">+{money(totals.income)}</span>
                    {' · '}
                    <span className="tabular">−{money(totals.expense)}</span>
                  </span>
                </p>
                {filtered && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-primary">
                    <XIcon />
                    {t.movements.clearFilters}
                  </Button>
                )}
              </div>
              <TransactionList
                items={visible}
                transfers={visibleTransfers}
                onSelect={openEdit}
                onSelectTransfer={openEditTransfer}
                accountId={accountId ?? undefined}
                showSubtotals
              />
            </>
          )}
        </div>

        {/* Panel lateral en pantallas anchas: totales y reparto de lo que se está viendo. */}
        <aside className="sticky top-6 hidden flex-col gap-3 xl:flex" aria-label={t.movements.selectionTotals}>
          <StatCard icon={TYPE_ICON.income} tone="income" label={t.common.incomes} value={money(totals.income)} loading={!visible} />
          <StatCard icon={TYPE_ICON.expense} tone="expense" label={t.common.expenses} value={money(totals.expense)} loading={!visible} />
          <StatCard
            icon={ScaleIcon}
            label={t.movements.balance}
            value={money(totals.balance)}
            loading={!visible}
            valueClassName={totals.balance < 0 ? 'text-expense' : ''}
          />

          {visible && totals.shares.length > 0 && (
            <section className="mt-3" aria-labelledby="shares-title">
              <SectionTitle id="shares-title" icon={ChartPieIcon}>
                {t.movements.byCategory}
              </SectionTitle>
              <ul className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                {totals.shares.map((s) => {
                  const pct = (s.total / totals.expense) * 100
                  return (
                    <li key={s.key}>
                      <div className="mb-1 flex items-center justify-between gap-2 type-meta">
                        <span className="flex min-w-0 items-center gap-2">
                          <CategoryAvatar color={s.color} icon={s.icon} size="xs" />
                          <span className="truncate">{s.name}</span>
                        </span>
                        <span className="tabular shrink-0 text-muted-foreground">
                          {money(s.total)} · {Math.round(pct)}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  )
}

interface FilterPillProps {
  icon: React.ReactNode
  label: string
  /** Sin esta función la píldora es solo informativa (p. ej., el período por defecto). */
  onRemove?: () => void
  removeLabel: string
  className?: string
}

function FilterPill({ icon, label, onRemove, removeLabel, className }: FilterPillProps) {
  return (
    <span
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border bg-card pr-1 pl-2.5 type-caption font-medium ${onRemove ? '' : 'pr-3 text-muted-foreground'} ${className ?? ''}`}
    >
      {icon}
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="flex size-6 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </span>
  )
}
