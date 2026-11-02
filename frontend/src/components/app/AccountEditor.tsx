import { useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  GlobeIcon,
  LandmarkIcon,
  LayersIcon,
  Loader2Icon,
  SearchIcon,
  Trash2Icon,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/context/AuthContext'
import { ACCOUNT_KINDS, type Account, type AccountKind, type Currency } from '@/domain/types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import {
  CASH_ID,
  INSTITUTIONS,
  INSTITUTION_COUNTRIES,
  countryForCurrency,
  findInstitution,
  type InstitutionCountry,
} from '@/lib/institutions'
import { cn } from '@/lib/utils'
import { accountsApi } from '@/services/api'
import { AmountInput, amountToInput, parseAmountOrZero } from './AmountInput'
import { CurrencyPicker } from './CurrencyPicker'
import { CountryFlag } from './FlagIcon'
import { InstitutionLogo } from './InstitutionLogo'

export type AccountEditorResult = 'created' | 'updated' | 'deleted'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Cuenta a editar; sin ella, se crea una nueva empezando por elegir la institución. */
  initial?: Account
  onDone: (result: AccountEditorResult, account?: Account) => void
}

/** Institución elegida: id del catálogo, "cash" o null (otra institución con nombre libre). */
type Choice = { institution: string | null }

export function AccountEditor({ open, onOpenChange, initial, onDone }: Props) {
  const isDesktop = useMediaQuery('(min-width: 640px)')
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className="gap-0 overflow-hidden data-[side=bottom]:max-h-[92dvh] data-[side=bottom]:rounded-t-xl data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
      >
        {open && <EditorBody key={initial?.id ?? 'new'} initial={initial} onDone={onDone} onCancel={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function EditorBody({ initial, onDone, onCancel }: { initial?: Account; onDone: Props['onDone']; onCancel: () => void }) {
  const [choice, setChoice] = useState<Choice | null>(initial ? { institution: initial.institution } : null)
  if (!choice) return <InstitutionStep onPick={setChoice} />
  return (
    <DetailsStep
      initial={initial}
      choice={choice}
      onChangeInstitution={initial ? undefined : () => setChoice(null)}
      onDone={onDone}
      onCancel={onCancel}
    />
  )
}

/* ---------- Paso 1: elegir institución ---------- */

function InstitutionStep({ onPick }: { onPick: (choice: Choice) => void }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const [country, setCountry] = useState<InstitutionCountry | 'all'>(
    () => (user && countryForCurrency(user.currency)) || 'all',
  )
  const [query, setQuery] = useState('')
  const q = query.trim().toLocaleLowerCase()

  const results = useMemo(
    () =>
      INSTITUTIONS.filter(
        (i) => (q ? i.name.toLocaleLowerCase().includes(q) : country === 'all' || i.country === country),
      ),
    [q, country],
  )

  return (
    <>
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle>{t.accountEditor.pickTitle}</SheetTitle>
        <SheetDescription>{t.accountEditor.pickDescription}</SheetDescription>
      </SheetHeader>

      {/* Búsqueda + país en una sola fila */}
      <div className="flex shrink-0 gap-2 border-b px-5 py-3">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            aria-label={t.accountEditor.search}
            placeholder={t.accountEditor.search}
            className="h-11 pl-9 sm:h-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <CountrySelect value={country} onChange={setCountry} disabled={!!q} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {/* Opciones especiales siempre a mano */}
        {!q && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <SpecialOption onClick={() => onPick({ institution: CASH_ID })}>
              <InstitutionLogo institution={CASH_ID} name={t.accountEditor.cash} size="sm" />
              {t.accountEditor.cash}
            </SpecialOption>
            <SpecialOption onClick={() => onPick({ institution: null })}>
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <LandmarkIcon className="size-4" />
              </span>
              {t.accountEditor.other}
            </SpecialOption>
          </div>
        )}

        {results.length > 0 && (
          <p className="mb-2 flex items-center gap-2 px-0.5 type-caption font-semibold text-muted-foreground">
            {!q && country !== 'all' && <CountryMark code={country} />}
            {q ? `“${query.trim()}”` : country === 'all' ? t.accountEditor.allCountries : t.accountEditor.countries[country]}
            <span className="tabular rounded-full bg-muted px-1.5 font-medium">{results.length}</span>
          </p>
        )}
        {results.length === 0 ? (
          <p className="py-8 text-center type-meta text-muted-foreground">{t.accountEditor.noResults}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => onPick({ institution: i.id })}
                  className="flex h-full w-full flex-col items-center gap-2 rounded-xl border bg-card px-2 py-3.5 text-center transition-colors outline-none hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  <InstitutionLogo institution={i.id} name={i.name} size="lg" />
                  <span className="line-clamp-2 type-caption font-semibold leading-tight">{i.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function CountryMark({ code }: { code: InstitutionCountry }) {
  return code === 'INTL' ? (
    <span className="flex h-4 w-6 items-center justify-center rounded-[3px] bg-accent text-accent-foreground">
      <GlobeIcon className="size-3" />
    </span>
  ) : (
    <CountryFlag code={code} />
  )
}

const COUNTS = INSTITUTIONS.reduce<Record<string, number>>((acc, i) => {
  acc[i.country] = (acc[i.country] ?? 0) + 1
  return acc
}, {})

/** Desplegable de país: bandera, nombre y cuántas instituciones tiene. */
function CountrySelect({
  value,
  onChange,
  disabled,
}: {
  value: InstitutionCountry | 'all'
  onChange: (country: InstitutionCountry | 'all') => void
  disabled?: boolean
}) {
  const { t } = useI18n()
  const label = value === 'all' ? t.accountEditor.allCountries : t.accountEditor.countries[value]
  const item = (code: InstitutionCountry | 'all', name: string, count: number) => (
    <DropdownMenuItem key={code} onSelect={() => onChange(code)} className="h-10 gap-2.5">
      {code === 'all' ? (
        <span className="flex h-4 w-6 items-center justify-center rounded-[3px] bg-muted">
          <LayersIcon className="size-3" />
        </span>
      ) : (
        <CountryMark code={code} />
      )}
      <span className="flex-1">{name}</span>
      <span className="tabular type-caption text-muted-foreground">{count}</span>
      {value === code && <CheckIcon className="text-primary" />}
    </DropdownMenuItem>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          aria-label={`${t.accountEditor.country}: ${label}`}
          className="h-11 max-w-[45%] shrink-0 gap-2 px-3 sm:h-10 sm:max-w-none"
        >
          {value === 'all' ? <LayersIcon className="text-muted-foreground" /> : <CountryMark code={value} />}
          <span className="truncate type-meta font-medium">{label}</span>
          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-60 overflow-y-auto p-1.5">
        {item('all', t.accountEditor.allCountries, INSTITUTIONS.length)}
        <DropdownMenuSeparator />
        {INSTITUTION_COUNTRIES.map((c) => item(c, t.accountEditor.countries[c], COUNTS[c] ?? 0))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SpecialOption({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 items-center gap-3 rounded-xl border border-dashed bg-card px-3 text-left type-meta font-semibold transition-colors outline-none hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      {children}
    </button>
  )
}

/* ---------- Paso 2: datos de la cuenta ---------- */

interface DetailsProps {
  initial?: Account
  choice: Choice
  onChangeInstitution?: () => void
  onDone: Props['onDone']
  onCancel: () => void
}

function DetailsStep({ initial, choice, onChangeInstitution, onDone, onCancel }: DetailsProps) {
  const { t } = useI18n()
  const { user } = useAuth()
  const info = findInstitution(choice.institution)
  const isCash = choice.institution === CASH_ID
  const institutionLabel = info?.name ?? (isCash ? t.accountEditor.cash : t.accountEditor.other)

  const defaultKind: AccountKind = isCash ? 'cash' : info?.kind === 'digital' ? 'digital' : 'checking'
  const [name, setName] = useState(initial?.name ?? (info?.name || (isCash ? t.accountEditor.cash : '')))
  const [kind, setKind] = useState<AccountKind>(initial?.kind ?? defaultKind)
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? info?.currency ?? user?.currency ?? 'BRL')
  const [balance, setBalance] = useState(initial ? amountToInput(initial.initial_balance) : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const initialBalance = parseAmountOrZero(balance)
    if (!name.trim() || initialBalance === null) {
      setError(!name.trim() ? t.accountEditor.name : t.editor.amountError)
      return
    }
    setError('')
    setSaving(true)
    const data = {
      name: name.trim(),
      currency,
      kind,
      institution: choice.institution,
      initial_balance: initialBalance,
      archived: initial?.archived ?? false,
    }
    try {
      const saved = initial ? await accountsApi.update(initial.id, data) : await accountsApi.create(data)
      onDone(initial ? 'updated' : 'created', saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.accountEditor.saveError)
      setSaving(false)
    }
  }

  async function remove() {
    if (!initial) return
    try {
      await accountsApi.remove(initial.id)
      onDone('deleted')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.accountEditor.saveError)
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle>{initial ? t.accountEditor.editTitle : t.accountEditor.newTitle}</SheetTitle>
        <SheetDescription>{t.accountEditor.detailsDescription}</SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        {/* Institución elegida */}
        <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
          <InstitutionLogo institution={choice.institution} name={name || institutionLabel} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{institutionLabel}</p>
            {info && <p className="type-caption text-muted-foreground">{t.accountEditor.countries[info.country]}</p>}
          </div>
          {onChangeInstitution && (
            <Button type="button" variant="ghost" size="sm" onClick={onChangeInstitution}>
              <ArrowLeftIcon />
              {t.accountEditor.change}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="account-name">{t.accountEditor.name}</Label>
          <Input
            id="account-name"
            className="h-11 sm:h-10"
            maxLength={60}
            required
            placeholder={t.accountEditor.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t.accountEditor.kind}</Label>
          <div role="radiogroup" aria-label={t.accountEditor.kind} className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {ACCOUNT_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  'flex h-10 items-center justify-center gap-1.5 rounded-lg border px-2 type-caption font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                  kind === k ? 'border-primary bg-primary/10 text-foreground' : 'bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {kind === k && <CheckIcon className="size-3.5 text-primary" />}
                {t.accounts.kinds[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="account-currency">{t.accountEditor.currency}</Label>
          <CurrencyPicker id="account-currency" value={currency} onChange={setCurrency} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="account-balance">{t.accountEditor.initialBalance}</Label>
          <AmountInput id="account-balance" currency={currency} value={balance} onChange={setBalance} />
          <p className="type-caption text-muted-foreground">{t.accountEditor.initialBalanceHint}</p>
        </div>

        {error && (
          <p role="alert" className="type-meta text-destructive">
            {error}
          </p>
        )}
      </div>

      <SheetFooter className="shrink-0 flex-row flex-wrap items-center border-t bg-popover px-5 py-4">
        {initial && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="lg" className="mr-auto text-destructive hover:text-destructive">
                <Trash2Icon />
                {t.common.delete}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>{format(t.accounts.deleteTitle, { name: initial.name })}</AlertDialogTitle>
                <AlertDialogDescription>{t.accounts.deleteDescription}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={remove}>
                  {t.common.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button type="button" variant="ghost" size="lg" className={initial ? '' : 'ml-auto'} onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
          {saving ? t.common.saving : t.common.save}
        </Button>
      </SheetFooter>
    </form>
  )
}
