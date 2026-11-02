import { useMemo, useState } from 'react'
import { CheckIcon, ChevronDownIcon, GlobeIcon, SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { CatalogCountry } from '@/domain/types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { countryName } from '@/utils/format'
import { CountryFlag } from './FlagIcon'

/** "all" = instituciones de todo el mundo. */
export type CountryChoice = string

interface Props {
  countries: CatalogCountry[]
  value: CountryChoice
  onChange: (country: CountryChoice) => void
  /** Códigos que se muestran primero (p. ej., el país de la moneda principal). */
  suggested?: string[]
  className?: string
}

function plain(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Selector de país con buscador: ~210 países con bandera y cantidad de instituciones.
 * En móvil se abre en un panel inferior; en escritorio, en una lista bajo el botón.
 */
export function CountryPicker({ countries, value, onChange, suggested = [], className }: Props) {
  const { t, locale } = useI18n()
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const named = useMemo(
    () =>
      countries
        .map((c) => ({ ...c, label: countryName(c.code, c.name, locale) }))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [countries, locale],
  )
  const selected = named.find((c) => c.code === value)
  const q = plain(query.trim())
  const matches = q ? named.filter((c) => plain(c.label).includes(q) || plain(c.name).includes(q) || c.code.toLowerCase() === q) : named
  const top = q ? [] : suggested.map((code) => matches.find((c) => c.code === code)).filter((c) => !!c)
  const rest = matches.filter((c) => !top.some((s) => s.code === c.code))

  const choose = (code: CountryChoice) => {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  const label = value === 'all' ? t.accountEditor.worldwide : (selected?.label ?? value)

  const trigger = (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={`${t.accountEditor.country}: ${label}`}
      onClick={isDesktop ? undefined : () => setOpen(true)}
      className={cn(
        'flex h-11 min-w-0 items-center gap-2 rounded-lg border bg-card px-3 text-left transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-10',
        className,
      )}
    >
      {value === 'all' ? <GlobeIcon className="size-4 shrink-0 text-muted-foreground" /> : <CountryFlag code={value} />}
      <span className="min-w-0 flex-1 truncate type-meta font-medium">{label}</span>
      <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )

  const row = (code: string, name: string, count: number, flag: React.ReactNode) => (
    <li key={code} role="option" aria-selected={value === code}>
      <button
        type="button"
        onClick={() => choose(code)}
        className={cn(
          'flex h-11 w-full items-center gap-3 rounded-lg px-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40',
          value === code && 'bg-accent',
        )}
      >
        {flag}
        <span className="min-w-0 flex-1 truncate type-meta font-medium">{name}</span>
        <span className="tabular type-caption text-muted-foreground">{count}</span>
        {value === code && <CheckIcon className="size-4 shrink-0 text-primary" />}
      </button>
    </li>
  )

  const total = countries.reduce((sum, c) => sum + c.count, 0)
  const content = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative shrink-0 p-2">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus={isDesktop}
          aria-label={t.accountEditor.countrySearch}
          placeholder={t.accountEditor.countrySearch}
          className="h-10 pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <ul role="listbox" aria-label={t.accountEditor.country} className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {!q &&
          row(
            'all',
            t.accountEditor.worldwide,
            total,
            <span className="flex h-4 w-6 items-center justify-center rounded-[3px] bg-muted">
              <GlobeIcon className="size-3" />
            </span>,
          )}
        {top.length > 0 && (
          <li className="px-2.5 pt-3 pb-1 type-caption font-semibold text-muted-foreground">{t.accountEditor.suggestedCountries}</li>
        )}
        {top.map((c) => row(c.code, c.label, c.count, <CountryFlag code={c.code} />))}
        {top.length > 0 && rest.length > 0 && (
          <li className="px-2.5 pt-3 pb-1 type-caption font-semibold text-muted-foreground">{t.accountEditor.allCountriesList}</li>
        )}
        {rest.map((c) => row(c.code, c.label, c.count, <CountryFlag code={c.code} />))}
        {matches.length === 0 && <li className="px-3 py-6 text-center type-meta text-muted-foreground">{t.accountEditor.noCountry}</li>}
      </ul>
    </div>
  )

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="end"
          className="flex max-h-(--radix-popover-content-available-height) w-80 flex-col overflow-hidden p-0"
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
            <SheetTitle>{t.accountEditor.country}</SheetTitle>
            <SheetDescription className="sr-only">{t.accountEditor.countrySearch}</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">{content}</div>
        </SheetContent>
      </Sheet>
    </>
  )
}
