import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowDownToLineIcon,
  ArrowLeftIcon,
  ArrowUpFromLineIcon,
  CheckCircle2Icon,
  HandCoinsIcon,
  HistoryIcon,
  PencilIcon,
  PlusIcon,
  TargetIcon,
} from 'lucide-react'
import { BrandBackdrop } from '@/components/app/BrandBackdrop'
import { EmptyState } from '@/components/app/EmptyState'
import { ProgressRing } from '@/components/app/ProgressRing'
import { SectionTitle } from '@/components/app/StatCard'
import { useQuickActions } from '@/components/app/TransactionEditorProvider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { GoalContribution, GoalDetail as GoalDetailData } from '@/domain/types'
import { useCountUp } from '@/hooks/use-count-up'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { PACE_TONE } from '@/lib/goals'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/http'
import { goalsApi } from '@/services/api'
import { capitalize, formatDate, monthLabel, useMoney } from '@/utils/format'

export default function GoalDetail() {
  const { t } = useI18n()
  const money = useMoney()
  const navigate = useNavigate()
  const goalId = Number(useParams().id)
  const { openGoal, openContribution, openExpense, revision } = useQuickActions()
  const [goal, setGoal] = useState<GoalDetailData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    goalsApi
      .get(goalId)
      .then((g) => !cancelled && setGoal(g))
      .catch((e: Error) => {
        if (cancelled) return
        // El objetivo ya no existe (p. ej., se acaba de eliminar): de vuelta a la lista.
        if (e instanceof ApiError && e.status === 404) navigate('/objetivos', { replace: true })
        else setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [goalId, revision, navigate])

  const animated = useCountUp(Number(goal?.saved ?? 0))
  const byMonth = useMemo(() => {
    const groups = new Map<string, GoalContribution[]>()
    for (const c of goal?.contributions ?? []) groups.set(c.date.slice(0, 7), [...(groups.get(c.date.slice(0, 7)) ?? []), c])
    return [...groups.entries()]
  }, [goal])

  async function changeStatus(status: 'active' | 'achieved' | 'archived', message: string) {
    if (!goal) return
    try {
      await goalsApi.setStatus(goal.id, status)
      toast.success(message)
      setGoal(await goalsApi.get(goal.id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.goalEditor.saveError)
    }
  }

  const ghost = 'text-sidebar-accent-foreground hover:bg-white/10 hover:text-sidebar-accent-foreground'
  const open = goal && (goal.status === 'active' || goal.status === 'completed')

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3 text-muted-foreground">
        <Link to="/objetivos">
          <ArrowLeftIcon />
          {t.goals.detail.back}
        </Link>
      </Button>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 type-meta text-destructive">
          {error}
        </p>
      )}

      {!goal ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          <section className="relative isolate overflow-hidden rounded-xl bg-sidebar p-5 text-sidebar-foreground sm:p-7">
            <BrandBackdrop className="-z-10" />
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <ProgressRing percent={goal.percent} color={goal.color} size={132} stroke={10} className="mx-auto sm:mx-0">
                <span className="flex flex-col items-center leading-none">
                  <span className="text-4xl" aria-hidden>
                    {goal.icon || <TargetIcon className="size-8" />}
                  </span>
                  <span className="tabular mt-1.5 type-meta font-semibold text-sidebar-accent-foreground">{goal.percent} %</span>
                </span>
              </ProgressRing>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="type-heading truncate text-sidebar-accent-foreground">{goal.name}</h1>
                  {(goal.status === 'completed' || goal.status === 'achieved') && (
                    <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 type-caption font-semibold text-sidebar-accent-foreground">
                      <CheckCircle2Icon className="size-3.5" />
                      {t.goals.status[goal.status]}
                    </span>
                  )}
                  {goal.status === 'archived' && <span className="rounded-full bg-white/15 px-2 py-0.5 type-caption">{t.goals.archived}</span>}
                </div>
                <p className="truncate type-caption">
                  {t.goals.kinds[goal.kind]}
                  {goal.note && ` · ${goal.note}`}
                </p>
                <p className="mt-3 type-meta">{t.goals.detail.saved}</p>
                <p className="type-display text-sidebar-accent-foreground">{money(animated, goal.currency)}</p>
                <p className="tabular type-meta">
                  {format(t.goals.of, { saved: money(goal.saved, goal.currency), target: money(goal.target_amount, goal.currency) })}
                  {Number(goal.over) > 0 && ` · ${format(t.goals.over, { amount: money(goal.over, goal.currency) })}`}
                </p>
              </div>
            </div>

            {goal.status === 'completed' && <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 type-meta">{t.goals.detail.reachedHint}</p>}

            <div className="mt-5 flex flex-wrap gap-2">
              {open && (
                <Button size="lg" className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" onClick={() => openContribution({ goal })}>
                  <PlusIcon />
                  {t.goals.detail.contribute}
                </Button>
              )}
              {open && Number(goal.saved) > 0 && (
                <Button size="lg" variant="ghost" className={ghost} onClick={() => openContribution({ goal, withdraw: true })}>
                  <ArrowUpFromLineIcon />
                  {t.goals.detail.withdraw}
                </Button>
              )}
              {goal.status === 'completed' && (
                <Button size="lg" variant="ghost" className={ghost} onClick={() => changeStatus('achieved', t.goals.achievedToast)}>
                  <CheckCircle2Icon />
                  {t.goals.detail.markAchieved}
                </Button>
              )}
              {goal.status === 'achieved' && (
                <Button
                  size="lg"
                  className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                  onClick={() => openExpense({ amount: goal.saved, description: goal.name })}
                >
                  <HandCoinsIcon />
                  {t.goals.detail.registerExpense}
                </Button>
              )}
              <Button size="lg" variant="ghost" className={ghost} onClick={() => openGoal(goal)}>
                <PencilIcon />
                {t.goals.detail.edit}
              </Button>
              {goal.status === 'archived' || goal.status === 'achieved' ? (
                <Button size="lg" variant="ghost" className={ghost} onClick={() => changeStatus('active', t.goals.reactivatedToast)}>
                  <ArchiveRestoreIcon />
                  {t.goals.detail.reactivate}
                </Button>
              ) : (
                <Button size="lg" variant="ghost" className={ghost} onClick={() => changeStatus('archived', t.goals.archivedToast)}>
                  <ArchiveIcon />
                  {t.goals.detail.archive}
                </Button>
              )}
            </div>
            {goal.status === 'achieved' && <p className="mt-3 type-caption">{t.goals.detail.expenseHint}</p>}
          </section>

          {/* Datos clave */}
          <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Fact label={t.goals.detail.remaining} value={money(goal.remaining, goal.currency)} />
            <Fact
              label={t.goals.detail.perMonth}
              value={goal.monthly_needed ? money(goal.monthly_needed, goal.currency) : '—'}
              hint={goal.status === 'active' && !goal.target_date ? t.goals.detail.noPerMonth : undefined}
            />
            <Fact
              label={t.goals.detail.deadline}
              value={goal.target_date ? formatDate(goal.target_date) : t.goals.noDate}
              badge={goal.pace ? <span className={cn('rounded-full px-2 py-0.5 type-caption font-semibold', PACE_TONE[goal.pace])}>{t.goals.pace[goal.pace]}</span> : undefined}
            />
            <Fact
              label={t.goals.detail.projection}
              value={
                goal.status === 'achieved' && goal.completed_on
                  ? format(t.goals.detail.achievedOn, { date: formatDate(goal.completed_on) })
                  : goal.status === 'completed' && goal.completed_on
                    ? format(t.goals.detail.reachedOn, { date: formatDate(goal.completed_on) })
                    : goal.projected_date
                      ? format(t.goals.detail.projectionAt, { month: capitalize(monthLabel(goal.projected_date.slice(0, 7), 'short')) })
                      : t.goals.detail.noProjection
              }
              small
            />
          </dl>

          <section className="mt-6" aria-labelledby="contributions-title">
            <SectionTitle id="contributions-title" icon={HistoryIcon}>
              {t.goals.detail.contributions}
            </SectionTitle>
            {goal.contributions.length === 0 ? (
              <div className="rounded-xl border bg-card">
                <EmptyState icon={TargetIcon} title={t.goals.detail.noContributions} />
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border bg-card">
                {byMonth.map(([month, items]) => (
                  <section key={month} aria-label={capitalize(monthLabel(month))} className="border-b last:border-b-0">
                    <h3 className="border-b bg-muted/50 px-4 py-1.5 type-caption font-semibold text-muted-foreground">{capitalize(monthLabel(month))}</h3>
                    <ul className="divide-y">
                      {items.map((c) => {
                        const out = Number(c.amount) < 0
                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => openContribution({ goal, initial: c })}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted"
                            >
                              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', out ? 'bg-expense/12 text-expense' : 'bg-income/12 text-income')} aria-hidden>
                                {out ? <ArrowUpFromLineIcon className="size-4" /> : <ArrowDownToLineIcon className="size-4" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{c.note || (out ? t.goals.detail.withdrawal : t.goals.detail.contribution)}</span>
                                <span className="block truncate type-meta text-muted-foreground">{formatDate(c.date)}</span>
                              </span>
                              <span className={cn('tabular shrink-0 font-semibold', out ? 'text-foreground' : 'text-income')}>
                                {out ? '−' : '+'}
                                {money(Math.abs(Number(c.amount)), goal.currency)}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}

function Fact({ label, value, hint, badge, small }: { label: string; value: string; hint?: string; badge?: React.ReactNode; small?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-3.5">
      <dt className="flex items-center justify-between gap-2 type-caption text-muted-foreground">
        <span className="truncate">{label}</span>
        {badge}
      </dt>
      <dd className={cn('tabular mt-1 truncate font-semibold', small ? 'type-meta' : 'type-figure')}>{value}</dd>
      {hint && <p className="mt-0.5 truncate type-caption text-muted-foreground">{hint}</p>}
    </div>
  )
}
