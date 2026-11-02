import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  /** Orden en la cascada; cada paso retrasa la entrada 70ms. */
  step?: number
  as?: 'div' | 'li'
  className?: string
  children: ReactNode
}

/** Entrada suave de abajo hacia arriba, escalonada. Se desactiva con "reducir movimiento". */
export function Reveal({ step = 0, as: Tag = 'div', className, children }: Props) {
  return (
    <Tag
      className={cn('animate-fade-up motion-reduce:animate-none', className)}
      style={{ animationDelay: `${step * 70}ms` }}
    >
      {children}
    </Tag>
  )
}
