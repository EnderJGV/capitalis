import { useEffect, useState, type FormEvent } from 'react'
import {
  BanknoteIcon,
  CalendarIcon,
  ArrowLeftRightIcon,
  CheckIcon,
  LayersIcon,
  Loader2Icon,
  MinusIcon,
  PlusIcon,
  TagIcon,
  TextIcon,
  Trash2Icon,
  WalletIcon,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { statementDueMonth } from '@/lib/cards'
import { TYPE_ICON } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { Account, Category, Transaction, TxType } from '@/domain/types'
import { categoriesApi, transactionsApi } from '@/services/api'
import { monthLabel, toISODate, todayISO, useMoney } from '@/utils/format'
import { AmountInput, amountToInput, parseAmount } from './AmountInput'
import { AccountPicker } from './AccountPicker'
import { CategoryAvatar } from './CategoryAvatar'
import { EmptyState } from './EmptyState'

export type EditorResult = 'created' | 'updated' | 'deleted'

function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toISODate(d)
}

const LAST_ACCOUNT_KEY = 'capitalis-last-account'

function lastAccountId(): number | null {
  try {
    return Number(localStorage.getItem(LAST_ACCOUNT_KEY)) || null
  } catch {
    return null
  }
}

function rememberAccount(id: number): void {
  try {
    localStorage.setItem(LAST_ACCOUNT_KEY, String(id))
  } catch {
    // Sin almacenamiento: la próxima vez se propone la primera cuenta.
  }
}

const QUICK_DATES = [
  { key: 'today', value: () => todayISO() },
  { key: 'yesterday', value: () => daysAgoISO(1) },
] as const

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Movimiento a editar; sin él, se crea uno nuevo. */
  initial?: Transaction
  /** Cuentas del usuario: cada movimiento pertenece a una. */
  accounts: Account[]
  onDone: (result: EditorResult) => void
  onCreateAccount: () => void
  /** Abre la transferencia dueña de una comisión. */
  onOpenTransfer: (transferId: number) => void
}

export function TransactionEditor({ open, onOpenChange, initial, accounts, onDone, onCreateAccount, onOpenTransfer }: Props) {
  const { t } = useI18n()
  const isDesktop = useMediaQuery('(min-width: 640px)')
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className="gap-0 overflow-hidden data-[side=bottom]:max-h-[92dvh] data-[side=bottom]:rounded-t-xl data-[side=right]:w-full data-[side=right]:sm:max-w-md"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>{initial ? t.editor.editTitle : t.editor.newTitle}</SheetTitle>
          <SheetDescription>
            {initial ? t.editor.editDescription : t.editor.newDescription}
          </SheetDescription>
        </SheetHeader>
        {open &&
          (initial?.transfer_id ? (
            // Las comisiones se editan desde su transferencia.
            <EmptyState
              icon={ArrowLeftRightIcon}
              title={t.editor.feeLocked}
              action={
                <Button size="lg" onClick={() => onOpenTransfer(initial.transfer_id!)}>
                  <ArrowLeftRightIcon />
                  {t.editor.openTransfer}
                </Button>
              }
            />
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={WalletIcon}
              title={t.editor.noAccountsTitle}
              description={t.editor.noAccountsDescription}
              action={
                <Button size="lg" onClick={onCreateAccount}>
                  <PlusIcon />
                  {t.editor.createAccount}
                </Button>
              }
            />
          ) : (
            <EditorForm
              key={initial?.id ?? 'new'}
              initial={initial}
              accounts={accounts}
              onDone={onDone}
              onCancel={() => onOpenChange(false)}
            />
          ))}
      </SheetContent>
    </Sheet>
  )
}

interface FormProps {
  initial?: Transaction
  accounts: Account[]
  onDone: Props['onDone']
  onCancel: () => void
}

