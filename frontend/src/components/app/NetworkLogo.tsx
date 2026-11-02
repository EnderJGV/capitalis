import { CreditCardIcon } from 'lucide-react'
import type { CardNetwork } from '@/domain/types'
import { cn } from '@/lib/utils'

const NAMES: Record<Exclude<CardNetwork, 'other'>, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  elo: 'Elo',
  hipercard: 'Hipercard',
  diners: 'Diners Club',
  discover: 'Discover',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  cabal: 'Cabal',
}

export function networkName(network: CardNetwork, otherLabel: string): string {
  return network === 'other' ? otherLabel : NAMES[network]
}

interface Props {
  network: CardNetwork
  /** Alto en px; el ancho se ajusta solo. */
  height?: number
  /** `light`: sobre fondos oscuros o de color (la tarjeta); `dark`: sobre fondos claros. */
  tone?: 'light' | 'dark'
  className?: string
}

/**
 * Marca de la red de la tarjeta dibujada localmente (sin pedir imágenes a terceros): los círculos de
 * Mastercard y el nombre de las demás con su tipografía característica.
 */
export function NetworkLogo({ network, height = 20, tone = 'light', className }: Props) {
  const ink = tone === 'light' ? 'text-white' : 'text-foreground'
  const label = network === 'other' ? undefined : NAMES[network]

  if (network === 'mastercard') {
    return (
      <svg role="img" aria-label={label} viewBox="0 0 38 24" style={{ height }} className={cn('w-auto shrink-0', className)}>
        <circle cx="13" cy="12" r="11" fill="#EB001B" />
        <circle cx="25" cy="12" r="11" fill="#F79E1B" />
        <path d="M19 2.8a11 11 0 0 1 0 18.4a11 11 0 0 1 0-18.4z" fill="#FF5F00" />
      </svg>
    )
  }

  if (network === 'other') {
    return <CreditCardIcon aria-hidden style={{ height, width: height }} className={cn('shrink-0 opacity-80', ink, className)} />
  }

  const word: Record<string, { text: string; className: string }> = {
    visa: { text: 'VISA', className: 'font-black italic tracking-tight' },
    amex: { text: 'AMEX', className: 'rounded-[3px] bg-[#2E77BC] px-1 font-black tracking-tight text-white' },
    elo: { text: 'elo', className: 'font-black lowercase tracking-tight' },
    hipercard: { text: 'Hipercard', className: 'rounded-[3px] bg-[#B3131B] px-1 font-bold italic text-white' },
    diners: { text: 'Diners Club', className: 'font-semibold tracking-tight' },
    discover: { text: 'DISCOVER', className: 'font-bold tracking-tight' },
    jcb: { text: 'JCB', className: 'font-black tracking-tight' },
    unionpay: { text: 'UnionPay', className: 'font-bold italic tracking-tight' },
    cabal: { text: 'CABAL', className: 'font-black tracking-wide' },
  }
  const w = word[network]
  return (
    <span
      role="img"
      aria-label={label}
      style={{ fontSize: height * 0.8, lineHeight: `${height}px` }}
      className={cn('inline-flex shrink-0 items-center whitespace-nowrap select-none', ink, w.className, className)}
    >
      {w.text}
    </span>
  )
}
