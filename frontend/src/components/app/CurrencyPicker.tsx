import { useState } from 'react'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CURRENCIES, type Currency } from '@/domain/types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'

interface Props {
  id?: string
  value: Currency
  onChange: (currency: Currency) => void
  className?: string
}

function currencySymbol(currency: Currency, locale: string): string {
  return (
    new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value ?? currency
  )
}

/**
 * Selector de moneda: en móvil abre un panel inferior con opciones grandes y fáciles de tocar;
 * en escritorio, una lista desplegable bajo el campo.
 */
export function CurrencyPicker({ id, value, onChange, className }: Props) {
  const { t, locale } = useI18n()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [open, setOpen] = useState(false)

  const choose = (c: Currency) => {
    onChange(c)
    setOpen(false)
  }

  const trigger = (
    <button
      id={id}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={isDesktop ? undefined : () => setOpen(true)}
      className={cn(
        'flex h-11 w-full items-center gap-3 rounded-lg border border-input bg-transparent pr-3 pl-2 text-left transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30',
        className,
      )}
    >
      <SymbolBadge symbol={currencySymbol(value, locale)} />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-semibold">{value}</span>
        <span className="text-muted-foreground"> · {t.currencies[value]}</span>
      </span>
      <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )

  const options = (
    <ul role="listbox" aria-label={t.settings.currency} className="flex flex-col gap-0.5">
      {CURRENCIES.map((c) => (
        <li key={c} role="option" aria-selected={c === value}>
          <button
            type="button"
            onClick={() => choose(c)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40',
              isDesktop ? 'h-11' : 'h-14',
              c === value && 'bg-accent',
            )}
          >
            <SymbolBadge symbol={currencySymbol(c, locale)} large={!isDesktop} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{t.currencies[c]}</span>
              <span className="block type-caption text-muted-foreground">{c}</span>
            </span>
            {c === value && <CheckIcon className="size-5 shrink-0 text-primary" />}
          </button>
        </li>
      ))}
    </ul>
  )

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="start" className="max-h-80 w-(--radix-popover-trigger-width) min-w-72 overflow-y-auto p-1.5">
          {options}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <>
      {trigger}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-xl p-0">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>{t.settings.currency}</SheetTitle>
            <SheetDescription>{t.settings.currencyDescription}</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">{options}</div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function SymbolBadge({ symbol, large = false }: { symbol: string; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'tabular flex shrink-0 items-center justify-center rounded-md bg-accent font-bold text-accent-foreground',
        large ? 'h-10 min-w-10 px-1.5 type-meta' : 'h-8 min-w-8 px-1 type-caption',
      )}
    >
      {symbol}
    </span>
  )
}
