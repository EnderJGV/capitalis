import type { ReactNode } from 'react'
import { useCountUp } from '@/hooks/use-count-up'
import { cn } from '@/lib/utils'

interface Props {
  /** 0–100. */
  percent: number
  color: string
  /** Lado en px. */
  size?: number
  stroke?: number
  children?: ReactNode
  className?: string
}

/** Anillo de progreso en SVG; el contenido (emoji, porcentaje…) va centrado. */
export function ProgressRing({ percent, color, size = 64, stroke = 6, children, className }: Props) {
  const animated = useCountUp(Math.min(100, Math.max(0, percent)))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-current opacity-15" style={{ color }} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - animated / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
