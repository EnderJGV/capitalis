import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { useCurrencySymbol } from '@/utils/format'

interface Props extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
}

/** Monto grande con prefijo de moneda. Acepta coma o punto como separador decimal. */
export function AmountInput({ value, onChange, className, ...props }: Props) {
  const symbol = useCurrencySymbol()
  const { lang } = useI18n()
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
