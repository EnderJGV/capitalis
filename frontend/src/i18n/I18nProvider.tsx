import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { isLanguage, localeOf, type Language } from './languages'
import type { Messages } from './messages/es'
import { getLanguage, messagesFor, setCurrentLanguage } from './runtime'

interface I18nContextValue {
  lang: Language
  locale: string
  t: Messages
  /** Cambia el idioma; si hay sesión, también lo guarda en la cuenta. */
  setLanguage: (lang: Language) => Promise<void>
}

const I18nContext = createContext<I18nContextValue | null>(null)

/** Debe ir dentro de AuthProvider: cuando hay sesión, manda el idioma guardado en la cuenta. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { user, setLanguage: saveAccountLanguage } = useAuth()
  const [lang, setLang] = useState<Language>(getLanguage)

  // Al iniciar sesión (o recargar), el idioma de la cuenta tiene prioridad.
  useEffect(() => {
    if (user && isLanguage(user.language) && user.language !== lang) setLang(user.language)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.language])

  // El estado de módulo (fechas, errores HTTP) debe estar al día antes de pintar los hijos.
  if (getLanguage() !== lang) setCurrentLanguage(lang)
  useEffect(() => setCurrentLanguage(lang), [lang])

  const setLanguage = useCallback(
    async (next: Language) => {
      setLang(next)
      if (user) await saveAccountLanguage(next)
    },
    [user, saveAccountLanguage],
  )

  const value = useMemo<I18nContextValue>(
    () => ({ lang, locale: localeOf(lang), t: messagesFor(lang), setLanguage }),
    [lang, setLanguage],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n debe usarse dentro de I18nProvider')
  return ctx
}

/**
 * Como `format`, pero los valores pueden ser elementos (p. ej., una cifra en negrita), así cada idioma
 * conserva su propio orden de palabras: rich(t.strip.left, { amount: <strong>…</strong> }).
 */
export function rich(template: string, values: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/g).map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1]
    return <Fragment key={i}>{key && key in values ? values[key] : part}</Fragment>
  })
}
