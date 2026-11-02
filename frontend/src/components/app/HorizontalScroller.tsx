import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  /** Clases del contenedor que se desplaza (márgenes, separación, encaje). */
  className?: string
}

const DRAG_THRESHOLD = 6

/**
 * Fila que se desplaza en horizontal y funciona con cualquier dispositivo:
 * - táctil: deslizar con el dedo (nativo);
 * - mouse: arrastrar con clic, rueda vertical → horizontal y flechas ‹ › en los bordes.
 * Un arrastre no dispara el clic de la tarjeta que quedó debajo.
 */
export function HorizontalScroller({ children, className }: Props) {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; left: number; moved: boolean; id: number } | null>(null)
  const justDragged = useRef(false)
  const [edges, setEdges] = useState({ start: false, end: false })
  const [dragging, setDragging] = useState(false)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setEdges({ start: el.scrollLeft > 4, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    // Rueda vertical → desplazamiento horizontal, solo mientras la fila pueda seguir moviéndose;
    // en el borde, la rueda vuelve a desplazar la página.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      const next = el.scrollLeft + e.deltaY
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max)) return
      e.preventDefault()
      el.scrollLeft = Math.max(0, Math.min(max, next))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      observer.disconnect()
      el.removeEventListener('wheel', onWheel)
    }
  }, [update])

  const scrollByPage = (direction: 1 | -1) => {
    const el = ref.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={update}
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' || e.button !== 0 || !ref.current) return
          drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false, id: e.pointerId }
        }}
        onPointerMove={(e) => {
          const d = drag.current
          const el = ref.current
          if (!d || !el) return
          const dx = e.clientX - d.x
          if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return
          if (!d.moved) {
            d.moved = true
            el.setPointerCapture(d.id)
            setDragging(true)
          }
          el.scrollLeft = d.left - dx
        }}
        onPointerUp={() => {
          justDragged.current = !!drag.current?.moved
          drag.current = null
          setDragging(false)
        }}
        onPointerCancel={() => {
          drag.current = null
          setDragging(false)
        }}
        // Si hubo arrastre, el clic que llega al soltar no debe abrir la tarjeta.
        onClickCapture={(e) => {
          if (justDragged.current) {
            e.preventDefault()
            e.stopPropagation()
            justDragged.current = false
          }
        }}
        className={cn(
          'flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          'md:cursor-grab',
          // Mientras se arrastra: sin encaje (pelearía con el mouse) y sin seleccionar texto.
          dragging && 'cursor-grabbing! snap-none select-none',
          className,
        )}
      >
        {children}
      </div>

      {/* Bordes desvanecidos que avisan que hay más contenido */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent transition-opacity',
          edges.start ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity',
          edges.end ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Flechas solo en escritorio y solo cuando hay más contenido de ese lado */}
      {edges.start && (
        <ArrowButton side="left" label={t.common.previous} onClick={() => scrollByPage(-1)}>
          <ChevronLeftIcon className="size-5" />
        </ArrowButton>
      )}
      {edges.end && (
        <ArrowButton side="right" label={t.common.next} onClick={() => scrollByPage(1)}>
          <ChevronRightIcon className="size-5" />
        </ArrowButton>
      )}
    </div>
  )
}

function ArrowButton({
  side,
  label,
  onClick,
  children,
}: {
  side: 'left' | 'right'
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-foreground shadow-lg shadow-black/10 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:flex',
        side === 'left' ? '-left-3' : '-right-3',
      )}
    >
      {children}
    </button>
  )
}
