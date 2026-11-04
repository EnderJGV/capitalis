import { CheckCircle2Icon, TargetIcon } from 'lucide-react'
import type { Goal } from '@/domain/types'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { PACE_TONE } from '@/lib/goals'
import { cn } from '@/lib/utils'
import { capitalize, monthLabel, useMoney } from '@/utils/format'
import { ProgressRing } from './ProgressRing'

interface Props {
  goal: Goal
  onClick: (goal: Goal) => void
  className?: string
}

/** Tarjeta de objetivo: emoji en un anillo de progreso, ahorrado vs meta, ritmo y cuánto aportar por mes. */
export function GoalCard({ goal, onClick, className }: Props) {
  const { t } = useI18n()
  const money = useMoney()
  const done = goal.status === 'completed' || goal.status === 'achieved'
  const dim = goal.status === 'archived' || goal.status === 'achieved'

  return (
    <button
      type="button"
      onClick={() => onClick(goal)}
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 text-left transition-colors outline-none hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-ring/40',
        dim && 'opacity-70',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <ProgressRing percent={goal.percent} color={goal.color} size={56} stroke={5}>
          <span className="text-xl leading-none" aria-hidden>
            {goal.icon || <TargetIcon className="size-5" style={{ color: goal.color }} />}
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{goal.name}</p>
          <p className="truncate type-caption text-muted-foreground">
            {t.goals.kinds[goal.kind]} ·{' '}
            {goal.target_date
              ? format(t.goals.until, { date: capitalize(monthLabel(goal.target_date.slice(0, 7), 'short')) })
              : t.goals.noDate}
          </p>
        </div>
        {done ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-income/12 px-2 py-0.5 type-caption font-semibold text-income">
            <CheckCircle2Icon className="size-3.5" />
            {t.goals.status[goal.status]}
          </span>
        ) : goal.status === 'archived' ? (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 type-caption text-muted-foreground">{t.goals.archived}</span>
        ) : (
          goal.pace && (
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 type-caption font-semibold', PACE_TONE[goal.pace])}>
              {t.goals.pace[goal.pace]}
            </span>
          )
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="tabular truncate type-figure">{money(goal.saved, goal.currency)}</p>
          <p className="tabular shrink-0 type-caption font-semibold text-muted-foreground">{goal.percent} %</p>
        </div>
        <p className="tabular truncate type-caption text-muted-foreground">
          {format(t.goals.of, { saved: money(goal.saved, goal.currency), target: money(goal.target_amount, goal.currency) })}
          {Number(goal.over) > 0 && ` · ${format(t.goals.over, { amount: money(goal.over, goal.currency) })}`}
        </p>
        {goal.status === 'active' && goal.monthly_needed && (
          <p className="tabular truncate type-meta font-medium text-primary">
            {format(t.goals.perMonth, { amount: money(goal.monthly_needed, goal.currency) })}
          </p>
        )}
      </div>
    </button>
  )
}
