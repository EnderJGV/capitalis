import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { ArrowRightIcon, ChartColumnIcon, HistoryIcon, PlusIcon, ReceiptTextIcon } from 'lucide-react'
import { BalanceHero, BalanceHeroSkeleton } from '@/components/app/BalanceHero'
import { EmptyState } from '@/components/app/EmptyState'
import { MonthStrip, MonthStripSkeleton } from '@/components/app/MonthStrip'
import { MonthSwitcher } from '@/components/app/MonthSwitcher'
import { PageHeader } from '@/components/app/PageHeader'
import { SectionTitle, StatCard } from '@/components/app/StatCard'
import { TransactionList, TransactionListSkeleton } from '@/components/app/TransactionList'
import { useTransactionEditor } from '@/components/app/TransactionEditorProvider'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import type { Summary, Transaction } from '@/domain/types'
import { useMonthParam } from '@/hooks/use-month-param'
import { useI18n } from '@/i18n/I18nProvider'
import { TYPE_ICON } from '@/lib/icons'
import { dashboardApi, transactionsApi } from '@/services/api'
import { capitalize, currentMonth, monthLabel, shortMonth, useMoney } from '@/utils/format'

const RECENT_COUNT = 6

interface Data {
  summary: Summary
  recent: Transaction[]
}

export default function Dashboard() {
  const { t } = useI18n()
  const money = useMoney()
  const chartConfig = {
    income: { label: t.common.incomes, color: 'var(--income)' },
    expense: { label: t.common.expenses, color: 'var(--expense)' },
  } satisfies ChartConfig
  const { openNew, openEdit, revision } = useTransactionEditor()
  const [month, setMonth] = useMonthParam()
  const [data, setData] = useState<Data | null>(null)
  const [loadedMonth, setLoadedMonth] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setError('')
    Promise.all([dashboardApi.summary(month), transactionsApi.list({ month })])
      .then(([summary, txs]) => {
        if (cancelled) return
        setData({ summary, recent: txs.slice(0, RECENT_COUNT) })
        setLoadedMonth(month)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [month, revision])

  const loading = !data || loadedMonth !== month
  const summary = data?.summary

  return (
    <>
      <PageHeader title={t.dashboard.title}>
        <MonthSwitcher value={month} onChange={setMonth} />
        <Button size="lg" className="hidden sm:inline-flex" onClick={openNew}>
          <PlusIcon />
          {t.common.new}
          <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1.5 text-[11px] font-medium opacity-80 lg:inline">
            N
          </kbd>
        </Button>
      </PageHeader>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 type-meta text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Tarjeta principal: el saldo total de la cuenta */}
        {loading || !summary ? (
          <BalanceHeroSkeleton className="min-h-52 xl:col-span-2" />
        ) : (
          <BalanceHero
            className="min-h-52 xl:col-span-2"
            total={Number(summary.total_balance)}
            monthBalance={Number(summary.balance)}
            monthName={monthLabel(month)}
            money={money}
          />
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-1 xl:grid-rows-2">
          <StatCard
            icon={TYPE_ICON.income}
            tone="income"
            label={t.dashboard.incomeOfMonth}
            value={summary && money(summary.income)}
            loading={loading}
          />
          <StatCard
            icon={TYPE_ICON.expense}
            tone="expense"
            label={t.dashboard.expenseOfMonth}
            value={summary && money(summary.expense)}
            loading={loading}
          />
        </div>

        {loading || !summary ? (
          <MonthStripSkeleton className="xl:col-span-3" />
        ) : (
          <MonthStrip
            className="xl:col-span-3"
            income={Number(summary.income)}
            expense={Number(summary.expense)}
            categories={summary.expenses_by_category}
            money={money}
            animationKey={`${month}-${revision}`}
          />
        )}

        <section aria-labelledby="recent-title" className="flex min-w-0 flex-col xl:col-span-2">
          <SectionTitle
            id="recent-title"
            icon={HistoryIcon}
            action={
              data &&
              data.recent.length > 0 && (
                <Button variant="link" asChild className="px-0">
                  <Link to={month === currentMonth() ? '/movimientos' : `/movimientos?mes=${month}`}>
                    {t.dashboard.seeAll}
                    <ArrowRightIcon />
                  </Link>
                </Button>
              )
            }
          >
            {t.dashboard.recent}
          </SectionTitle>
          {loading ? (
            <TransactionListSkeleton rows={4} className="flex-1" />
          ) : data.recent.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border bg-card">
              <EmptyState
                icon={ReceiptTextIcon}
                title={t.dashboard.emptyTitle}
                description={t.dashboard.emptyDescription}
                action={
                  <Button size="lg" onClick={openNew}>
                    <PlusIcon />
                    {t.dashboard.registerMovement}
                  </Button>
                }
              />
            </div>
          ) : (
            <TransactionList items={data.recent} onSelect={openEdit} className="flex-1" />
          )}
        </section>

        <section aria-labelledby="months-title" className="flex min-w-0 flex-col">
          <SectionTitle id="months-title" icon={ChartColumnIcon}>
            {t.dashboard.lastMonths}
          </SectionTitle>
          <div className="flex flex-1 flex-col rounded-xl border bg-card p-4">
            {loading || !summary ? (
              <Skeleton className="min-h-60 w-full flex-1" />
            ) : (
              <>
                <ChartContainer config={chartConfig} className="aspect-auto min-h-60 w-full flex-1">
                  <BarChart
                    accessibilityLayer
                    data={summary.last_months.map((m) => ({
                      label: capitalize(shortMonth(m.month).replace('.', '')),
                      title: capitalize(monthLabel(m.month)),
                      income: Number(m.income),
                      expense: Number(m.expense),
                    }))}
                    barGap={2}
                    margin={{ left: 0, right: 0, top: 4 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip
                      cursor={{ fill: 'var(--muted)' }}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.title}
                          formatter={(value, name) => (
                            <div className="flex w-full items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <span
                                  className="size-2.5 rounded-[2px]"
                                  style={{ background: `var(--color-${String(name)})` }}
                                />
                                {chartConfig[name as keyof typeof chartConfig]?.label}
                              </span>
                              <span className="tabular font-semibold text-foreground">{money(Number(value))}</span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
                <div className="mt-3 flex gap-5 type-meta text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[2px] bg-income" aria-hidden /> {t.common.incomes}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[2px] bg-expense" aria-hidden /> {t.common.expenses}
                  </span>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
