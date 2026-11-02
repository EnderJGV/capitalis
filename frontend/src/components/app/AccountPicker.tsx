import { useState } from 'react'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Account } from '@/domain/types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { useMoney } from '@/utils/format'
import { InstitutionLogo } from './InstitutionLogo'

interface Props {
  id?: string
  accounts: Account[]
  value: number | null
  onChange: (accountId: number) => void
  /** Cuenta que no se puede elegir (p. ej., el origen al elegir el destino de una transferencia). */
  exclude?: number | null
  /** Título del panel en móvil. */
  title?: string
  className?: string
}

/** Selector de cuenta con logo, nombre y saldo: lista bajo el campo en escritorio, panel inferior en móvil. */
export function AccountPicker({ id, accounts, value, onChange, exclude, title, className }: Props) {
  const { t } = useI18n()
  const money = useMoney()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [open, setOpen] = useState(false)
  const selected = accounts.find((a) => a.id === value)
  const options = accounts.filter((a) => a.id !== exclude && !a.archived)

  const choose = (accountId: number) => {
    onChange(accountId)
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
        'flex h-12 w-full items-center gap-3 rounded-lg border border-input bg-transparent pr-3 pl-2 text-left transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30',
        className,
      )}
    >
      {selected ? (
        <>
          <InstitutionLogo institution={selected.institution} name={selected.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate type-meta font-semibold">{selected.name}</span>
            <span className="tabular block truncate type-caption text-muted-foreground">
              {money(selected.balance, selected.currency)}
            </span>
          </span>
        </>
      ) : (
        <span className="flex-1 px-1 type-meta text-muted-foreground">{t.transfer.chooseAccount}</span>
      )}
      <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )

  const list = (
    <ul role="listbox" aria-label={title ?? t.editor.account} className="flex flex-col gap-0.5">
      {options.map((a) => (
        <li key={a.id} role="option" aria-selected={a.id === value}>
          <button
            type="button"
            onClick={() => choose(a.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40',
              isDesktop ? 'h-12' : 'h-14',
              a.id === value && 'bg-accent',
            )}
          >
            <InstitutionLogo institution={a.institution} name={a.name} size={isDesktop ? 'sm' : 'md'} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{a.name}</span>
              <span className="block truncate type-caption text-muted-foreground">{t.accounts.kinds[a.kind]}</span>
            </span>
            <span className="tabular shrink-0 type-meta font-semibold">{money(a.balance, a.currency)}</span>
            {a.id === value && <CheckIcon className="size-4 shrink-0 text-primary" />}
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
          {list}
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
            <SheetTitle>{title ?? t.editor.account}</SheetTitle>
            <SheetDescription className="sr-only">{title ?? t.editor.account}</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">{list}</div>
        </SheetContent>
      </Sheet>
    </>
  )
}
