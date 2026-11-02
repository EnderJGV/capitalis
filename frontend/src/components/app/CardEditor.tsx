import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeftIcon, CalendarClockIcon, CheckIcon, Loader2Icon, ShieldCheckIcon, Trash2Icon } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/context/AuthContext'
import { CARD_NETWORKS, type Account, type CardNetwork, type Currency } from '@/domain/types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { bestPurchaseDay } from '@/lib/cards'
import { countryByCode } from '@/lib/catalog'
import { cn } from '@/lib/utils'
import { cardsApi } from '@/services/api'
import { InstitutionStep, type InstitutionChoice } from './AccountEditor'
import { AccountPicker } from './AccountPicker'
import { AmountInput, amountToInput, parseAmountOrZero } from './AmountInput'
import { CreditCardVisual } from './CreditCardVisual'
import { CurrencyPicker } from './CurrencyPicker'
import { NetworkLogo, networkName } from './NetworkLogo'

export type CardEditorResult = 'created' | 'updated' | 'deleted'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tarjeta a editar (una cuenta con `card`); sin ella, se crea una empezando por el banco emisor. */
  initial?: Account
  /** Cuentas del usuario: entre ellas se elige la cuenta de pago. */
  accounts: Account[]
  onDone: (result: CardEditorResult) => void
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export function CardEditor({ open, onOpenChange, initial, accounts, onDone }: Props) {
  const isDesktop = useMediaQuery('(min-width: 640px)')
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className="gap-0 overflow-hidden data-[side=bottom]:max-h-[92dvh] data-[side=bottom]:rounded-t-xl data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
      >
        {open && (
          <EditorBody
            key={initial?.id ?? 'new'}
            initial={initial}
            accounts={accounts}
            onDone={onDone}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function EditorBody({
  initial,
  accounts,
  onDone,
  onCancel,
}: Pick<Props, 'initial' | 'accounts' | 'onDone'> & { onCancel: () => void }) {
  const { t } = useI18n()
  const [choice, setChoice] = useState<InstitutionChoice | null>(
    initial ? { institution: initial.institution, info: initial.institution_info ?? undefined } : null,
  )
  if (!choice) {
    return (
      <InstitutionStep
        onPick={setChoice}
        allowCash={false}
        title={t.cardEditor.pickTitle}
        description={t.cardEditor.pickDescription}
      />
    )
  }
  return (
    <DetailsStep
      initial={initial}
      choice={choice}
      accounts={accounts}
      onChangeInstitution={initial ? undefined : () => setChoice(null)}
      onDone={onDone}
      onCancel={onCancel}
    />
  )
}

interface DetailsProps {
  initial?: Account
  choice: InstitutionChoice
  accounts: Account[]
  onChangeInstitution?: () => void
  onDone: Props['onDone']
  onCancel: () => void
}

function DetailsStep({ initial, choice, accounts, onChangeInstitution, onDone, onCancel }: DetailsProps) {
  const { t } = useI18n()
  const { user } = useAuth()
  const info = choice.info
  const config = initial?.card

  const [name, setName] = useState(initial?.name ?? info?.name ?? '')
  const [network, setNetwork] = useState<CardNetwork>(config?.network ?? 'visa')
  const [last4, setLast4] = useState(config?.last4 ?? '')
  const [limit, setLimit] = useState(config ? amountToInput(config.credit_limit) : '')
  const [closingDay, setClosingDay] = useState(config?.closing_day ?? 1)
  const [dueDay, setDueDay] = useState(config?.due_day ?? 10)
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? user?.currency ?? 'USD')
  const currencyTouched = useRef(false)
  const payable = accounts.filter((a) => a.kind !== 'credit_card' && !a.archived)
  const [paymentId, setPaymentId] = useState<number | null>(
    config ? config.payment_account_id : (payable.find((a) => a.currency === currency)?.id ?? null),
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Como en las cuentas: la moneda del país del banco emisor se propone sola.
  useEffect(() => {
    if (initial || !info?.country) return
    countryByCode(info.country).then((c) => {
      if (c?.currency && !currencyTouched.current) setCurrency(c.currency)
    })
  }, [initial, info?.country])

  const last4Invalid = last4 !== '' && !/^\d{4}$/.test(last4)
  const schedule = format(dueDay > closingDay ? t.cardEditor.schedule : t.cardEditor.scheduleNextMonth, {
    closing: closingDay,
    due: dueDay,
  })

  async function submit(e: FormEvent) {
    e.preventDefault()
    const creditLimit = parseAmountOrZero(limit)
    if (!name.trim()) return setError(t.cardEditor.name)
    if (last4Invalid) return setError(t.cardEditor.last4Error)
    if (creditLimit === null) return setError(t.editor.amountError)
    setError('')
    setSaving(true)
    const data = {
      name: name.trim(),
      currency,
      institution: choice.institution,
      network,
      last4: last4 || null,
      credit_limit: creditLimit,
      closing_day: closingDay,
      due_day: dueDay,
      payment_account_id: paymentId,
      archived: initial?.archived ?? false,
    }
    try {
      if (initial) await cardsApi.update(initial.id, data)
      else await cardsApi.create(data)
      onDone(initial ? 'updated' : 'created')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.cardEditor.saveError)
      setSaving(false)
    }
  }

  async function remove() {
    if (!initial) return
    try {
      await cardsApi.remove(initial.id)
      onDone('deleted')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.cardEditor.saveError)
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle>{initial ? t.cardEditor.editTitle : t.cardEditor.newTitle}</SheetTitle>
        <SheetDescription>{t.cardEditor.detailsDescription}</SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        {/* Vista previa en vivo */}
        <div className="flex flex-col items-center gap-2">
          <CreditCardVisual
            name={name || info?.name || t.cardEditor.newTitle}
            network={network}
            last4={last4Invalid ? null : last4}
            institution={choice.institution}
            info={info}
            className="max-w-xs"
          />
          {onChangeInstitution && (
            <Button type="button" variant="ghost" size="sm" onClick={onChangeInstitution}>
              <ArrowLeftIcon />
              {t.accountEditor.change} · {info?.name ?? t.accountEditor.other}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="card-name">{t.cardEditor.name}</Label>
          <Input
            id="card-name"
            className="h-11 sm:h-10"
            maxLength={60}
            required
            placeholder={t.cardEditor.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t.cardEditor.network}</Label>
          <div role="radiogroup" aria-label={t.cardEditor.network} className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {CARD_NETWORKS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={network === n}
                aria-label={networkName(n, t.cardEditor.other)}
                title={networkName(n, t.cardEditor.other)}
                onClick={() => setNetwork(n)}
                className={cn(
                  'flex h-11 items-center justify-center gap-1.5 rounded-lg border px-2 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                  network === n ? 'border-primary bg-primary/10' : 'bg-card hover:bg-muted',
                )}
              >
                {n === 'other' ? (
                  <span className="type-caption font-medium">{t.cardEditor.other}</span>
                ) : (
                  <NetworkLogo network={n} height={16} tone="dark" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="card-last4">
              {t.cardEditor.last4} <span className="font-normal text-muted-foreground">({t.cardEditor.optional})</span>
            </Label>
            <Input
              id="card-last4"
              className="tabular h-11 tracking-[0.3em] sm:h-10"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="1234"
              aria-invalid={last4Invalid}
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="card-limit">{t.cardEditor.limit}</Label>
            <AmountInput id="card-limit" currency={currency} value={limit} onChange={setLimit} />
          </div>
          <p className="-mt-2 flex items-start gap-1.5 type-caption text-muted-foreground sm:col-span-2">
            <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0 text-income" aria-hidden />
            {t.cardEditor.last4Hint}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-3">
            <DaySelect id="card-closing" label={t.cardEditor.closingDay} value={closingDay} onChange={setClosingDay} />
            <DaySelect id="card-due" label={t.cardEditor.dueDay} value={dueDay} onChange={setDueDay} />
          </div>
          <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 type-caption text-muted-foreground">
            <CalendarClockIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              {schedule}.{' '}
              <span className="font-semibold text-foreground">
                {format(t.cardEditor.bestDay, { day: bestPurchaseDay(closingDay) })}
              </span>
            </span>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="card-currency">{t.cardEditor.currency}</Label>
            <CurrencyPicker
              id="card-currency"
              value={currency}
              suggested={[user?.currency ?? 'USD']}
              onChange={(c) => {
                currencyTouched.current = true
                setCurrency(c)
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="card-payment">{t.cardEditor.paymentAccount}</Label>
            <AccountPicker
              id="card-payment"
              accounts={payable}
              value={paymentId}
              onChange={setPaymentId}
              title={t.cardEditor.paymentAccount}
              placeholder={t.cardEditor.noPaymentAccount}
            />
          </div>
          <p className="-mt-2 type-caption text-muted-foreground sm:col-span-2">{t.cardEditor.paymentAccountHint}</p>
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
                <AlertDialogTitle>{format(t.cards.deleteTitle, { name: initial.name })}</AlertDialogTitle>
                <AlertDialogDescription>{t.cards.deleteDescription}</AlertDialogDescription>
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

function DaySelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (day: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger id={id} className="tabular h-11! w-full sm:h-10!">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {DAYS.map((d) => (
            <SelectItem key={d} value={String(d)} className="tabular">
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
