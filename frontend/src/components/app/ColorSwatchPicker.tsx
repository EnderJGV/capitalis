import { CheckIcon } from 'lucide-react'
import { useI18n } from '@/i18n/I18nProvider'
import { CATEGORY_COLORS } from '@/lib/palette'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (color: string) => void
  id?: string
}

/** Selector de color con la paleta curada; conserva el color actual si no está en la paleta. */
export function ColorSwatchPicker({ value, onChange, id }: Props) {
  const { t } = useI18n()
  const inPalette = CATEGORY_COLORS.some((c) => c.value.toLowerCase() === value.toLowerCase())
  const palette = CATEGORY_COLORS.map((c, i) => ({ value: c.value, name: t.palette[i] ?? c.name }))
  const options = inPalette ? palette : [{ value, name: t.categoryEditor.currentColor }, ...palette]

  return (
    <div id={id} role="radiogroup" aria-label={t.categoryEditor.color} className="flex flex-wrap gap-2">
      {options.map((c) => {
        const selected = c.value.toLowerCase() === value.toLowerCase()
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.name}
            title={c.name}
            onClick={() => onChange(c.value)}
            className={cn(
              'flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform outline-none hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/60',
              selected && 'ring-2 ring-foreground',
            )}
            style={{ background: c.value }}
          >
            {selected && <CheckIcon className="size-4 text-white" strokeWidth={3} />}
          </button>
        )
      })}
    </div>
  )
}
