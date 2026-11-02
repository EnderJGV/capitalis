import { useEffect, useState } from 'react'
import { Loader2Icon, PercentIcon, RefreshCwIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Rate } from '@/domain/types'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { ratesApi } from '@/services/api'
import { formatDate, useMoney } from '@/utils/format'
import { AmountInput, decimalToInput, parseAmount, parseRate } from './AmountInput'
import { CurrencyPicker } from './CurrencyPicker'

export interface ForeignState {
  /** Moneda en la que se hizo la compra. */
  currency: string
  /** Monto en esa moneda, tal como se escribe. */
  original: string
  /** Tipo de cambio: 1 `currency` = rate en la moneda de la tarjeta. */
  rate: string
  /** % de tarifa internacional (IOF). */
  feePercent: string
  /** Si el usuario escribió el tipo de cambio, la cotización sugerida ya no lo pisa. */
  rateTouched: boolean
}

const FEE_KEY = 'capitalis-foreign-fee'

/** Último % de tarifa usado: se propone en la próxima compra en otra moneda. */
export function rememberedFeePercent(): string {
  try {
    return localStorage.getItem(FEE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function rememberFeePercent(value: string): void {
  try {
    localStorage.setItem(FEE_KEY, value)
  } catch {
    // Sin almacenamiento: se vuelve a escribir la próxima vez.
  }
}

/** "3,5" o "3.5" → 3.5 (entre 0 y 100). */
export function parsePercent(raw: string): number | null {
  const n = parseRate(raw)
  return n !== null && n <= 100 ? n : null
}

interface Props {
  value: ForeignState
  onChange: (next: ForeignState) => void
  /** Moneda de la tarjeta (en la que se registra el gasto). */
  cardCurrency: string
  /** Fecha de la compra: define la cotización sugerida. */
  date: string
  /** Monto convertido a la moneda de la tarjeta, como texto para el campo de monto. */
  onConverted: (amount: string) => void
}

/** Moneda y monto originales, tipo de cambio (sugerido y editable) y % de tarifa internacional. */
export function ForeignPurchaseFields({ value, onChange, cardCurrency, date, onConverted }: Props) {
  const { t, lang } = useI18n()
  const money = useMoney()
  const [suggestion, setSuggestion] = useState<Rate | 'loading' | 'unavailable' | null>(null)

  const convert = (next: ForeignState) => {
    const original = parseAmount(next.original)
    const rate = parseRate(next.rate)
    if (original && rate) onConverted(decimalToInput(Number(original) * rate, lang))
  }
  const update = (patch: Partial<ForeignState>) => {
    const next = { ...value, ...patch }
    onChange(next)
    convert(next)
  }

  // Cotización del día de la compra; se usa sola mientras el usuario no escriba otra.
  useEffect(() => {
    if (value.currency === cardCurrency) {
      setSuggestion(null)
      return
    }
    let cancelled = false
    setSuggestion('loading')
    ratesApi
      .get(value.currency, cardCurrency, date)
      .then((r) => {
        if (cancelled) return
        setSuggestion(r)
        if (!value.rateTouched) update({ rate: decimalToInput(Number(r.rate), lang, 4) })
      })
      .catch(() => !cancelled && setSuggestion('unavailable'))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.currency, cardCurrency, date])

  const original = parseAmount(value.original)
  const rate = parseRate(value.rate)
  const percent = parsePercent(value.feePercent)
  const converted = original && rate ? Math.round(Number(original) * rate * 100) / 100 : null
  const fee = converted && percent ? Math.round(converted * percent) / 100 : null

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tx-foreign-currency" className="type-caption">
            {t.editor.originalCurrency}
          </Label>
          <CurrencyPicker
            id="tx-foreign-currency"
            value={value.currency}
            suggested={['USD', 'EUR']}
            onChange={(currency) => update({ currency, rateTouched: false })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tx-foreign-amount" className="type-caption">
            {format(t.editor.originalAmount, { currency: value.currency })}
          </Label>
          <AmountInput
            id="tx-foreign-amount"
            currency={value.currency}
            className="py-1.5"
            value={value.original}
            onChange={(v) => update({ original: v })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tx-foreign-rate" className="type-caption">
            <RefreshCwIcon className="size-3.5 text-muted-foreground" />
            {t.editor.rate}
          </Label>
          <Input
            id="tx-foreign-rate"
            inputMode="decimal"
            autoComplete="off"
            className="tabular h-10 bg-card"
            value={value.rate}
            onChange={(e) => update({ rate: e.target.value.replace(/[^\d.,]/g, ''), rateTouched: true })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tx-foreign-fee" className="type-caption">
            <PercentIcon className="size-3.5 text-muted-foreground" />
            {t.editor.foreignFee}
          </Label>
          <Input
            id="tx-foreign-fee"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            className="tabular h-10 bg-card"
            value={value.feePercent}
            onChange={(e) => update({ feePercent: e.target.value.replace(/[^\d.,]/g, '') })}
          />
        </div>
      </div>

      <div className="flex min-h-5 items-center gap-2 type-caption text-muted-foreground">
        {suggestion === 'loading' && (
          <>
            <Loader2Icon className="size-3.5 animate-spin" />
            {t.transfer.loadingRate}
          </>
        )}
        {suggestion === 'unavailable' && t.transfer.rateUnavailable}
        {suggestion && typeof suggestion === 'object' && (
          <span className="tabular">
            {format(t.transfer.suggestion, {
              date: formatDate(suggestion.date),
              from: value.currency,
              rate: decimalToInput(Number(suggestion.rate), lang, 4),
              to: cardCurrency,
            })}
          </span>
        )}
      </div>

      {converted !== null && (
        <p className="tabular rounded-md bg-card px-2.5 py-2 type-caption text-muted-foreground" aria-live="polite">
          {money(Number(original), value.currency)} × {decimalToInput(rate!, lang, 4)} ={' '}
          <span className="font-semibold text-foreground">{money(converted, cardCurrency)}</span>
          {fee !== null && fee > 0 && (
            <>
              {' '}
              {format(t.editor.foreignFeeSummary, { percent: decimalToInput(percent!, lang, 2), fee: money(fee, cardCurrency) })}
              {' · '}
              <span className="font-semibold text-foreground">
                {format(t.editor.foreignTotal, { total: money(converted + fee, cardCurrency) })}
              </span>
            </>
          )}
        </p>
      )}
    </div>
  )
}
