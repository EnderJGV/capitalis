import type { Language } from '@/i18n/languages'
import type { InstitutionCountry } from '@/lib/institutions'
import { cn } from '@/lib/utils'

/**
 * Banderas en SVG (simplificadas): se ven igual en cualquier sistema, a diferencia de los emojis de
 * bandera, que Windows muestra como letras sueltas.
 */
type FlagCode = Exclude<InstitutionCountry, 'INTL'> | 'ES'

const LANGUAGE_FLAG: Record<Language, FlagCode> = { es: 'ES', pt: 'BR', en: 'US' }

/** Bandera del idioma (español → España, português → Brasil, English → EE. UU.). */
export function FlagIcon({ lang, className }: { lang: Language; className?: string }) {
  return <CountryFlag code={LANGUAGE_FLAG[lang]} className={className} />
}

export function CountryFlag({ code, className }: { code: FlagCode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      aria-hidden
      // "flag-size-fixed" no aplica estilos: evita que Button/DropdownMenuItem (que fuerzan 16×16 a los
      // SVG sin "size-" en la clase) deformen la bandera.
      className={cn(
        'flag-size-fixed h-4 w-6 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10 dark:ring-white/15',
        className,
      )}
    >
      {FLAGS[code]}
    </svg>
  )
}

const US_STARS = [
  [1.6, 1.4], [4, 1.4], [6.4, 1.4], [8.8, 1.4],
  [2.8, 3.1], [5.2, 3.1], [7.6, 3.1],
  [1.6, 4.8], [4, 4.8], [6.4, 4.8], [8.8, 4.8],
  [2.8, 6.5], [5.2, 6.5], [7.6, 6.5],
]

const FLAGS: Record<FlagCode, React.ReactNode> = {
  ES: (
    <>
      <rect width="24" height="16" fill="#C60B1E" />
      <rect y="4" width="24" height="8" fill="#FFC400" />
    </>
  ),
  BR: (
    <>
      <rect width="24" height="16" fill="#009B3A" />
      <path d="M12 2 L22 8 L12 14 L2 8 Z" fill="#FEDF00" />
      <circle cx="12" cy="8" r="3.6" fill="#002776" />
      <path d="M8.6 7.2 C10.8 6.6 13.6 7 15.4 8.6" stroke="#fff" strokeWidth="0.8" fill="none" />
    </>
  ),
  US: (
    <>
      <rect width="24" height="16" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 16) / 13} width="24" height={16 / 13} fill="#B22234" />
      ))}
      <rect width="10.4" height={(16 / 13) * 7} fill="#3C3B6E" />
      {US_STARS.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.5" fill="#fff" />
      ))}
    </>
  ),
  // México: verde, blanco y rojo en vertical con el escudo como un círculo.
  MX: (
    <>
      <rect width="8" height="16" fill="#006847" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#CE1126" />
      <circle cx="12" cy="8" r="2" fill="#8C6A1F" />
    </>
  ),
  // Venezuela: amarillo, azul y rojo con el arco de estrellas.
  VE: (
    <>
      <rect width="24" height="16" fill="#FFCC00" />
      <rect y="5.33" width="24" height="5.34" fill="#00247D" />
      <rect y="10.67" width="24" height="5.33" fill="#CF142B" />
      {[6.5, 8.2, 10, 12, 14, 15.8, 17.5].map((cx, i) => (
        <circle key={cx} cx={cx} cy={[9.4, 8.3, 7.6, 7.3, 7.6, 8.3, 9.4][i]} r="0.45" fill="#fff" />
      ))}
    </>
  ),
  // Colombia: amarillo (mitad), azul y rojo.
  CO: (
    <>
      <rect width="24" height="16" fill="#FCD116" />
      <rect y="8" width="24" height="4" fill="#003893" />
      <rect y="12" width="24" height="4" fill="#CE1126" />
    </>
  ),
  // Argentina: celeste, blanco y celeste con el sol.
  AR: (
    <>
      <rect width="24" height="16" fill="#74ACDF" />
      <rect y="5.33" width="24" height="5.34" fill="#fff" />
      <circle cx="12" cy="8" r="1.6" fill="#F6B40E" />
    </>
  ),
  // Chile: blanco y rojo con el cuadro azul y la estrella.
  CL: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <rect y="8" width="24" height="8" fill="#D52B1E" />
      <rect width="8" height="8" fill="#0039A6" />
      <circle cx="4" cy="4" r="1.3" fill="#fff" />
    </>
  ),
  // Perú: rojo, blanco y rojo en vertical.
  PE: (
    <>
      <rect width="24" height="16" fill="#D91023" />
      <rect x="8" width="8" height="16" fill="#fff" />
    </>
  ),
  // Unión Europea: azul con el círculo de estrellas.
  EU: (
    <>
      <rect width="24" height="16" fill="#003399" />
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI) / 6
        return <circle key={i} cx={12 + Math.cos(angle) * 4.6} cy={8 + Math.sin(angle) * 4.6} r="0.55" fill="#FFCC00" />
      })}
    </>
  ),
}
