import { cn } from '@/lib/utils'

/** Fondo decorativo de marca: dos brillos que se desplazan lentamente y una cuadrícula que se desvanece. */
export function BrandBackdrop({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="absolute -top-32 -left-24 size-96 animate-drift rounded-full bg-[radial-gradient(circle,rgb(95_191_151/0.35),transparent_65%)] blur-2xl motion-reduce:animate-none" />
      <div className="absolute -right-32 -bottom-40 size-[28rem] animate-drift rounded-full bg-[radial-gradient(circle,rgb(63_116_196/0.25),transparent_65%)] blur-2xl [animation-delay:-9s] motion-reduce:animate-none" />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(255 255 255 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.05) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse at 30% 40%, black 20%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 30% 40%, black 20%, transparent 75%)',
        }}
      />
    </div>
  )
}
