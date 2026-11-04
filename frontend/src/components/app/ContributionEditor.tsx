import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDownToLineIcon, ArrowUpFromLineIcon, CalendarIcon, CheckIcon, Loader2Icon, TargetIcon, Trash2Icon, WalletIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
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
import type { Account, ContributionResult, Goal, GoalContribution } from '@/domain/types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { isOpen } from '@/lib/goals'
import { goalsApi } from '@/services/api'
import { toISODate, todayISO, useMoney } from '@/utils/format'
import { AccountPicker } from './AccountPicker'
import { AmountInput, amountToInput, parseAmount } from './AmountInput'
import { EmptyState } from './EmptyState'

export type ContributionEditorResult = 'created' | 'withdrawn' | 'updated' | 'deleted'

export interface ContributionTarget {
  /** Objetivo al que aportar; sin él se elige de la lista de objetivos abiertos. */
  goal?: Goal
  /** Aporte a editar. */
  initial?: GoalContribution
  /** Abrir directamente en "Retiro". */
  withdraw?: boolean
}

interface Props extends ContributionTarget {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  onDone: (kind: ContributionEditorResult, result: ContributionResult) => void
  onCreateGoal: () => void
}

export function ContributionEditor({ open, onOpenChange, goal, initial, withdraw, accounts, onDone, onCreateGoal }: Props) {
  const { t } = useI18n()
  const isDesktop = useMediaQuery('(min-width: 640px)')
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className="gap-0 overflow-hidden data-[side=bottom]:max-h-[92dvh] data-[side=bottom]:rounded-t-xl data-[side=right]:w-full data-[side=right]:sm:max-w-md"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>
            {initial ? t.contributionEditor.editTitle : withdraw ? t.contributionEditor.withdrawTitle : t.contributionEditor.depositTitle}
          </SheetTitle>
          <SheetDescription>{t.contributionEditor.description}</SheetDescription>
        </SheetHeader>
        {open && (
          <Form
            key={`${goal?.id ?? 'any'}-${initial?.id ?? 'new'}-${withdraw ? 'w' : 'd'}`}
            goal={goal}
            initial={initial}
            withdraw={withdraw}
            accounts={accounts}
            onDone={onDone}
            onCancel={() => onOpenChange(false)}
            onCreateGoal={onCreateGoal}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

type FormProps = Omit<Props, 'open' | 'onOpenChange'> & { onCancel: () => void }

function Form({ goal: given, initial, withdraw, accounts, onDone, onCancel, onCreateGoal }: FormProps) {
  const { t } = useI18n()
  const money = useMoney()
  const [options, setOptions] = useState<Goal[] | null>(given ? [given] : null)
  const [goalId, setGoalId] = useState<number | null>(given?.id ?? null)
  const [mode, setMode] = useState<'deposit' | 'withdraw'>(initial ? (Number(initial.amount) < 0 ? 'withdraw' : 'deposit') : withdraw ? 'withdraw' : 'deposit')
  const [amount, setAmount] = useState(initial ? amountToInput(String(Math.abs(Number(initial.amount)))) : '')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [accountId, setAccountId] = useState<number | null>(initial?.account_id ?? null)
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Sin objetivo dado, se ofrecen los abiertos (activos y cumplidos).
  useEffect(() => {
    if (given) return
    goalsApi
      .list()
      .then((list) => {
        const open = list.filter(isOpen)
        setOptions(open)
        setGoalId((current) => current ?? open[0]?.id ?? null)
      })
      .catch(() => setOptions([]))
  }, [given])

  if (options && options.length === 0) {
    return (
      <EmptyState
        icon={TargetIcon}
        title={t.contributionEditor.noGoals}
        action={
          <Button size="lg" onClick={onCreateGoal}>
            {t.goals.new}
          </Button>
        }
      />
    )
  }

  const goal = options?.find((g) => g.id === goalId)
  const parsed = parseAmount(amount)
  const signed = parsed ? (mode === 'withdraw' ? -Number(parsed) : Number(parsed)) : 0
  // Lo ahorrado sin este aporte (al editar, se descuenta el original).
  const base = goal ? Number(goal.saved) - (initial?.goal_id === goal.id ? Number(initial.amount) : 0) : 0
  const after = base + signed
  const tooLarge = mode === 'withdraw' && after < 0
  const percent = goal ? Math.min(100, Math.max(0, Math.floor((after / Number(goal.target_amount)) * 100))) : 0
  const missing = goal ? Math.max(0, Number(goal.target_amount) - after) : 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!goal) return
    if (!parsed) return setError(t.editor.amountError)
    if (tooLarge) return setError(t.contributionEditor.tooLarge)
    setError('')
    setBusy(true)
    const data = { amount: signed.toFixed(2), date, note: note.trim(), account_id: accountId }
    try {
      const result = initial
        ? await goalsApi.updateContribution(goal.id, initial.id, data)
        : await goalsApi.addContribution(goal.id, data)
      onDone(initial ? 'updated' : mode === 'withdraw' ? 'withdrawn' : 'created', result)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.contributionEditor.saveError)
      setBusy(false)
    }
  }

  async function remove() {
    if (!initial || !goal) return
    try {
      onDone('deleted', await goalsApi.removeContribution(goal.id, initial.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t.contributionEditor.saveError)
    }
  }

  const yesterday = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return toISODate(d)
  })()

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={mode}
          onValueChange={(v) => v && setMode(v as 'deposit' | 'withdraw')}
          className="w-full"
          aria-label={t.editor.type}
        >
          <ToggleGroupItem value="deposit" className="h-10 flex-1 data-[state=on]:bg-income/10 data-[state=on]:text-income">
            <ArrowDownToLineIcon />
            {t.contributionEditor.deposit}
          </ToggleGroupItem>
          <ToggleGroupItem value="withdraw" className="h-10 flex-1 data-[state=on]:bg-expense/10 data-[state=on]:text-expense">
            <ArrowUpFromLineIcon />
            {t.contributionEditor.withdraw}
          </ToggleGroupItem>
        </ToggleGroup>

        {!given && options && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="contribution-goal">
              <TargetIcon className="size-4 text-muted-foreground" />
              {t.contributionEditor.goal}
            </Label>
            <Select value={String(goalId ?? '')} onValueChange={(v) => setGoalId(Number(v))}>
              <SelectTrigger id="contribution-goal" className="w-full data-[size=default]:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    <span aria-hidden>{g.icon}</span> {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="contribution-amount">{t.contributionEditor.amount}</Label>
          <AmountInput
            id="contribution-amount"
            currency={goal?.currency}
            autoFocus
            value={amount}
            onChange={setAmount}
            aria-invalid={tooLarge}
          />
          {goal && (
            <p aria-live="polite" className={tooLarge ? 'type-caption text-destructive' : 'tabular type-caption text-muted-foreground'}>
              {mode === 'withdraw' && (!parsed || !tooLarge)
                ? format(t.contributionEditor.maxWithdraw, { amount: money(Math.max(0, base), goal.currency) })
                : tooLarge
                  ? t.contributionEditor.tooLarge
                  : after >= Number(goal.target_amount)
                    ? t.contributionEditor.afterReached
                    : format(t.contributionEditor.afterDeposit, { percent, amount: money(missing, goal.currency) })}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="contribution-date">
            <CalendarIcon className="size-4 text-muted-foreground" />
            {t.contributionEditor.date}
          </Label>
          <div className="flex gap-2">
            <Input id="contribution-date" type="date" required className="h-9 min-w-0 flex-1" value={date} onChange={(e) => setDate(e.target.value)} />
            {[
              { label: t.format.today, value: todayISO() },
              { label: t.format.yesterday, value: yesterday },
            ].map((q) => (
              <Button key={q.value} type="button" size="lg" variant={date === q.value ? 'secondary' : 'outline'} aria-pressed={date === q.value} onClick={() => setDate(q.value)}>
                {q.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="contribution-account">
            <WalletIcon className="size-4 text-muted-foreground" />
            {t.contributionEditor.account} <span className="font-normal text-muted-foreground">{t.common.optional}</span>
          </Label>
          <AccountPicker
            id="contribution-account"
            accounts={accounts.filter((a) => a.kind !== 'credit_card')}
            value={accountId}
            onChange={setAccountId}
            placeholder={t.contributionEditor.noAccount}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="contribution-note">
            {t.contributionEditor.note} <span className="font-normal text-muted-foreground">{t.common.optional}</span>
          </Label>
          <Input id="contribution-note" className="h-9" maxLength={255} placeholder={t.contributionEditor.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
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
                <AlertDialogTitle>{t.contributionEditor.deleteTitle}</AlertDialogTitle>
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
        <Button type="submit" size="lg" disabled={busy || !goal}>
          {busy ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
          {busy ? t.common.saving : t.common.save}
        </Button>
      </SheetFooter>
    </form>
  )
}
