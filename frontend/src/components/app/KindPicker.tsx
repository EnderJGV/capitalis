import { useState } from 'react'
import {
  BitcoinIcon,
  ChartCandlestickIcon,
  CheckIcon,
  ChevronDownIcon,
  HandshakeIcon,
  LandmarkIcon,
  LayoutGridIcon,
  SmartphoneIcon,
  type LucideIcon,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { InstitutionKind } from '@/domain/types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'

/** '' = todos los tipos. */
export type KindChoice = InstitutionKind | ''

const OPTIONS: { value: KindChoice; icon: LucideIcon }[] = [
  { value: '', icon: LayoutGridIcon },
  { value: 'bank', icon: LandmarkIcon },
  { value: 'digital', icon: SmartphoneIcon },
  { value: 'broker', icon: ChartCandlestickIcon },
  { value: 'cooperative', icon: HandshakeIcon },
  { value: 'exchange', icon: BitcoinIcon },
]

interface Props {
  value: KindChoice
  onChange: (kind: KindChoice) => void
  className?: string
}

/** Selector del tipo de institución, con ícono y una línea que explica cada tipo. */
export function KindPicker({ value, onChange, className }: Props) {
  const { t } = useI18n()
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const [open, setOpen] = useState(false)
  const label = (k: KindChoice) => (k ? t.accountEditor.types[k] : t.accountEditor.typeAll)
  const hint = (k: KindChoice) => t.accountEditor.typeHints[k || 'all']
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0]
  const active = value !== ''

  const choose = (k: KindChoice) => {
    onChange(k)
    setOpen(false)
  }

  const trigger = (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={`${t.accountEditor.typeFilter}: ${label(value)}`}
      onClick={isDesktop ? undefined : () => setOpen(true)}
      className={cn(
        'flex h-11 min-w-0 items-center gap-2 rounded-lg border px-3 text-left transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-10',
        active ? 'border-primary/50 bg-primary/10 text-foreground' : 'bg-card hover:bg-muted',
        className,
      )}
    >
      <current.icon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
      <span className="min-w-0 flex-1 truncate type-meta font-medium">{label(value)}</span>
      <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )

  const list = (
    <ul role="listbox" aria-label={t.accountEditor.typeFilter} className="flex flex-col gap-0.5 p-1.5">
      {OPTIONS.map((o) => {
        const selected = o.value === value
        return (
          <li key={o.value || 'all'} role="option" aria-selected={selected}>
            <button
              type="button"
              onClick={() => choose(o.value)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40',
                isDesktop ? 'py-2' : 'py-3',
                selected && 'bg-accent',
              )}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg',
                  selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                <o.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block type-meta font-semibold">{label(o.value)}</span>
                <span className="block truncate type-caption text-muted-foreground">{hint(o.value)}</span>
              </span>
              {selected && <CheckIcon className="size-4 shrink-0 text-primary" />}
            </button>
          </li>
        )
      })}
    </ul>
  )

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          {list}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <>
      {trigger}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="gap-0 rounded-t-xl p-0">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>{t.accountEditor.typeFilter}</SheetTitle>
            <SheetDescription className="sr-only">{t.accountEditor.typeFilter}</SheetDescription>
          </SheetHeader>
          <div className="pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">{list}</div>
        </SheetContent>
      </Sheet>
    </>
  )
}
