export const LANGUAGES = [
  { code: 'es', name: 'Español', locale: 'es' },
  { code: 'pt', name: 'Português', locale: 'pt-BR' },
  { code: 'en', name: 'English', locale: 'en-US' },
] as const

export type Language = (typeof LANGUAGES)[number]['code']

export const DEFAULT_LANGUAGE: Language = 'es'

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((l) => l.code === value)
}

export function localeOf(lang: Language): string {
  return LANGUAGES.find((l) => l.code === lang)?.locale ?? 'es'
}
