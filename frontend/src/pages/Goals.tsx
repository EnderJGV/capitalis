import { useEffect, useMemo, useState } from 'react'
import { PlusIcon, TargetIcon } from 'lucide-react'
import { BrandBackdrop } from '@/components/app/BrandBackdrop'
import { EmptyState } from '@/components/app/EmptyState'
import { GoalCard } from '@/components/app/GoalCard'
import { PageHeader } from '@/components/app/PageHeader'
import { useQuickActions } from '@/components/app/TransactionEditorProvider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import type { Goal, GoalsOverview } from '@/domain/types'
import { useCountUp } from '@/hooks/use-count-up'
import { useI18n } from '@/i18n/I18nProvider'
import { dashboardApi, goalsApi } from '@/services/api'
import { currentMonth, useMoney } from '@/utils/format'

export default function Goals() {
  const { t } = useI18n()
  const { user } = useAuth()
  const money = useMoney()
  const { openGoal, revision } = useQuickActions()
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [overview, setOverview] = useState<GoalsOverview | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([goalsApi.list(), dashboardApi.summary(currentMonth())])
      .then(([list, summary]) => {
        if (cancelled) return
        setGoals(list)
        setOverview(summary.goals)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [revision])

  const sections = useMemo(() => {
    const all = goals ?? []
    return [
      { key: 'active', title: t.goals.sectionActive, items: all.filter((g) => g.status === 'active') },
      { key: 'completed', title: t.goals.sectionCompleted, items: all.filter((g) => g.status === 'completed') },
      { key: 'achieved', title: t.goals.sectionAchieved, items: all.filter((g) => g.status === 'achieved') },
      ...(showArchived ? [{ key: 'archived', title: t.goals.archived, items: all.filter((g) => g.status === 'archived') }] : []),
    ].filter((s) => s.items.length > 0)
  }, [goals, showArchived, t])
  const hasArchived = (goals ?? []).some((g) => g.status === 'archived')
  const reserved = useCountUp(Number(overview?.reserved ?? 0))

  return (
    <>
      <PageHeader title={t.goals.title}>
        <Button size="lg" onClick={() => openGoal()}>
          <PlusIcon />
          {t.goals.new}
        </Button>
      </PageHeader>
      <p className="-mt-3 mb-5 type-meta text-muted-foreground sm:-mt-4">{t.goals.subtitle}</p>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 type-meta text-destructive">
          {error}
        </p>
      )}

      {!goals ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label={t.goals.loading}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={TargetIcon}
            title={t.goals.emptyTitle}
            description={t.goals.emptyDescription}
            action={
              <Button size="lg" onClick={() => openGoal()}>
                <PlusIcon />
                {t.goals.addFirst}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {overview && (
            <section className="relative isolate overflow-hidden rounded-xl bg-sidebar p-5 text-sidebar-foreground sm:p-6">
              <BrandBackdrop className="-z-10" />
              <p className="type-meta font-medium">{t.goals.reserved}</p>
              <p className="mt-2 type-display text-sidebar-accent-foreground">{money(reserved, user?.currency)}</p>
              <p className="tabular mt-1 type-meta">
                {t.goals.free}: <span className="font-semibold text-sidebar-accent-foreground">{money(overview.free, user?.currency)}</span>
              </p>
            </section>
          )}

          {sections.map((s) => (
            <section key={s.key} aria-labelledby={`goals-${s.key}`}>
              <h2 id={`goals-${s.key}`} className="mb-3 px-1 type-heading">
                {s.title}
                <span className="tabular ml-2 type-meta font-normal text-muted-foreground">{s.items.length}</span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {s.items.map((g) => (
                  <GoalCard key={g.id} goal={g} onClick={openGoal} />
                ))}
              </div>
            </section>
          ))}

          {hasArchived && (
            <label className="flex w-fit cursor-pointer items-center gap-2 px-1 type-meta text-muted-foreground">
              <input
                type="checkbox"
                className="size-4 accent-[var(--primary)]"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              {t.goals.showArchived}
            </label>
          )}
        </div>
      )}
    </>
  )
}
