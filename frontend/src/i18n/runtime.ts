import { DEFAULT_LANGUAGE, isLanguage, localeOf, type Language } from './languages'
import { en } from './messages/en'
import { es, type Messages } from './messages/es'
import { pt } from './messages/pt'

const MESSAGES: Record<Language, Messages> = { es, pt, en }
const STORAGE_KEY = 'capitalis-lang'

/*
 * Idioma actual a nivel de módulo, para el código que no es React (formato de fechas, cliente HTTP).
 * El I18nProvider lo mantiene sincronizado con su estado.
 */
let current: Language = detectLanguage()

export function detectLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch {
    // Sin almacenamiento: se usa el idioma del navegador.
  }
  const browser = (typeof navigator !== 'undefined' ? navigator.language : '').slice(0, 2)
  return isLanguage(browser) ? browser : DEFAULT_LANGUAGE
}

export function setCurrentLanguage(lang: Language): void {
  current = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Ignorado: la preferencia de la cuenta sigue guardada en el servidor.
  }
  if (typeof document !== 'undefined') document.documentElement.lang = localeOf(lang)
}

export const getLanguage = (): Language => current
export const getLocale = (): string => localeOf(current)
export const getMessages = (): Messages => MESSAGES[current]
export const messagesFor = (lang: Language): Messages => MESSAGES[lang]

/** Reemplaza {marcadores} en un texto: format('Hola {name}', { name: 'Ana' }). */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
}
