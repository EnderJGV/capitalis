import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowDownUpIcon,
  CalendarIcon,
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  TextIcon,
  Trash2Icon,
  WalletIcon,
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
import type { Account, Rate, Transfer } from '@/domain/types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { rich, useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { cn } from '@/lib/utils'
import { ratesApi, transfersApi } from '@/services/api'
import { formatDate, todayISO, useMoney } from '@/utils/format'
import { AccountPicker } from './AccountPicker'
import { AmountInput, amountToInput, parseAmount, parseRate } from './AmountInput'
import { EmptyState } from './EmptyState'

export type TransferEditorResult = 'created' | 'updated' | 'deleted'

/** Datos para abrir una transferencia nueva ya completada (p. ej., "Pagar factura"). */
export interface TransferPreset {
  fromAccountId?: number
  toAccountId?: number
  /** Monto que debe llegar al destino ("123.45"); si las monedas difieren, el que sale se calcula con la cotización. */
  amount?: string
  description?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  initial?: Transfer
  /** Transferencia nueva ya completada (cuenta de origen, destino, monto…). */
  preset?: TransferPreset
  onDone: (result: TransferEditorResult) => void
  onCreateAccount: () => void
}

export function TransferEditor({ open, onOpenChange, accounts, initial, preset, onDone, onCreateAccount }: Props) {
  const { t } = useI18n()
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const usable = accounts.filter((a) => !a.archived)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className="gap-0 overflow-hidden data-[side=bottom]:max-h-[92dvh] data-[side=bottom]:rounded-t-xl data-[side=right]:w-full data-[side=right]:sm:max-w-md"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>{initial ? t.transfer.editTitle : t.transfer.newTitle}</SheetTitle>
          <SheetDescription>{t.transfer.description}</SheetDescription>
        </SheetHeader>
        {open &&
          (usable.length < 2 && !initial ? (
            <EmptyState
              icon={WalletIcon}
              title={t.transfer.needTwoTitle}
              description={t.transfer.needTwoDescription}
              action={
                <Button size="lg" onClick={onCreateAccount}>
                  <PlusIcon />
                  {t.accounts.new}
                </Button>
              }
            />
          ) : (
            <TransferForm
              key={initial?.id ?? `new-${preset?.fromAccountId ?? ''}-${preset?.toAccountId ?? ''}`}
              accounts={accounts}
              initial={initial}
              preset={preset}
              onDone={onDone}
              onCancel={() => onOpenChange(false)}
            />
          ))}
      </SheetContent>
    </Sheet>
  )
}

interface FormProps {
  accounts: Account[]
  initial?: Transfer
  preset?: TransferPreset
  onDone: Props['onDone']
  onCancel: () => void
}

