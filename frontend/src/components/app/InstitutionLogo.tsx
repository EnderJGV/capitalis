import { useState } from 'react'
import { BanknoteIcon, LandmarkIcon } from 'lucide-react'
import type { InstitutionInfo } from '@/domain/types'
import { CASH_ID } from '@/lib/institutions'
import { cn } from '@/lib/utils'

const SIZES = {
  xs: 'size-5 rounded-md text-[9px]',
  sm: 'size-8 rounded-lg text-[11px]',
  md: 'size-10 rounded-xl text-[13px]',
  lg: 'size-12 rounded-xl text-sm',
} as const

interface Props {
  /** Id de la institución ("cash" para efectivo, null/otra si no hay). */
  institution: string | null | undefined
  /** Dominio y color de la institución (de `account.institution_info` o del catálogo). */
  info?: Pick<InstitutionInfo, 'domain' | 'color'> & { name?: string } | null
  /** Nombre visible: se usa para las iniciales cuando no hay logo. */
  name: string
  size?: keyof typeof SIZES
  className?: string
}

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2)
  return (words[0][0] + words[1][0]).toUpperCase()
}

/**
 * Logo de la institución pedido en tiempo real a partir de su dominio (servicio de íconos de Google).
 * Al servicio solo le llega el dominio del banco. Si no hay dominio o la imagen falla, se muestra un
 * monograma con el color de la marca (o un color estable derivado del nombre).
 */
export function InstitutionLogo({ institution, info, name, size = 'md', className }: Props) {
  const [failed, setFailed] = useState(false)
  const base = cn('relative flex shrink-0 items-center justify-center overflow-hidden font-bold', SIZES[size], className)

  if (institution === CASH_ID) {
    return (
      <span className={cn(base, 'bg-income/15 text-income')} aria-hidden>
        <BanknoteIcon className="size-1/2" strokeWidth={1.75} />
      </span>
    )
  }

  if (!institution || !info) {
    return (
      <span className={cn(base, 'bg-accent text-accent-foreground')} aria-hidden>
        <LandmarkIcon className="size-1/2" strokeWidth={1.75} />
      </span>
    )
  }

  if (info.domain && !failed) {
    return (
      <span className={cn(base, 'bg-white ring-1 ring-black/5 dark:ring-white/10')} aria-hidden>
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(info.domain)}&sz=128`}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-[78%] object-contain"
          onError={() => setFailed(true)}
          // Sin ícono propio, el servicio devuelve un globo genérico de 16 px: mejor el monograma.
          onLoad={(e) => e.currentTarget.naturalWidth < 32 && setFailed(true)}
        />
      </span>
    )
  }

  return (
    <span className={cn(base, 'text-white')} style={{ background: info.color ?? hashColor(info.name ?? name) }} aria-hidden>
      {initials(info.name ?? name)}
    </span>
  )
}

/** Color estable para instituciones sin color de marca (siempre el mismo para el mismo nombre). */
function hashColor(text: string): string {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360
  return `hsl(${h} 45% 38%)`
}
