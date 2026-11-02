import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeftIcon,
  CheckIcon,
  GlobeIcon,
  LandmarkIcon,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/context/AuthContext'
import {
  ACCOUNT_KINDS,
  type Account,
  type AccountKind,
  type CatalogInstitution,
  type Currency,
  type InstitutionKind,
} from '@/domain/types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { countryByCode, useCatalogCountries } from '@/lib/catalog'
import { CASH_ID, suggestedAccountKind } from '@/lib/institutions'
import { cn } from '@/lib/utils'
import { accountsApi, catalogApi } from '@/services/api'
import { countryName } from '@/utils/format'
import { AmountInput, amountToInput, parseAmountOrZero } from './AmountInput'
import { CountryPicker } from './CountryPicker'
import { CurrencyPicker } from './CurrencyPicker'
import { CountryFlag } from './FlagIcon'
import { InstitutionLogo } from './InstitutionLogo'
import { KindPicker, type KindChoice } from './KindPicker'

export type AccountEditorResult = 'created' | 'updated' | 'deleted'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Cuenta a editar; sin ella, se crea una nueva empezando por elegir la institución. */
  initial?: Account
  onDone: (result: AccountEditorResult, account?: Account) => void
}

/** Institución elegida: del catálogo, "cash" (efectivo) o ninguna (otra institución con nombre libre). */
interface Choice {
  institution: string | null
  /** Datos para mostrarla; no existen para "otra institución" ni "efectivo". */
  info?: { name: string; kind?: InstitutionKind; domain: string | null; color: string | null; country?: string }
}

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
  const [choice, setChoice] = useState<Choice | null>(
    initial ? { institution: initial.institution, info: initial.institution_info ?? undefined } : null,
  )
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

const PAGE = 60

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

function InstitutionStep({ onPick }: { onPick: (choice: Choice) => void }) {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const countries = useCatalogCountries()
  const [country, setCountry] = useState<string>('all')
  const [kind, setKind] = useState<KindChoice>('')
  const [query, setQuery] = useState('')
  const q = useDebounced(query.trim(), 250)
  const [items, setItems] = useState<CatalogInstitution[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Por defecto se busca en todo el mundo; el país de la moneda principal queda sugerido en el selector.
  const suggested = countries
    .filter((c) => c.currency === user?.currency && c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((c) => c.code)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    catalogApi
      .institutions({
        country: country === 'all' ? undefined : country,
        q: q || undefined,
        kind,
        prefer: suggested[0],
        offset: 0,
        limit: PAGE,
      })
      .then((page) => {
        if (cancelled) return
        setItems(page.items)
        setTotal(page.total)
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, q, kind, suggested[0]])

  async function showMore() {
    const page = await catalogApi.institutions({
      country: country === 'all' ? undefined : country,
      q: q || undefined,
      kind,
      prefer: suggested[0],
      offset: items.length,
      limit: PAGE,
    })
    setItems((prev) => [...prev, ...page.items])
  }

  const pick = (i: CatalogInstitution) =>
    onPick({ institution: i.id, info: { name: i.name, kind: i.kind, domain: i.domain, color: i.color, country: i.country } })

  return (
    <>
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle>{t.accountEditor.pickTitle}</SheetTitle>
        <SheetDescription>{t.accountEditor.pickDescription}</SheetDescription>
      </SheetHeader>

      {/* Filtros: la búsqueda ocupa todo el ancho; país y tipo debajo, lado a lado */}
      <div className="flex shrink-0 flex-col gap-2 border-b px-5 py-3">
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
        <div className="grid grid-cols-2 gap-2">
          <CountryPicker
            countries={countries}
            value={country}
            onChange={setCountry}
            suggested={suggested}
            className="w-full"
          />
          <KindPicker value={kind} onChange={setKind} className="w-full" />
        </div>
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

        {!loading && items.length > 0 && (
          <p className="mb-2 flex items-center gap-2 px-0.5 type-caption font-semibold text-muted-foreground">
            {country === 'all' ? <GlobeIcon className="size-3.5" /> : <CountryFlag code={country} />}
            {country === 'all' ? t.accountEditor.worldwide : countryName(country, country, locale)}
            <span className="tabular rounded-full bg-muted px-1.5 font-medium">{total}</span>
          </p>
        )}

        {error ? (
          <p role="alert" className="py-8 text-center type-meta text-destructive">
            {t.accountEditor.loadError}
          </p>
        ) : loading ? (
          <div className="flex justify-center py-10 text-muted-foreground" aria-busy="true">
            <Loader2Icon className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="type-meta text-muted-foreground">{t.accountEditor.noResults}</p>
            {country !== 'all' && q && (
              <Button variant="outline" size="sm" onClick={() => setCountry('all')}>
                <GlobeIcon />
                {t.accountEditor.worldwide}
              </Button>
            )}
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {items.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    className="flex h-full w-full flex-col items-center gap-2 rounded-xl border bg-card px-2 py-3.5 text-center transition-colors outline-none hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/40"
                  >
                    <InstitutionLogo institution={i.id} info={i} name={i.name} size="lg" />
                    <span className="line-clamp-2 type-caption leading-tight font-semibold">{i.name}</span>
                    {country === 'all' && (
                      <span className="flex items-center gap-1 type-caption text-muted-foreground">
                        <CountryFlag code={i.country} className="h-3 w-[18px]" />
                        {i.country}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            {items.length < total && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" size="lg" onClick={showMore}>
                  {t.accountEditor.showMore} ({total - items.length})
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
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
  const { locale } = useI18n()
  const info = choice.info
  const isCash = choice.institution === CASH_ID
  const institutionLabel = info?.name ?? (isCash ? t.accountEditor.cash : t.accountEditor.other)

  const defaultKind: AccountKind = isCash ? 'cash' : suggestedAccountKind(info?.kind)
  const [name, setName] = useState(initial?.name ?? (info?.name || (isCash ? t.accountEditor.cash : '')))
  const [kind, setKind] = useState<AccountKind>(initial?.kind ?? defaultKind)
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? user?.currency ?? 'USD')
  const currencyTouched = useRef(false)

  // La moneda del país de la institución se propone sola (Venezuela → VES), salvo que el usuario ya haya elegido.
  useEffect(() => {
    if (initial || !info?.country) return
    countryByCode(info.country).then((c) => {
      if (c?.currency && !currencyTouched.current) setCurrency(c.currency)
    })
  }, [initial, info?.country])
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
          <InstitutionLogo institution={choice.institution} info={info} name={name || institutionLabel} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{institutionLabel}</p>
            {info?.country && (
              <p className="flex items-center gap-1.5 type-caption text-muted-foreground">
                <CountryFlag code={info.country} className="h-3 w-[18px]" />
                {countryName(info.country, info.country, locale)}
              </p>
            )}
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
          <CurrencyPicker
            id="account-currency"
            value={currency}
            suggested={[user?.currency ?? 'USD']}
            onChange={(c) => {
              currencyTouched.current = true
              setCurrency(c)
            }}
          />
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
