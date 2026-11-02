import { useEffect, useState } from 'react'
import { GlobeIcon } from 'lucide-react'
import type { Language } from '@/i18n/languages'
import { cn } from '@/lib/utils'

/**
 * Banderas en SVG: se ven igual en cualquier sistema (los emojis de bandera se rompen en Windows).
 * El paquete con las ~250 banderas pesa ~1 MB, así que se carga bajo demanda la primera vez que se necesita;
 * las de los tres idiomas de la app están incluidas y se ven al instante.
 */
type FlagMap = Record<string, string>

let allFlags: FlagMap | null = null
let loading: Promise<FlagMap> | null = null

function loadFlags(): Promise<FlagMap> {
  loading ??= import('country-flag-icons/string/3x2').then((m) => (allFlags = m as unknown as FlagMap))
  return loading
}

const LANGUAGE_FLAG: Record<Language, string> = { es: 'ES', pt: 'BR', en: 'US' }

/** Bandera del idioma (español → España, português → Brasil, English → EE. UU.). */
export function FlagIcon({ lang, className }: { lang: Language; className?: string }) {
  return <CountryFlag code={LANGUAGE_FLAG[lang]} className={className} />
}

const FRAME = 'flag-size-fixed h-4 w-6 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10 dark:ring-white/15'

/** Bandera de un país por su código ISO ("BR"); "INTL" muestra un globo. */
export function CountryFlag({ code, className }: { code: string; className?: string }) {
  const [flags, setFlags] = useState<FlagMap | null>(allFlags)

  useEffect(() => {
    if (code === 'INTL' || flags) return
    let cancelled = false
    loadFlags().then((m) => !cancelled && setFlags(m))
    return () => {
      cancelled = true
    }
  }, [code, flags])

  if (code === 'INTL') {
    return (
      <span className={cn(FRAME, 'flex items-center justify-center bg-accent text-accent-foreground', className)} aria-hidden>
        <GlobeIcon className="size-3" />
      </span>
    )
  }

  const svg = flags?.[code.toUpperCase()]
  // [&>svg]: el SVG del paquete usa viewBox 3:2; se estira al marco para que todas midan lo mismo.
  return (
    <span
      aria-hidden
      className={cn(FRAME, 'block bg-muted [&>svg]:size-full', className)}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  )
}
