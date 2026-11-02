import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { currencySymbol, useCurrencySymbol } from '@/utils/format'

interface Props extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  /** Moneda del monto (p. ej., la de la cuenta); por defecto, la moneda principal del usuario. */
  currency?: string
}

/** Monto grande con prefijo de moneda. Acepta coma o punto como separador decimal. */
export function AmountInput({ value, onChange, currency, className, ...props }: Props) {
  const mainSymbol = useCurrencySymbol()
  const { lang, locale } = useI18n()
  const symbol = currency ? currencySymbol(currency, locale) : mainSymbol
  return (
    <div
      className={cn(
        'flex items-baseline gap-2 rounded-lg border border-input bg-card px-3 py-2 transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30',
        className,
      )}
    >
      <span className="type-heading text-muted-foreground">{symbol}</span>
      <input
        inputMode="decimal"
        autoComplete="off"
        placeholder={lang === 'en' ? '0.00' : '0,00'}
        className="tabular w-full min-w-0 bg-transparent type-display outline-none placeholder:text-muted-foreground/50"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        {...props}
      />
    </div>
  )
}

/** "1.234,5" o "1234.50" → "1234.50"; null si no es un monto positivo. */
export function parseAmount(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const lastSep = Math.max(trimmed.lastIndexOf(','), trimmed.lastIndexOf('.'))
  const hasDecimals = lastSep !== -1 && trimmed.length - lastSep - 1 <= 2
  const normalized = hasDecimals
    ? trimmed.slice(0, lastSep).replace(/[.,]/g, '') + '.' + trimmed.slice(lastSep + 1)
    : trimmed.replace(/[.,]/g, '')
  const n = Number(normalized)
  if (!Number.isFinite(n) || n <= 0) return null
  return n.toFixed(2)
}

export function amountToInput(amount: string): string {
  return amount.replace('.', ',')
}

/** "5,4812" o "5.4812" → 5.4812 (acepta más de 2 decimales, para tipos de cambio y porcentajes). */
export function parseRate(raw: string): number | null {
  const s = raw.replace(/\s/g, '')
  if (!s) return null
  const last = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  const normalized = last === -1 ? s : s.slice(0, last).replace(/[.,]/g, '') + '.' + s.slice(last + 1)
  const n = Number(normalized)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** 5.5 → "5,5" (o "5.5" en inglés), con hasta `digits` decimales y sin ceros sobrantes. */
export function decimalToInput(n: number, lang: string, digits = 2): string {
  const fixed = n.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '')
  return lang === 'en' ? fixed : fixed.replace('.', ',')
}

/** Como parseAmount, pero acepta cero (p. ej., el saldo inicial de una cuenta nueva). */
export function parseAmountOrZero(raw: string): string | null {
  if (!raw.trim() || /^0+([.,]0*)?$/.test(raw.trim())) return '0.00'
  return parseAmount(raw)
}
