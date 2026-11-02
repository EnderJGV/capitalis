import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/I18nProvider'
import { getLocale } from '@/i18n/runtime'
import { addMonths, capitalize, currentMonth, monthLabel } from '@/utils/format'

interface Props {
  value: string
  onChange: (month: string) => void
}

/** ‹ noviembre de 2026 ›, con un selector de mes al hacer clic en el nombre. */
export function MonthSwitcher({ value, onChange }: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(() => Number(value.slice(0, 4)))
  const today = currentMonth()

  return (
    <div className="flex w-full items-center rounded-lg border bg-card sm:w-auto">
      <Button variant="ghost" size="icon-lg" aria-label={t.month.previous} onClick={() => onChange(addMonths(value, -1))}>
        <ChevronLeftIcon />
      </Button>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) setYear(Number(value.slice(0, 4)))
          setOpen(next)
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="ghost" size="lg" className="tabular min-w-40 flex-1 font-semibold" aria-label={t.month.choose}>
            {capitalize(monthLabel(value))}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="center">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" size="icon-sm" aria-label={t.month.previousYear} onClick={() => setYear((y) => y - 1)}>
              <ChevronLeftIcon />
            </Button>
            <span className="tabular type-meta font-semibold">{year}</span>
            <Button variant="ghost" size="icon-sm" aria-label={t.month.nextYear} onClick={() => setYear((y) => y + 1)}>
              <ChevronRightIcon />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, i) => {
              const m = `${year}-${String(i + 1).padStart(2, '0')}`
              const label = new Date(year, i, 1).toLocaleDateString(getLocale(), { month: 'short' }).replace('.', '')
              return (
                <Button
                  key={m}
                  variant={m === value ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('capitalize', m === today && m !== value && 'text-primary underline underline-offset-4')}
                  onClick={() => {
                    onChange(m)
                    setOpen(false)
                  }}
                >
                  {label}
                </Button>
              )
            })}
          </div>
          {value !== today && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => {
                onChange(today)
                setOpen(false)
              }}
            >
              {t.month.goToCurrent}
            </Button>
          )}
        </PopoverContent>
      </Popover>
      <Button variant="ghost" size="icon-lg" aria-label={t.month.next} onClick={() => onChange(addMonths(value, 1))}>
        <ChevronRightIcon />
      </Button>
    </div>
  )
}
