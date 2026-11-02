import { useEffect, useState } from 'react'
import { PiggyBankIcon } from 'lucide-react'
import { useCountUp } from '@/hooks/use-count-up'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { cn } from '@/lib/utils'

interface DemoItem {
  name: string
  icon: string
  color: string
  value: number
}

interface DemoMonth {
  /** Mes (0-11) de 2026; su nombre se escribe en el idioma del usuario. */
  month: number
  income: number
  items: DemoItem[]
}

/** Datos ilustrativos para la vista previa; no representan a ningún usuario. */
const DEMO: DemoMonth[] = [
  {
    month: 8,
    income: 8400,
    items: [
      { name: 'Vivienda', icon: '🏠', color: '#7E62C6', value: 2650 },
      { name: 'Alimentación', icon: '🛒', color: '#D0583F', value: 1420 },
      { name: 'Transporte', icon: '🚌', color: '#3F74C4', value: 610 },
      { name: 'Ocio', icon: '🎉', color: '#C0508F', value: 480 },
    ],
  },
  {
    month: 9,
    income: 8400,
    items: [
      { name: 'Vivienda', icon: '🏠', color: '#7E62C6', value: 2650 },
      { name: 'Alimentación', icon: '🛒', color: '#D0583F', value: 1680 },
      { name: 'Transporte', icon: '🚌', color: '#3F74C4', value: 540 },
      { name: 'Ocio', icon: '🎉', color: '#C0508F', value: 1120 },
    ],
  },
  {
    month: 10,
    income: 9100,
    items: [
      { name: 'Vivienda', icon: '🏠', color: '#7E62C6', value: 2650 },
      { name: 'Alimentación', icon: '🛒', color: '#D0583F', value: 1310 },
      { name: 'Transporte', icon: '🚌', color: '#3F74C4', value: 700 },
      { name: 'Ocio', icon: '🎉', color: '#C0508F', value: 390 },
    ],
  },
]

const CYCLE_MS = 4000

function useDemoMonth(): DemoMonth {
  const [index, setIndex] = useState(DEMO.length - 1)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % DEMO.length), CYCLE_MS)
    return () => window.clearInterval(id)
  }, [])
  return DEMO[index]
}

interface Props {
  /** "full": tarjeta con leyenda y movimientos flotantes. "compact": solo cifra y franja (móvil). */
  variant?: 'full' | 'compact'
  className?: string
}

/** Vista previa animada de la franja del mes: va cambiando de mes y la cifra cuenta hasta su valor. */
export function AuthShowcase({ variant = 'full', className }: Props) {
  const { t, locale } = useI18n()
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' })
  const month = useDemoMonth()
  const monthName = new Date(2026, month.month, 1).toLocaleDateString(locale, { month: 'long' })
  const label = monthName.charAt(0).toUpperCase() + monthName.slice(1)
  // Nombres de categoría de ejemplo en el idioma actual (mismo orden que DEMO.items).
  const itemName = (i: number) => t.auth.demoCategories[i] ?? ''
  const spent = month.items.reduce((sum, i) => sum + i.value, 0)
  const remaining = useCountUp(month.income - spent)

  return (
    <div className={cn('relative', className)} aria-hidden>
      <div
        className={cn(
          'relative rounded-2xl border border-white/10 bg-white/[0.07] text-sidebar-foreground shadow-2xl shadow-black/20 backdrop-blur-md',
          variant === 'full' ? 'p-6' : 'p-4',
        )}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 type-meta">
            <PiggyBankIcon className="size-4" />
            {t.auth.demoLeft}
          </span>
          <span key={month.month} className="animate-fade-up rounded-full bg-white/10 px-2.5 py-0.5 type-caption motion-reduce:animate-none">
            {label}
          </span>
        </div>
        <p className={cn('mt-1 text-sidebar-accent-foreground', variant === 'full' ? 'type-display' : 'type-figure')}>
          {money.format(remaining)}
        </p>
        <p className="type-caption">{format(t.auth.demoOf, { income: money.format(month.income) })}</p>

        <div className={cn('flex gap-0.5 overflow-hidden rounded-full', variant === 'full' ? 'mt-5 h-3.5' : 'mt-3 h-2.5')}>
          {month.items.map((item) => (
            <div
              key={item.icon}
              className="h-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
              style={{ width: `${(item.value / month.income) * 100}%`, background: item.color }}
            />
          ))}
          <div className="h-full flex-1 bg-white/20" />
        </div>

        {variant === 'full' && (
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
            {month.items.map((item, i) => (
              <li key={item.icon} className="flex items-center gap-2 type-meta">
                <span className="text-base leading-none">{item.icon}</span>
                <span className="flex-1 truncate">{itemName(i)}</span>
                <span className="tabular type-caption opacity-80">{Math.round((item.value / month.income) * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {variant === 'full' && (
        <>
          <FloatingChip
            className="-top-6 -right-6 [animation-delay:-2s]"
            icon="🛒"
            title={t.auth.demoGroceries}
            amount={`−${money.format(182.4)}`}
          />
          <FloatingChip
            className="-bottom-7 -left-8"
            icon="💼"
            title={t.auth.demoSalary}
            amount={`+${money.format(month.income)}`}
            positive
          />
        </>
      )}
    </div>
  )
}

interface ChipProps {
  icon: string
  title: string
  amount: string
  positive?: boolean
  className?: string
}

function FloatingChip({ icon, title, amount, positive, className }: ChipProps) {
  return (
    <div
      className={cn(
        'absolute flex animate-float items-center gap-3 rounded-xl bg-card py-2.5 pr-4 pl-2.5 text-card-foreground shadow-xl shadow-black/25 motion-reduce:animate-none',
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-muted text-lg leading-none">{icon}</span>
      <span>
        <span className="block type-caption text-muted-foreground">{title}</span>
        <span className={cn('tabular block type-meta font-semibold', positive ? 'text-income' : 'text-foreground')}>
          {amount}
        </span>
      </span>
    </div>
  )
}
