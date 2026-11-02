import { useMemo, useState } from 'react'
import { CheckIcon, ChevronDownIcon, SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Currency } from '@/domain/types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/i18n/I18nProvider'
import { useCatalogCurrencies } from '@/lib/catalog'
import { cn } from '@/lib/utils'
import { currencyName, currencySymbol } from '@/utils/format'

interface Props {
  id?: string
  value: Currency
  onChange: (currency: Currency) => void
  /** Monedas que se muestran primero (p. ej., la principal del usuario y las de sus cuentas). */
  suggested?: Currency[]
  className?: string
}

function plain(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Selector de moneda con todas las monedas del mundo y buscador (por código o por nombre, en tu idioma).
 * En móvil abre un panel inferior con opciones grandes; en escritorio, una lista bajo el campo.
 */
export function CurrencyPicker({ id, value, onChange, suggested = [], className }: Props) {
  const { t, locale } = useI18n()
  const all = useCatalogCurrencies()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const choose = (c: Currency) => {
    onChange(c)
    setOpen(false)
    setQuery('')
  }

  const { top, rest } = useMemo(() => {
    const q = plain(query.trim())
    const list = (all.length ? all : [value]).filter((c) => !q || plain(c).includes(q) || plain(currencyName(c, locale)).includes(q))
    const pinned = q ? [] : [...new Set([value, ...suggested])].filter((c) => list.includes(c))
    return { top: pinned, rest: list.filter((c) => !pinned.includes(c)).sort((a, b) => a.localeCompare(b)) }
  }, [all, query, value, suggested, locale])

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
        <span className="text-muted-foreground"> · {currencyName(value, locale)}</span>
      </span>
      <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )

  const row = (c: Currency) => (
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
          <span className="block truncate font-medium">{currencyName(c, locale)}</span>
          <span className="block type-caption text-muted-foreground">{c}</span>
        </span>
        {c === value && <CheckIcon className="size-5 shrink-0 text-primary" />}
      </button>
    </li>
  )

  const content = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative shrink-0 p-2">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus={isDesktop}
          aria-label={t.settings.currency}
          placeholder={t.currencyPicker.search}
          className="h-10 pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <ul role="listbox" aria-label={t.settings.currency} className="min-h-0 flex-1 overflow-y-auto px-1 pb-1">
        {top.length > 0 && <li className="px-2 pt-1 pb-1 type-caption font-semibold text-muted-foreground">{t.currencyPicker.suggested}</li>}
        {top.map(row)}
        {top.length > 0 && rest.length > 0 && <li className="px-2 pt-3 pb-1 type-caption font-semibold text-muted-foreground">{t.currencyPicker.all}</li>}
        {rest.map(row)}
        {top.length + rest.length === 0 && <li className="px-3 py-6 text-center type-meta text-muted-foreground">{t.currencyPicker.none}</li>}
      </ul>
    </div>
  )

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="start"
          className="flex max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) min-w-80 flex-col overflow-hidden p-0"
        >
          <div className="flex max-h-96 min-h-0 flex-col">{content}</div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <>
      {trigger}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="gap-0 rounded-t-xl p-0 data-[side=bottom]:h-[85dvh]">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>{t.settings.currency}</SheetTitle>
            <SheetDescription>{t.settings.currencyDescription}</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">{content}</div>
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
