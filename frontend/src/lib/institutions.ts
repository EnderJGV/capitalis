import type { InstitutionKind } from '@/domain/types'

/** Id especial de una cuenta de efectivo (no es una institución del catálogo). */
export const CASH_ID = 'cash'

export const INSTITUTION_KINDS: InstitutionKind[] = ['bank', 'digital', 'broker', 'cooperative', 'exchange']

/** Tipo de cuenta que se sugiere según el tipo de institución elegida. */
export function suggestedAccountKind(kind: InstitutionKind | undefined): 'checking' | 'digital' | 'investment' {
  if (kind === 'broker' || kind === 'exchange') return 'investment'
  if (kind === 'digital') return 'digital'
  return 'checking'
}
