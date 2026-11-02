import type { Language } from '@/i18n/languages'
import { cn } from '@/lib/utils'

/**
 * Banderas en SVG (simplificadas) para los idiomas: se ven igual en cualquier sistema, a diferencia
 * de los emojis de bandera, que Windows muestra como letras sueltas.
 */
export function FlagIcon({ lang, className }: { lang: Language; className?: string }) {
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
      {FLAGS[lang]}
    </svg>
  )
}

const FLAGS: Record<Language, React.ReactNode> = {
  // España: franjas roja, amarilla (doble) y roja.
  es: (
    <>
      <rect width="24" height="16" fill="#C60B1E" />
      <rect y="4" width="24" height="8" fill="#FFC400" />
    </>
  ),
  // Brasil: fondo verde, rombo amarillo y círculo azul con su franja.
  pt: (
    <>
      <rect width="24" height="16" fill="#009B3A" />
      <path d="M12 2 L22 8 L12 14 L2 8 Z" fill="#FEDF00" />
      <circle cx="12" cy="8" r="3.6" fill="#002776" />
      <path d="M8.6 7.2 C10.8 6.6 13.6 7 15.4 8.6" stroke="#fff" strokeWidth="0.8" fill="none" />
    </>
  ),
  // Estados Unidos: franjas rojas y blancas con el cantón azul y estrellas como puntos.
  en: (
    <>
      <rect width="24" height="16" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 16) / 13} width="24" height={16 / 13} fill="#B22234" />
      ))}
      <rect width="10.4" height={(16 / 13) * 7} fill="#3C3B6E" />
      {[
        [1.6, 1.4], [4, 1.4], [6.4, 1.4], [8.8, 1.4],
        [2.8, 3.1], [5.2, 3.1], [7.6, 3.1],
        [1.6, 4.8], [4, 4.8], [6.4, 4.8], [8.8, 4.8],
        [2.8, 6.5], [5.2, 6.5], [7.6, 6.5],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.5" fill="#fff" />
      ))}
    </>
  ),
}