function EditorForm({ initial, accounts, onDone, onCancel }: FormProps) {
  const { t } = useI18n()
  const [categories, setCategories] = useState<Category[]>([])
  const [accountId, setAccountId] = useState<number | null>(() => {
    if (initial) return initial.account_id
    const usable = accounts.filter((a) => !a.archived)
    const last = lastAccountId()
    return usable.find((a) => a.id === last)?.id ?? usable[0]?.id ?? null
  })
  const account = accounts.find((a) => a.id === accountId)
  // Una cuota se edita como la compra entera: monto total, fecha de compra y número de cuotas.
  const plan = initial?.installment_plan
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial ? amountToInput(plan?.total_amount ?? initial.amount) : '')
  const [date, setDate] = useState(plan?.purchase_date ?? initial?.date ?? todayISO())
  /** 1 = un solo pago. */
  const [installments, setInstallments] = useState(plan?.installments ?? 1)
  const canSplit = account?.kind === 'credit_card' && type === 'expense'
  const split = canSplit && installments > 1
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category_id ?? null)
  const [description, setDescription] = useState(initial?.description ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => setCategories([]))
  }, [])

  const options = categories.filter((c) => c.type === type)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = parseAmount(amount)
    if (!parsed) {
      setError(t.editor.amountError)
      return
    }
    if (!accountId) {
      setError(t.errors.codes.AccountRequired)
      return
    }
    setError('')
    setSaving(true)
    rememberAccount(accountId)
    const data = {
      type,
      amount: parsed,
      date,
      description: description.trim(),
      category_id: categoryId,
      account_id: accountId,
      installments: split ? installments : null,
    }
    try {
      if (initial) await transactionsApi.update(initial.id, data)
      else await transactionsApi.create(data)
      onDone(initial ? 'updated' : 'created')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.editor.saveError)
      setSaving(false)
    }
  }

  async function remove() {
    if (!initial) return
    try {
      await transactionsApi.remove(initial.id)
      onDone('deleted')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.editor.deleteError)
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      {/* Solo los campos se desplazan; el pie con Guardar queda siempre visible. */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        {plan && (
          <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 type-caption text-muted-foreground">
            <LayersIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {format(t.editor.wholePurchase, { n: plan.installments })}
          </p>
        )}
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={type}
          onValueChange={(v) => {
            if (!v) return
            setType(v as TxType)
            setCategoryId(null)
          }}
          className="w-full"
          aria-label={t.editor.type}
        >
          <ToggleGroupItem
            value="expense"
            className="h-10 flex-1 data-[state=on]:bg-expense/10 data-[state=on]:text-expense"
          >
            <TYPE_ICON.expense />
            {t.common.expense}
          </ToggleGroupItem>
          <ToggleGroupItem value="income" className="h-10 flex-1 data-[state=on]:bg-income/10 data-[state=on]:text-income">
            <TYPE_ICON.income />
            {t.common.income}
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="flex flex-col gap-2">
          <Label htmlFor="tx-account">
            <WalletIcon className="size-4 text-muted-foreground" />
            {t.editor.account}
          </Label>
          <AccountPicker id="tx-account" accounts={accounts} value={accountId} onChange={setAccountId} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="tx-amount">
            <BanknoteIcon className="size-4 text-muted-foreground" />
            {split ? t.editor.totalAmount : t.editor.amount}
          </Label>
          <AmountInput
            id="tx-amount"
            currency={account?.currency}
            autoFocus
            value={amount}
            onChange={setAmount}
            aria-invalid={!!error && !parseAmount(amount)}
          />
          {canSplit && account?.card && (
            <InstallmentsField
              value={installments}
              onChange={setInstallments}
              total={parseAmount(amount)}
              currency={account.currency}
              dueMonth={statementDueMonth(date, account.card.closing_day, account.card.due_day)}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* Fecha nativa: se puede escribir o elegir cualquier día, pasado o futuro. */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="tx-date">
              <CalendarIcon className="size-4 text-muted-foreground" />
              {t.editor.date}
            </Label>
            <div className="flex gap-2">
              <Input
                id="tx-date"
                type="date"
                required
                className="h-9 min-w-0 flex-1"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {QUICK_DATES.map((q) => {
                const value = q.value()
                return (
                  <Button
                    key={q.key}
                    type="button"
                    variant={date === value ? 'secondary' : 'outline'}
                    size="lg"
                    aria-pressed={date === value}
                    onClick={() => setDate(value)}
                  >
                    {t.format[q.key]}
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tx-category">
              <TagIcon className="size-4 text-muted-foreground" />
              {t.editor.category}
            </Label>
            <Select
              value={categoryId === null ? 'none' : String(categoryId)}
              onValueChange={(v) => setCategoryId(v === 'none' ? null : Number(v))}
            >
              <SelectTrigger id="tx-category" className="w-full data-[size=default]:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.common.noCategory}</SelectItem>
                {options.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    <CategoryAvatar color={c.color} icon={c.icon} size="xs" />
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="tx-description">
            <TextIcon className="size-4 text-muted-foreground" />
            {t.editor.description} <span className="font-normal text-muted-foreground">{t.common.optional}</span>
          </Label>
          <Input
            id="tx-description"
            className="h-9"
            maxLength={255}
            placeholder={t.editor.descriptionPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="type-meta text-destructive">
            {error}
          </p>
        )}
      </div>

      <SheetFooter className="shrink-0 flex-row flex-wrap items-center border-t bg-popover px-5 py-4">
        {initial && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="lg" className="mr-auto text-destructive hover:text-destructive">
                <Trash2Icon />
                {t.common.delete}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>{t.editor.deleteTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {plan ? format(t.editor.deleteInstallments, { n: plan.installments }) : t.common.irreversible}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={remove}>
                  {t.common.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button type="button" variant="ghost" size="lg" className={initial ? '' : 'ml-auto'} onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
          {saving ? t.common.saving : t.common.save}
        </Button>
      </SheetFooter>
    </form>
  )
}

const MAX_INSTALLMENTS = 48

/** "En cuotas": interruptor, número de cuotas y "12× R$ 100,00 · primera en la factura de diciembre". */
function InstallmentsField({
  value,
  onChange,
  total,
  currency,
  dueMonth,
}: {
  value: number
  onChange: (n: number) => void
  total: string | null
  currency: string
  /** Mes del vencimiento de la factura en la que entra la primera cuota. */
  dueMonth: string
}) {
  const { t } = useI18n()
  const money = useMoney()
  const on = value > 1
  const clamp = (n: number) => Math.min(MAX_INSTALLMENTS, Math.max(2, n))
  // Igual que el servidor: cuotas iguales y los centavos sobrantes en la primera.
  const base = total ? Math.floor((Number(total) * 100) / value) / 100 : null

  return (
    <div className={cn('mt-1 flex flex-col gap-3 rounded-lg border px-3 py-2.5 transition-colors', on && 'border-primary/40 bg-primary/5')}>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span id="tx-installments-label" className="flex items-center gap-2 type-meta font-medium">
            <LayersIcon className="size-4 text-muted-foreground" aria-hidden />
            {t.editor.installments}
          </span>
          {!on && <span className="block type-caption text-muted-foreground">{t.editor.installmentsHint}</span>}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="tx-installments-label"
          onClick={() => onChange(on ? 1 : 2)}
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
            on ? 'bg-primary' : 'bg-muted-foreground/30',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform',
              on && 'translate-x-5',
            )}
          />
        </button>
      </div>

      {on && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center rounded-lg border bg-card" role="group" aria-label={t.editor.installmentsCount}>
            <Button type="button" variant="ghost" size="icon" aria-label={t.editor.fewer} disabled={value <= 2} onClick={() => onChange(clamp(value - 1))}>
              <MinusIcon />
            </Button>
            <input
              id="tx-installments"
              inputMode="numeric"
              aria-label={t.editor.installmentsCount}
              className="tabular w-10 bg-transparent text-center font-semibold outline-none"
              value={value}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, ''))
                if (n) onChange(clamp(n))
              }}
            />
            <Button type="button" variant="ghost" size="icon" aria-label={t.editor.more} disabled={value >= MAX_INSTALLMENTS} onClick={() => onChange(clamp(value + 1))}>
              <PlusIcon />
            </Button>
          </div>
          <p className="min-w-0 flex-1 type-caption text-muted-foreground" aria-live="polite">
            {base !== null && base > 0 && (
              <span className="tabular font-semibold text-foreground">
                {format(t.editor.installmentsPreview, { n: value, amount: money(base, currency) })}
              </span>
            )}
            {base !== null && base > 0 && ' · '}
            {format(t.editor.firstIn, { month: monthLabel(dueMonth) })}
          </p>
        </div>
      )}
    </div>
  )
}
