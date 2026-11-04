import { Link } from 'react-router-dom'
import { ArrowRightIcon, PlusIcon, TargetIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GoalsOverview } from '@/domain/types'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { PACE_TONE } from '@/lib/goals'
import { cn } from '@/lib/utils'
import { useMoney } from '@/utils/format'
import { ProgressRing } from './ProgressRing'
import { SectionTitle } from './StatCard'

/** "Tus objetivos" en el Resumen: los 3 activos más cercanos con su progreso y cuánto aportar por mes. */
export function DashboardGoals({ goals, onNew }: { goals: GoalsOverview; onNew: () => void }) {
  const { t } = useI18n()
  const money = useMoney()

  return (
    <section aria-labelledby="goals-title" className="min-w-0 xl:col-span-3">
      <SectionTitle
        id="goals-title"
        icon={TargetIcon}
        action={
          <Button variant="link" asChild className="px-0">
            <Link to="/objetivos">
              {t.dashboard.seeGoals}
              <ArrowRightIcon />
            </Link>
          </Button>
        }
      >
        {t.dashboard.yourGoals}
      </SectionTitle>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {goals.top.map((g) => (
          <li key={g.id} className="min-w-0">
            <Link
              to={`/objetivos/${g.id}`}
              className="flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3.5 transition-colors outline-none hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <ProgressRing percent={g.percent} color={g.color} size={48} stroke={5}>
                <span className="text-lg leading-none" aria-hidden>
                  {g.icon || <TargetIcon className="size-4" style={{ color: g.color }} />}
                </span>
              </ProgressRing>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{g.name}</span>
                <span className="tabular block truncate type-caption text-muted-foreground">
                  {format(t.goals.of, { saved: money(g.saved, g.currency), target: money(g.target_amount, g.currency) })}
                </span>
                {g.monthly_needed && (
                  <span className="tabular block truncate type-caption font-medium text-primary">
                    {format(t.goals.perMonth, { amount: money(g.monthly_needed, g.currency) })}
                  </span>
                )}
              </span>
              {g.pace && (
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 type-caption font-semibold', PACE_TONE[g.pace])}>
                  {t.goals.pace[g.pace]}
                </span>
              )}
            </Link>
          </li>
        ))}
        {goals.top.length < 3 && (
          <li className="min-w-0">
            <button
              type="button"
              onClick={onNew}
              className="flex h-full min-h-[4.5rem] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed type-meta font-semibold text-muted-foreground transition-colors outline-none hover:border-primary/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <PlusIcon className="size-4" />
              {t.goals.new}
            </button>
          </li>
        )}
      </ul>
    </section>
  )
}
