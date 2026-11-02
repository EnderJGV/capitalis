import { useEffect, useRef } from 'react'
import { LayersIcon } from 'lucide-react'
import type { Category } from '@/domain/types'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { CategoryAvatar } from './CategoryAvatar'

interface Props {
  categories: Category[]
  /** null = todas las categorías. */
  value: number | null
  onChange: (id: number | null) => void
  className?: string
}

/**
 * Filtro de categoría en chips: en móvil, una fila que se desliza con el dedo (el chip elegido se
 * centra solo); desde md, los chips ocupan varias líneas.
 */
export function CategoryChips({ categories, value, onChange, className }: Props) {
  const { t } = useI18n()
  const scroller = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)

  // Al entrar, la fila empieza alineada con el resto del contenido; solo se desplaza al elegir un chip.
  useEffect(() => {
    const el = scroller.current
    if (!mounted.current || !el) {
      mounted.current = true
      return
    }
    if (value === null) {
      el.scrollTo({ left: 0, behavior: 'smooth' })
      return
    }
    const chip = el.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!chip) return
    const left = chip.offsetLeft - (el.clientWidth - chip.offsetWidth) / 2
    el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [value])

  return (
    <div
      ref={scroller}
      role="group"
      aria-label={t.movements.filterCategory}
      className={cn(
        // Móvil: carrusel horizontal que llega al borde de la pantalla, pero cuyo primer chip y el encaje
        // del scroll respetan el mismo margen que el resto del contenido (16px; 24px desde sm).
        '-mx-4 flex snap-x snap-proximity scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:scroll-px-6 sm:px-6',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        // Solo se desvanece el borde derecho, como pista de que hay más categorías.
        '[mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]',
        // Desde md: varias líneas, sin carrusel.
        'md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 md:[mask-image:none]',
        className,
      )}
    >
      <Chip selected={value === null} onClick={() => onChange(null)}>
        <span className="flex size-5 items-center justify-center rounded-full bg-muted">
          <LayersIcon className="size-3" />
        </span>
        {t.movements.allCategories}
      </Chip>
      {categories.map((c) => (
        <Chip key={c.id} selected={value === c.id} color={c.color} onClick={() => onChange(value === c.id ? null : c.id)}>
          <CategoryAvatar color={c.color} icon={c.icon} size="xs" />
          {c.name}
        </Chip>
      ))}
    </div>
  )
}

interface ChipProps {
  selected: boolean
  color?: string
  onClick: () => void
  children: React.ReactNode
}

function Chip({ selected, color, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex h-10 shrink-0 snap-start items-center gap-2 rounded-full border bg-card pr-3.5 pl-1.5 type-meta whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 md:h-9',
        selected ? 'font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
      style={
        selected
          ? {
              borderColor: color ?? 'var(--primary)',
              background: `color-mix(in oklab, ${color ?? 'var(--primary)'} 14%, var(--card))`,
            }
          : undefined
      }
    >
      {children}
    </button>
  )
}
