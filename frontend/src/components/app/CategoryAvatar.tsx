import { cn } from '@/lib/utils'

const SIZES = {
  xs: 'size-5 text-xs',
  sm: 'size-7 text-sm',
  md: 'size-9 text-lg',
} as const

interface Props {
  color: string
  icon?: string
  size?: keyof typeof SIZES
  className?: string
}

/** Círculo con el color de la categoría y su emoji; sin emoji, un punto del mismo color. */
export function CategoryAvatar({ color, icon, size = 'md', className }: Props) {
  return (
    <span
      className={cn('relative flex shrink-0 items-center justify-center rounded-full leading-none', SIZES[size], className)}
      style={{ color }}
      aria-hidden
    >
      <span className="absolute inset-0 rounded-full bg-current opacity-15" />
      {icon ? <span className="relative">{icon}</span> : <span className="relative size-2/5 rounded-full bg-current" />}
    </span>
  )
}
