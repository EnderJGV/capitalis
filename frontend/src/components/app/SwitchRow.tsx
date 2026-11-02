import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  icon: LucideIcon
  label: string
  hint?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Campos que aparecen al activarlo. */
  children?: ReactNode
  className?: string
}

/** Opción que se activa con un interruptor y despliega sus campos (cuotas, otra moneda, reembolso…). */
export function SwitchRow({ id, icon: Icon, label, hint, checked, onCheckedChange, children, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        checked && 'border-primary/40 bg-primary/5',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span id={`${id}-label`} className="flex items-center gap-2 type-meta font-medium">
            <Icon className="size-4 text-muted-foreground" aria-hidden />
            {label}
          </span>
          {hint && <span className="block type-caption text-muted-foreground">{hint}</span>}
        </span>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={`${id}-label`}
          onClick={() => onCheckedChange(!checked)}
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
            checked ? 'bg-primary' : 'bg-muted-foreground/30',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform',
              checked && 'translate-x-5',
            )}
          />
        </button>
      </div>
      {checked && children}
    </div>
  )
}
