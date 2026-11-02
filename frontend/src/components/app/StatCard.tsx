import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const TONES = {
  income: 'bg-income/12 text-income',
  expense: 'bg-expense/12 text-expense',
  neutral: 'bg-accent text-accent-foreground',
} as const

interface Props {
  icon: LucideIcon
  label: string
  value?: string
  tone?: keyof typeof TONES
  loading?: boolean
  /** Clases extra para la cifra (p. ej., rojo si el saldo es negativo). */
  valueClassName?: string
  className?: string
}

export function StatCard({ icon: Icon, label, value, tone = 'neutral', loading, valueClassName, className }: Props) {
  return (
    <div className={cn('flex h-full min-w-0 items-center gap-3 rounded-xl border bg-card px-3 py-3 sm:px-4', className)}>
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full sm:size-10', TONES[tone])}>
        <Icon className="size-5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate type-meta text-muted-foreground">{label}</p>
        {loading || value === undefined ? (
          <Skeleton className="mt-1 h-6 w-28" />
        ) : (
          <p className={cn('type-figure truncate', valueClassName)}>{value}</p>
        )}
      </div>
    </div>
  )
}

interface SectionTitleProps {
  id?: string
  icon: LucideIcon
  children: ReactNode
  action?: ReactNode
}

export function SectionTitle({ id, icon: Icon, children, action }: SectionTitleProps) {
  return (
    <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
      <h2 id={id} className="type-heading flex items-center gap-2">
        <Icon className="size-5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
        {children}
      </h2>
      {action}
    </div>
  )
}
