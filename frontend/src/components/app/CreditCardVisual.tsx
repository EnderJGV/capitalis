import { NfcIcon } from 'lucide-react'
import type { CardNetwork, InstitutionInfo } from '@/domain/types'
import { cn } from '@/lib/utils'
import { hashColor, InstitutionLogo } from './InstitutionLogo'
import { NetworkLogo } from './NetworkLogo'

interface CardLook {
  name: string
  network: CardNetwork
  last4?: string | null
  institution: string | null
  info?: InstitutionInfo | (Pick<InstitutionInfo, 'domain' | 'color'> & { name?: string }) | null
}

/** Relación de aspecto de una tarjeta física (ISO/IEC 7810 ID-1). */
const CARD_RATIO = 'aspect-[1.586/1]'

function isLight(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return false
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62
}

/** Color de la tarjeta: el de la marca del banco o uno estable derivado del nombre. */
function cardColors(look: CardLook) {
  const base = look.info?.color ?? hashColor(look.info?.name ?? look.name)
  const light = base.startsWith('#') && isLight(base)
  return {
    light,
    background: `linear-gradient(135deg, ${base} 0%, color-mix(in oklab, ${base} 62%, black) 100%)`,
  }
}

/** El frente de la tarjeta: color del banco, chip, red y "•••• 1234". */
export function CreditCardVisual({ className, ...look }: CardLook & { className?: string }) {
  const { light, background } = cardColors(look)
  return (
    <div
      className={cn(
        'relative isolate flex w-full flex-col justify-between overflow-hidden rounded-2xl p-[6%] shadow-lg shadow-black/20',
        CARD_RATIO,
        light ? 'text-neutral-900' : 'text-white',
        className,
      )}
      style={{ background }}
    >
      {/* Brillo sutil para que no se vea plana */}
      <div aria-hidden className="absolute -top-1/3 -right-1/4 -z-10 size-[80%] rounded-full bg-white/12 blur-2xl" />
      <div aria-hidden className="absolute -bottom-1/2 -left-1/4 -z-10 size-[70%] rounded-full bg-black/15 blur-2xl" />

      <div className="flex items-center gap-2">
        <InstitutionLogo institution={look.institution} info={look.info} name={look.name} size="sm" className="shadow-sm" />
        <span className="min-w-0 flex-1 truncate type-caption font-semibold opacity-90">{look.info?.name ?? ''}</span>
        <NfcIcon aria-hidden className="size-5 shrink-0 opacity-70" />
      </div>

      <div
        aria-hidden
        className="h-[17%] w-[13%] rounded-md bg-gradient-to-br from-[#F5D98B] via-[#D9B45A] to-[#B08A3A] shadow-inner ring-1 ring-black/10"
      />

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{look.name}</p>
          <p className="tabular type-meta tracking-[0.2em] opacity-85">•••• {look.last4 || '····'}</p>
        </div>
        <NetworkLogo network={look.network} height={22} tone={light ? 'dark' : 'light'} />
      </div>
    </div>
  )
}

/** Tarjeta en miniatura para listas y selectores. */
export function CardChip({ className, ...look }: CardLook & { className?: string }) {
  const { light, background } = cardColors(look)
  return (
    <span
      aria-hidden
      className={cn('relative flex h-8 w-12 shrink-0 items-end justify-end overflow-hidden rounded-md p-1 shadow-sm', className)}
      style={{ background }}
    >
      <span className="absolute top-1.5 left-1.5 h-2 w-2.5 rounded-[2px] bg-gradient-to-br from-[#F5D98B] to-[#B08A3A]" />
      <NetworkLogo network={look.network} height={10} tone={light ? 'dark' : 'light'} />
    </span>
  )
}
