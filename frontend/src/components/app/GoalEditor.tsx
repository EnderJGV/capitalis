import { useState, type FormEvent } from 'react'
import { ArrowLeftIcon, CalendarIcon, CheckIcon, Loader2Icon, Trash2Icon } from 'lucide-react'
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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/context/AuthContext'
import type { Goal, GoalKind } from '@/domain/types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { addMonthsISO, GOAL_TEMPLATES, monthlyNeeded, monthsLeft, type GoalTemplate } from '@/lib/goals'
import { cn } from '@/lib/utils'
import { goalsApi } from '@/services/api'
import { capitalize, monthLabel, todayISO, useMoney } from '@/utils/format'
import { AmountInput, amountToInput, parseAmount, parseAmountOrZero } from './AmountInput'
import { ColorSwatchPicker } from './ColorSwatchPicker'
import { CurrencyPicker } from './CurrencyPicker'
import { EmojiPicker } from './EmojiPicker'
import { ProgressRing } from './ProgressRing'

export type GoalEditorResult = 'created' | 'updated' | 'deleted'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Objetivo a editar; sin él, se crea uno nuevo empezando por una plantilla. */
  initial?: Goal
  onDone: (result: GoalEditorResult) => void
}

export function GoalEditor({ open, onOpenChange, initial, onDone }: Props) {
  const isDesktop = useMediaQuery('(min-width: 640px)')
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className="gap-0 overflow-hidden data-[side=bottom]:max-h-[92dvh] data-[side=bottom]:rounded-t-xl data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
      >
        {open && <Body key={initial?.id ?? 'new'} initial={initial} onDone={onDone} onCancel={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function Body({ initial, onDone, onCancel }: { initial?: Goal; onDone: Props['onDone']; onCancel: () => void }) {
  const [template, setTemplate] = useState<GoalTemplate | null>(null)
  if (!initial && !template) return <TemplateStep onPick={setTemplate} />
  return (
    <DetailsStep
      initial={initial}
      template={template}
      onChangeTemplate={initial ? undefined : () => setTemplate(null)}
      onDone={onDone}
      onCancel={onCancel}
    />
  )
}

/* ---------- Paso 1: plantilla ---------- */

function TemplateStep({ onPick }: { onPick: (template: GoalTemplate) => void }) {
  const { t } = useI18n()
  const groups: { kind: GoalKind; label: string }[] = [
    { kind: 'material', label: t.goalEditor.materialGroup },
    { kind: 'personal', label: t.goalEditor.personalGroup },
  ]
  return (
    <>
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle>{t.goalEditor.pickTitle}</SheetTitle>
        <SheetDescription>{t.goalEditor.pickDescription}</SheetDescription>
      </SheetHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        {groups.map((g) => (
          <section key={g.kind} aria-label={g.label}>
            <h3 className="mb-2 px-0.5 type-caption font-semibold text-muted-foreground">{g.label}</h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GOAL_TEMPLATES.filter((tpl) => tpl.kind === g.kind).map((tpl) => (
                <li key={tpl.key}>
                  <button
                    type="button"
                    onClick={() => onPick(tpl)}
                    className="flex h-full w-full flex-col items-center gap-2 rounded-xl border bg-card px-2 py-3.5 text-center transition-colors outline-none hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/40"
                  >
                    <span
                      className="flex size-12 items-center justify-center rounded-xl text-2xl"
                      style={{ background: `color-mix(in oklab, ${tpl.color} 16%, transparent)` }}
                      aria-hidden
                    >
                      {tpl.icon}
                    </span>
                    <span className="type-caption leading-tight font-semibold">{t.goalEditor.templates[tpl.key]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}

/* ---------- Paso 2: datos ---------- */

function DetailsStep({
  initial,
  template,
  onChangeTemplate,
  onDone,
  onCancel,
}: {
  initial?: Goal
  template: GoalTemplate | null
  onChangeTemplate?: () => void
  onDone: Props['onDone']
  onCancel: () => void
}) {
  const { t } = useI18n()
  const { user } = useAuth()
  const money = useMoney()

  const [name, setName] = useState(initial?.name ?? (template ? t.goalEditor.templates[template.key] : ''))
  const [kind] = useState<GoalKind>(initial?.kind ?? template?.kind ?? 'personal')
  const [icon, setIcon] = useState(initial?.icon ?? template?.icon ?? '')
  const [color, setColor] = useState(initial?.color ?? template?.color ?? '#3E9A55')
  const [target, setTarget] = useState(initial ? amountToInput(initial.target_amount) : '')
  const [currency, setCurrency] = useState(initial?.currency ?? user?.currency ?? 'USD')
  const [deadline, setDeadline] = useState(initial?.target_date ?? '')
  const [saved, setSaved] = useState('')
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const parsedTarget = parseAmount(target)
  const alreadySaved = initial ? Number(initial.saved) : Number(parseAmountOrZero(saved) ?? 0)
  const missing = parsedTarget ? Math.max(0, Number(parsedTarget) - alreadySaved) : null
  const SHORTCUTS = [
    { label: t.goalEditor.months6, months: 6 },
    { label: t.goalEditor.year1, months: 12 },
    { label: t.goalEditor.years2, months: 24 },
  ]

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError(t.goalEditor.nameError)
    if (!parsedTarget) return setError(t.editor.amountError)
    const initialAmount = parseAmountOrZero(saved)
    if (initialAmount === null) return setError(t.editor.amountError)
    setError('')
    setBusy(true)
    const data = {
      name: name.trim(),
      kind,
      icon,
      color,
      target_amount: parsedTarget,
      currency,
      target_date: deadline || null,
      note: note.trim(),
      initial_amount: !initial && Number(initialAmount) > 0 ? initialAmount : null,
    }
    try {
      if (initial) await goalsApi.update(initial.id, data)
      else await goalsApi.create(data)
      onDone(initial ? 'updated' : 'created')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.goalEditor.saveError)
      setBusy(false)
    }
  }

  async function remove() {
    if (!initial) return
    try {
      await goalsApi.remove(initial.id)
      onDone('deleted')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.goalEditor.saveError)
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle>{initial ? t.goalEditor.editTitle : t.goalEditor.newTitle}</SheetTitle>
        <SheetDescription>{t.goalEditor.detailsDescription}</SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
          <ProgressRing percent={initial?.percent ?? 0} color={color} size={52} stroke={5}>
            <span className="text-xl leading-none" aria-hidden>
              {icon}
            </span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{name || t.goalEditor.newTitle}</p>
            <p className="type-caption text-muted-foreground">{t.goals.kinds[kind]}</p>
          </div>
          {onChangeTemplate && (
            <Button type="button" variant="ghost" size="sm" onClick={onChangeTemplate}>
              <ArrowLeftIcon />
              {t.goalEditor.change}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="goal-name">{t.goalEditor.name}</Label>
          <Input
            id="goal-name"
            className="h-11 sm:h-10"
            maxLength={80}
            required
            placeholder={t.goalEditor.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-target">{t.goalEditor.target}</Label>
            <AmountInput id="goal-target" currency={currency} value={target} onChange={setTarget} autoFocus={!initial} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-currency">{t.goalEditor.currency}</Label>
            <CurrencyPicker id="goal-currency" value={currency} suggested={[user?.currency ?? 'USD']} onChange={setCurrency} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="goal-deadline">
            <CalendarIcon className="size-4 text-muted-foreground" />
            {t.goalEditor.deadline} <span className="font-normal text-muted-foreground">({t.goalEditor.optional})</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="goal-deadline"
              type="date"
              min={initial ? undefined : todayISO()}
              className="h-9 min-w-40 flex-1"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            {SHORTCUTS.map((s) => {
              const value = addMonthsISO(s.months)
              return (
                <Button
                  key={s.months}
                  type="button"
                  size="lg"
                  variant={deadline === value ? 'secondary' : 'outline'}
                  aria-pressed={deadline === value}
                  onClick={() => setDeadline(value)}
                >
                  {s.label}
                </Button>
              )
            })}
            {deadline && (
              <Button type="button" size="lg" variant="ghost" onClick={() => setDeadline('')}>
                {t.goalEditor.noDeadline}
              </Button>
            )}
          </div>
          {/* Cuánto ahorrar por mes, en vivo */}
          <p
            aria-live="polite"
            className={cn(
              'rounded-lg px-3 py-2 type-caption',
              deadline && missing ? 'bg-primary/8 font-medium text-foreground' : 'bg-muted/60 text-muted-foreground',
            )}
          >
            {!deadline
              ? t.goalEditor.previewNoDate
              : missing === null
                ? t.goalEditor.previewNoDate
                : missing === 0
                  ? t.goalEditor.previewReached
                  : format(t.goalEditor.previewMonthly, {
                      month: capitalize(monthLabel(deadline.slice(0, 7))),
                      amount: money(monthlyNeeded(missing, monthsLeft(deadline)), currency),
                    })}
          </p>
        </div>

        {!initial && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="goal-saved">
              {t.goalEditor.alreadySaved} <span className="font-normal text-muted-foreground">({t.goalEditor.optional})</span>
            </Label>
            <AmountInput id="goal-saved" currency={currency} value={saved} onChange={setSaved} />
            <p className="type-caption text-muted-foreground">{t.goalEditor.alreadySavedHint}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>{t.goalEditor.emoji}</Label>
          <EmojiPicker value={icon} onChange={setIcon} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t.goalEditor.color}</Label>
          <ColorSwatchPicker value={color} onChange={setColor} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="goal-note">
            {t.goalEditor.note} <span className="font-normal text-muted-foreground">({t.goalEditor.optional})</span>
          </Label>
          <Input id="goal-note" className="h-9" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} />
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
                <AlertDialogTitle>{format(t.goalEditor.deleteTitle, { name: initial.name })}</AlertDialogTitle>
                <AlertDialogDescription>{t.goalEditor.deleteDescription}</AlertDialogDescription>
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
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
          {busy ? t.common.saving : t.common.save}
        </Button>
      </SheetFooter>
    </form>
  )
}
