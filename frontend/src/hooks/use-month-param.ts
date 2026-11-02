import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { currentMonth } from '@/utils/format'

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

/** Mes seleccionado guardado en la URL (?mes=2026-11), para compartirlo entre páginas. */
export function useMonthParam(): [string, (month: string) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('mes')
  const month = raw && MONTH_RE.test(raw) ? raw : currentMonth()

  const setMonth = useCallback(
    (next: string) =>
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev)
          if (next === currentMonth()) updated.delete('mes')
          else updated.set('mes', next)
          return updated
        },
        { replace: true },
      ),
    [setParams],
  )

  return [month, setMonth]
}
