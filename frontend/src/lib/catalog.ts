import { useEffect, useState } from 'react'
import type { CatalogCountry } from '@/domain/types'
import { catalogApi } from '@/services/api'

/** Países y monedas del catálogo: cambian muy poco, así que se piden una sola vez por sesión. */
let countriesPromise: Promise<CatalogCountry[]> | null = null
let currenciesPromise: Promise<string[]> | null = null

function useOnce<T>(load: () => Promise<T>, initial: T): T {
  const [value, setValue] = useState<T>(initial)
  useEffect(() => {
    let cancelled = false
    load()
      .then((v) => !cancelled && setValue(v))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [load])
  return value
}

const loadCountries = () => (countriesPromise ??= catalogApi.countries().catch((e) => ((countriesPromise = null), Promise.reject(e))))
const loadCurrencies = () => (currenciesPromise ??= catalogApi.currencies().catch((e) => ((currenciesPromise = null), Promise.reject(e))))

export const useCatalogCountries = (): CatalogCountry[] => useOnce(loadCountries, [])
export const useCatalogCurrencies = (): string[] => useOnce(loadCurrencies, [])

/** País por código, para sugerir la moneda al elegir una institución. */
export async function countryByCode(code: string): Promise<CatalogCountry | undefined> {
  return (await loadCountries()).find((c) => c.code === code)
}
