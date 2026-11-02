import { cn } from '@/lib/utils'

interface Props {
  /** Versión para fondo verde (barra lateral, panel de acceso). */
  inverted?: boolean
  /** En la versión invertida el nombre solo se ve en escritorio, salvo que se pida siempre. */
  alwaysShowName?: boolean
  /** Solo el símbolo, sin el nombre (barra lateral contraída). */
  iconOnly?: boolean
  className?: string
}

/** Marca: tres franjas que se llenan, como la franja del mes. */
export function Logo({ inverted = false, alwaysShowName = false, iconOnly = false, className }: Props) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" className={inverted ? 'fill-sidebar-primary' : 'fill-primary'} />
        <g className={inverted ? 'fill-sidebar-primary-foreground' : 'fill-primary-foreground'}>
          <rect x="8" y="9" width="16" height="3.2" rx="1.6" />
          <rect x="8" y="14.4" width="11" height="3.2" rx="1.6" opacity=".75" />
          <rect x="8" y="19.8" width="6" height="3.2" rx="1.6" opacity=".5" />
        </g>
      </svg>
      {!iconOnly && (
      <span
        className={cn(
          'text-lg font-extrabold tracking-tight',
          inverted ? 'text-sidebar-accent-foreground' : 'text-foreground',
          inverted && !alwaysShowName && 'hidden lg:inline',
        )}
      >
        Capitalis
      </span>
      )}
    </span>
  )
}
