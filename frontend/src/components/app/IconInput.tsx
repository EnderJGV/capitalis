import type { LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props extends React.ComponentProps<typeof Input> {
  icon: LucideIcon
}

/** Input con un ícono a la izquierda que indica qué dato se espera. */
export function IconInput({ icon: Icon, className, ...props }: Props) {
  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input className={cn('pl-9', className)} {...props} />
    </div>
  )
}
