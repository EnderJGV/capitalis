import { ArrowDownLeftIcon, ArrowUpRightIcon, type LucideIcon } from 'lucide-react'
import type { TxType } from '@/domain/types'

/** Ícono de cada tipo de movimiento, igual en toda la app: ↙ entra dinero, ↗ sale dinero. */
export const TYPE_ICON: Record<TxType, LucideIcon> = {
  income: ArrowDownLeftIcon,
  expense: ArrowUpRightIcon,
}