function TransferForm({ accounts, initial, preset, onDone, onCancel }: FormProps) {
  const { t, lang } = useI18n()
  const money = useMoney()
  const toInput = (n: number, digits = 2) => {
    const fixed = n.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '')
    return lang === 'en' ? fixed : fixed.replace('.', ',')
  }

  const usable = accounts.filter((a) => !a.archived)
  const defaultFromId = preset?.fromAccountId ?? usable.find((a) => a.id !== preset?.toAccountId)?.id ?? null
  const [fromId, setFromId] = useState<number | null>(initial?.from_account_id ?? defaultFromId)
  const [toId, setToId] = useState<number | null>(
    initial?.to_account_id ?? preset?.toAccountId ?? usable.find((a) => a.id !== defaultFromId)?.id ?? null,
  )
  // El monto del preset es el que debe llegar: si las monedas son iguales, también es el que sale.
  const presetCross = (() => {
    const f = accounts.find((a) => a.id === fromId)
    const tAcc = accounts.find((a) => a.id === toId)
    return !!f && !!tAcc && f.currency !== tAcc.currency
  })()
  const [amount, setAmount] = useState(
    initial ? amountToInput(initial.amount) : preset?.amount && !presetCross ? amountToInput(preset.amount) : '',
  )
  const [received, setReceived] = useState(
    initial ? amountToInput(initial.received_amount) : preset?.amount && presetCross ? amountToInput(preset.amount) : '',
  )
  const [rate, setRate] = useState(initial ? toInput(Number(initial.rate), 6) : '')
  const [feeOn, setFeeOn] = useState(Number(initial?.fee ?? 0) > 0)
  const [fee, setFee] = useState(initial && Number(initial.fee) > 0 ? amountToInput(initial.fee) : '')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [description, setDescription] = useState(initial?.description ?? preset?.description ?? '')
  const [suggestion, setSuggestion] = useState<Rate | 'loading' | 'unavailable' | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const from = accounts.find((a) => a.id === fromId)
  const to = accounts.find((a) => a.id === toId)
  const crossCurrency = !!from && !!to && from.currency !== to.currency

  // Monto que llega = monto que sale × tipo de cambio (cuando ambos existen).
  function recompute(nextAmount: string, nextRate: string) {
    const a = parseAmount(nextAmount)
    const r = parseRate(nextRate)
    if (a && r) setReceived(toInput(Number(a) * r))
  }

  // Cotización sugerida para el par de monedas y la fecha.
  useEffect(() => {
    if (!from || !to || !crossCurrency) {
      setSuggestion(null)
      return
    }
    let cancelled = false
    setSuggestion('loading')
    ratesApi
      .get(from.currency, to.currency, date)
      .then((r) => {
        if (cancelled) return
        setSuggestion(r)
        // Sin tipo de cambio escrito todavía: se usa la sugerencia directamente.
        setRate((current) => {
          if (current) return current
          const next = toInput(Number(r.rate), 6)
          const wanted = parseAmount(received)
          if (!parseAmount(amount) && wanted) {
            // Se sabe cuánto debe llegar (p. ej., el total de la factura): se calcula cuánto sale.
            setAmount(toInput(Number(wanted) / Number(r.rate)))
          } else {
            recompute(amount, next)
          }
          return next
        })
      })
      .catch(() => !cancelled && setSuggestion('unavailable'))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from?.currency, to?.currency, date, crossCurrency])

  function swap() {
    setFromId(toId)
    setToId(fromId)
    setRate('')
    setReceived('')
  }

  const parsedAmount = parseAmount(amount)
  const parsedFee = feeOn ? parseAmount(fee) : null
  const parsedReceived = crossCurrency ? parseAmount(received) : parsedAmount

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!from || !to) {
      setError(t.transfer.chooseAccount)
      return
    }
    if (!parsedAmount) {
      setError(t.editor.amountError)
      return
    }
    if (crossCurrency && !parsedReceived) {
      setError(t.transfer.receivedError)
      return
    }
    setError('')
    setSaving(true)
    const data = {
      from_account_id: from.id,
      to_account_id: to.id,
      amount: parsedAmount,
      received_amount: crossCurrency ? parsedReceived : null,
      fee: parsedFee ?? '0',
      date,
      description: description.trim(),
    }
    try {
      if (initial) await transfersApi.update(initial.id, data)
      else await transfersApi.create(data)
      onDone(initial ? 'updated' : 'created')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.transfer.saveError)
      setSaving(false)
    }
  }

  async function remove() {
    if (!initial) return
    try {
      await transfersApi.remove(initial.id)
      onDone('deleted')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.transfer.saveError)
    }
  }

  const sentTotal = parsedAmount ? Number(parsedAmount) + Number(parsedFee ?? 0) : null

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        {/* Origen ⇅ destino */}
        <div className="relative flex flex-col gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-from">{t.transfer.from}</Label>
            <AccountPicker
              id="transfer-from"
              accounts={accounts}
              value={fromId}
              exclude={toId}
              title={t.transfer.from}
              onChange={(id) => {
                setFromId(id)
                setRate('')
              }}
            />
          </div>
          <div className="flex justify-center">
            <Button type="button" variant="outline" size="icon" aria-label={t.transfer.swap} onClick={swap} className="rounded-full">
              <ArrowDownUpIcon />
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-to">{t.transfer.to}</Label>
            <AccountPicker
              id="transfer-to"
              accounts={accounts}
              value={toId}
              exclude={fromId}
              title={t.transfer.to}
              onChange={(id) => {
                setToId(id)
                setRate('')
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="transfer-amount">{t.transfer.amountSent}</Label>
          <AmountInput
            id="transfer-amount"
            currency={from?.currency}
            value={amount}
            onChange={(v) => {
              setAmount(v)
              if (crossCurrency) recompute(v, rate)
            }}
          />
        </div>

        {/* Tipo de cambio ↔ monto que llega (solo entre monedas distintas) */}
        {crossCurrency && from && to && (
          <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="transfer-rate" className="type-caption">
                  <RefreshCwIcon className="size-3.5 text-muted-foreground" />
                  {t.transfer.rate}
                </Label>
                <Input
                  id="transfer-rate"
                  inputMode="decimal"
                  autoComplete="off"
                  className="tabular h-10 bg-card"
                  value={rate}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.,]/g, '')
                    setRate(v)
                    recompute(amount, v)
                  }}
                />
                <p className="tabular type-caption text-muted-foreground">
                  {format(t.transfer.rateHint, { from: from.currency, rate: rate || '—', to: to.currency })}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="transfer-received" className="type-caption">
                  {t.transfer.amountReceived} ({to.currency})
                </Label>
                <Input
                  id="transfer-received"
                  inputMode="decimal"
                  autoComplete="off"
                  className="tabular h-10 bg-card font-semibold"
                  value={received}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.,]/g, '')
                    setReceived(v)
                    const a = parseAmount(amount)
                    const r = parseAmount(v)
                    if (a && r) setRate(toInput(Number(r) / Number(a), 6))
                  }}
                />
              </div>
            </div>

            <div className="flex min-h-8 items-center gap-2 type-caption text-muted-foreground">
              {suggestion === 'loading' && (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  {t.transfer.loadingRate}
                </>
              )}
              {suggestion === 'unavailable' && t.transfer.rateUnavailable}
              {suggestion && typeof suggestion === 'object' && (
                <>
                  <span className="tabular flex-1">
                    {format(t.transfer.suggestion, {
                      date: formatDate(suggestion.date),
                      from: from.currency,
                      rate: toInput(Number(suggestion.rate), 6),
                      to: to.currency,
                    })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      const next = toInput(Number(suggestion.rate), 6)
                      setRate(next)
                      recompute(amount, next)
                    }}
                  >
                    {t.transfer.useSuggestion}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Comisión */}
        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-center gap-3 type-meta font-medium">
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={feeOn}
              onChange={(e) => setFeeOn(e.target.checked)}
            />
            {t.transfer.feeToggle}
          </label>
          {feeOn && from && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transfer-fee" className="type-caption">
                {format(t.transfer.feeAmount, { currency: from.currency })}
              </Label>
              <AmountInput id="transfer-fee" currency={from.currency} value={fee} onChange={setFee} />
              <p className="type-caption text-muted-foreground">{t.transfer.feeHint}</p>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="transfer-date">
              <CalendarIcon className="size-4 text-muted-foreground" />
              {t.editor.date}
            </Label>
            <Input id="transfer-date" type="date" required className="h-10" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="transfer-description">
              <TextIcon className="size-4 text-muted-foreground" />
              {t.editor.description}
            </Label>
            <Input
              id="transfer-description"
              className="h-10"
              maxLength={255}
              placeholder={t.transfer.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Resumen */}
        {from && to && sentTotal !== null && parsedReceived && (
          <p className={cn('rounded-lg bg-accent px-3 py-2.5 type-meta text-accent-foreground')}>
            {rich(parsedFee ? t.transfer.summaryFee : t.transfer.summary, {
              sent: <strong className="tabular">{money(sentTotal, from.currency)}</strong>,
              fee: <span className="tabular">{money(parsedFee ?? 0, from.currency)}</span>,
              received: <strong className="tabular">{money(parsedReceived, to.currency)}</strong>,
            })}
          </p>
        )}

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
                <AlertDialogTitle>{t.transfer.deleteTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.transfer.deleteDescription}</AlertDialogDescription>
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
