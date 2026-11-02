import { useState } from 'react'
import { CalendarRangeIcon, CheckIcon, LayersIcon, SearchIcon, SlidersHorizontalIcon, TagIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Category } from '@/domain/types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/i18n/I18nProvider'
import { PERIOD_PRESETS, presetPeriod, type Period } from '@/lib/periods'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/format'
import { CategoryAvatar } from './CategoryAvatar'

interface Props {
  period: Period
  onPeriodChange: (period: Period) => void
  /** Categorías disponibles (ya filtradas por tipo). */
  categories: Category[]
  categoryId: number | null
  onCategoryChange: (id: number | null) => void
  /** Cuántos filtros del panel están activos (para el contador del botón). */
  activeCount: number
  onReset: () => void
}

/** Botón "Filtrar": en escritorio abre un popover; en móvil, un panel inferior. Mismo contenido. */
export function MovementFilters(props: Props) {
  const { t } = useI18n()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [open, setOpen] = useState(false)

  const trigger = (onClick?: () => void) => (
    <Button
      variant="outline"
      size="lg"
      className="relative h-11 shrink-0 bg-card md:h-9"
      aria-label={t.movements.filter}
      onClick={onClick}
    >
      <SlidersHorizontalIcon />
      <span className="hidden sm:inline">{t.movements.filter}</span>
      {props.activeCount > 0 && (
        <span className="flex size-5 items-center justify-center rounded-full bg-primary type-caption font-bold text-primary-foreground">
          {props.activeCount}
        </span>
      )}
    </Button>
  )

  const panel = <FiltersPanel {...props} onDone={() => setOpen(false)} />

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger()}</PopoverTrigger>
        <PopoverContent align="end" className="w-[22rem] p-0">
          {panel}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <>
      {trigger(() => setOpen(true))}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[88dvh] gap-0 overflow-hidden rounded-t-xl p-0">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>{t.movements.filters}</SheetTitle>
            <SheetDescription className="sr-only">{t.movements.filters}</SheetDescription>
          </SheetHeader>
          {panel}
        </SheetContent>
      </Sheet>
    </>
  )
}

function FiltersPanel({
  period,
  onPeriodChange,
  categories,
  categoryId,
  onCategoryChange,
  onReset,
  onDone,
}: Props & { onDone: () => void }) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const q = query.trim().toLocaleLowerCase()
  const visibleCategories = q ? categories.filter((c) => c.name.toLocaleLowerCase().includes(q)) : categories

  return (
    <div className="flex max-h-[inherit] min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        {/* Período */}
        <section className="flex flex-col gap-2.5">
          <h3 className="flex items-center gap-2 type-meta font-semibold">
            <CalendarRangeIcon className="size-4 text-muted-foreground" />
            {t.movements.period}
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {PERIOD_PRESETS.map((preset) => (
              <OptionButton key={preset} selected={period.preset === preset} onClick={() => onPeriodChange(presetPeriod(preset))}>
                {t.movements.presets[preset]}
              </OptionButton>
            ))}
            <OptionButton
              className="col-span-2"
              selected={period.preset === 'custom'}
              onClick={() => onPeriodChange({ ...period, preset: 'custom' })}
            >
              {t.movements.presets.custom}
              {period.preset === 'custom' && (
                <span className="ml-auto type-caption font-normal text-muted-foreground">
                  {formatDate(period.start)} – {formatDate(period.end)}
                </span>
              )}
            </OptionButton>
          </div>
          {period.preset === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="period-from" className="type-caption">
                  {t.movements.from}
                </Label>
                <Input
                  id="period-from"
                  type="date"
                  className="h-10 md:h-9"
                  value={period.start}
                  max={period.end}
                  onChange={(e) => e.target.value && onPeriodChange({ ...period, start: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="period-to" className="type-caption">
                  {t.movements.to}
                </Label>
                <Input
                  id="period-to"
                  type="date"
                  className="h-10 md:h-9"
                  value={period.end}
                  min={period.start}
                  onChange={(e) => e.target.value && onPeriodChange({ ...period, end: e.target.value })}
                />
              </div>
            </div>
          )}
        </section>

        {/* Categoría */}
        <section className="flex flex-col gap-2.5">
          <h3 className="flex items-center gap-2 type-meta font-semibold">
            <TagIcon className="size-4 text-muted-foreground" />
            {t.movements.category}
          </h3>
          {categories.length > 6 && (
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={t.movements.searchCategory}
                placeholder={t.movements.searchCategory}
                className="h-10 pl-9 md:h-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
          <ul role="listbox" aria-label={t.movements.category} className="flex flex-col gap-0.5">
            {!q && (
              <CategoryOption selected={categoryId === null} onClick={() => onCategoryChange(null)}>
                <span className="flex size-5 items-center justify-center rounded-full bg-muted">
                  <LayersIcon className="size-3" />
                </span>
                {t.movements.allCategories}
              </CategoryOption>
            )}
            {visibleCategories.map((c) => (
              <CategoryOption key={c.id} selected={categoryId === c.id} onClick={() => onCategoryChange(c.id)}>
                <CategoryAvatar color={c.color} icon={c.icon} size="xs" />
                <span className="truncate">{c.name}</span>
              </CategoryOption>
            ))}
            {visibleCategories.length === 0 && (
              <li className="px-3 py-2 type-meta text-muted-foreground">{t.movements.noCategoryMatch}</li>
            )}
          </ul>
        </section>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:pb-3">
        <Button variant="ghost" size="lg" onClick={onReset}>
          {t.movements.reset}
        </Button>
        <Button size="lg" onClick={onDone}>
          {t.movements.showResults}
        </Button>
      </div>
    </div>
  )
}

function OptionButton({
  selected,
  onClick,
  className,
  children,
}: {
  selected: boolean
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex h-10 items-center gap-2 rounded-lg border px-3 text-left type-meta transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 md:h-9',
        selected
          ? 'border-primary bg-primary/10 font-semibold text-foreground'
          : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

function CategoryOption({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <li role="option" aria-selected={selected}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left type-meta transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 md:h-9',
          selected && 'bg-accent font-semibold',
        )}
      >
        {children}
        {selected && <CheckIcon className="ml-auto size-4 shrink-0 text-primary" />}
      </button>
    </li>
  )
}
