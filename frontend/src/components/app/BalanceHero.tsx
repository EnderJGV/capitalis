import { TrendingDownIcon, TrendingUpIcon, WalletIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useCountUp } from '@/hooks/use-count-up'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { cn } from '@/lib/utils'
import { BrandBackdrop } from './BrandBackdrop'

interface Props {
  /** Saldo acumulado de la cuenta (todo lo que entró menos todo lo que salió). */
  total: number
  /** Saldo del mes seleccionado. */
  monthBalance: number
  monthName: string
  money: (value: string | number) => string
  /** Hay montos convertidos desde otras monedas: el total es aproximado. */
  approximate?: boolean
  /** Monedas sin cotización (sus cuentas quedan fuera del total). */
  missing?: string[]
  currency: string
  className?: string
}

/** Tarjeta principal del Resumen: el saldo total de la cuenta, sobre el fondo de marca. */
export function BalanceHero({ total, monthBalance, monthName, money, approximate, missing = [], currency, className }: Props) {
  const { t } = useI18n()
  const animated = useCountUp(total)
  const up = monthBalance >= 0
  const Trend = up ? TrendingUpIcon : TrendingDownIcon

  return (
    <section
      aria-label={t.balance.total}
      className={cn(
        'relative isolate flex flex-col justify-between gap-6 overflow-hidden rounded-xl bg-sidebar p-5 text-sidebar-foreground sm:p-7',
        className,
      )}
    >
      <BrandBackdrop className="-z-10" />

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 type-meta font-medium">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-sidebar-accent-foreground">
            <WalletIcon className="size-4" />
          </span>
          {t.balance.total}
        </p>
        <span className="rounded-full bg-white/10 px-2.5 py-1 type-caption">{t.balance.wholeAccount}</span>
      </div>

      <div>
        <p
          className={cn(
            'type-display break-words sm:text-[2.75rem]',
            total < 0 ? 'text-[#F7A39E]' : 'text-sidebar-accent-foreground',
          )}
        >
          {approximate && '≈ '}
          {money(animated)}
        </p>
        {approximate && <p className="mt-1 type-caption">{format(t.balance.approximate, { currency })}</p>}
        {missing.length > 0 && (
          <p className="mt-1 type-caption text-[#F7A39E]">{format(t.balance.missing, { currencies: missing.join(', ') })}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 type-meta">
          <span
            className={cn(
              'tabular inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold',
              up ? 'bg-[#5FBF97]/20 text-[#9FE3C4]' : 'bg-[#F0716A]/20 text-[#F7A39E]',
            )}
          >
            <Trend className="size-4" />
            {up ? '+' : '−'}
            {money(Math.abs(monthBalance))}
          </span>
          <span>{format(t.balance.inMonth, { month: monthName })}</span>
        </div>
      </div>
    </section>
  )
}

export function BalanceHeroSkeleton({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <div
      className={cn('flex flex-col justify-between gap-6 rounded-xl bg-sidebar p-5 sm:p-7', className)}
      aria-busy="true"
      aria-label={t.balance.loading}
    >
      <Skeleton className="h-8 w-32 bg-white/10" />
      <div>
        <Skeleton className="h-11 w-60 bg-white/10" />
        <Skeleton className="mt-3 h-7 w-44 rounded-full bg-white/10" />
      </div>
    </div>
  )
}
