import { Link } from 'react-router-dom'
import { ArchiveIcon, ChevronRightIcon } from 'lucide-react'
import type { Account } from '@/domain/types'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { useMoney } from '@/utils/format'
import { InstitutionLogo } from './InstitutionLogo'

interface Props {
  account: Account
  /** Moneda principal del usuario: si la cuenta usa otra, se muestra también el saldo convertido. */
  mainCurrency: string
  compact?: boolean
  className?: string
}

/** Tarjeta de cuenta: logo, nombre, tipo y saldo (en su moneda y ≈ en la principal). */
export function AccountCard({ account, mainCurrency, compact = false, className }: Props) {
  const { t } = useI18n()
  const money = useMoney()
  const institution = account.institution_info
  const negative = Number(account.balance) < 0

  return (
    <Link
      to={`/cuentas/${account.id}`}
      className={cn(
        'group flex flex-col gap-4 rounded-xl border bg-card p-4 transition-colors outline-none hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-ring/40',
        account.archived && 'opacity-70',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <InstitutionLogo
          institution={account.institution}
          info={account.institution_info}
          name={account.name}
          size={compact ? 'sm' : 'md'}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{account.name}</p>
          <p className="truncate type-caption text-muted-foreground">
            {institution && institution.name !== account.name ? `${institution.name} · ` : ''}
            {t.accounts.kinds[account.kind]}
          </p>
        </div>
        {account.archived ? (
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 type-caption text-muted-foreground">
            <ArchiveIcon className="size-3" />
            {t.accounts.archived}
          </span>
        ) : (
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
      <div>
        <p className={cn('tabular truncate type-figure', negative && 'text-expense')}>
          {money(account.balance, account.currency)}
        </p>
        {account.currency !== mainCurrency && account.converted_balance !== null && (
          <p className="tabular type-caption text-muted-foreground">≈ {money(account.converted_balance, mainCurrency)}</p>
        )}
      </div>
    </Link>
  )
}
