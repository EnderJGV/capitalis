import { useMemo } from 'react'
import { PartyPopperIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Goal } from '@/domain/types'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { useMoney } from '@/utils/format'

interface Props {
  goal: Goal | null
  onKeepSaving: () => void
  onMarkAchieved: (goal: Goal) => void
}

const COLORS = ['#3E9A55', '#3F74C4', '#C0508F', '#B57A12', '#7E62C6', '#D0583F']

/** Confeti en CSS puro: desaparece solo si la persona pidió "reducir movimiento". */
function Confetti({ color }: { color: string }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: Math.round(((i * 37) % 100) + (i % 3)),
        delay: (i % 7) * 0.12,
        duration: 1.8 + (i % 5) * 0.25,
        color: i % 4 === 0 ? color : COLORS[i % COLORS.length],
        rotate: (i * 47) % 360,
      })),
    [color],
  )
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
      <style>{`@keyframes goal-confetti { 0% { transform: translateY(-20px) rotate(0); opacity: 1 } 100% { transform: translateY(320px) rotate(540deg); opacity: 0 } }`}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block h-2.5 w-1.5 rounded-[1px]"
          style={{
            left: `${Math.min(97, p.left)}%`,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `goal-confetti ${p.duration}s ${p.delay}s ease-in both`,
          }}
        />
      ))}
    </div>
  )
}

/** "¡Lo lograste!": aparece una sola vez, cuando un aporte hace que el objetivo llegue a la meta. */
export function GoalCelebration({ goal, onKeepSaving, onMarkAchieved }: Props) {
  const { t } = useI18n()
  const money = useMoney()
  return (
    <Dialog open={!!goal} onOpenChange={(open) => !open && onKeepSaving()}>
      <DialogContent className="overflow-hidden text-center sm:max-w-sm">
        {goal && <Confetti color={goal.color} />}
        <DialogHeader className="items-center gap-3 text-center sm:text-center">
          <span className="relative flex size-16 items-center justify-center rounded-full text-3xl" style={{ background: goal ? `color-mix(in oklab, ${goal.color} 18%, transparent)` : undefined }} aria-hidden>
            {goal?.icon || <PartyPopperIcon className="size-7" />}
          </span>
          <DialogTitle className="type-title">{t.goals.celebration.title}</DialogTitle>
          <DialogDescription>
            {goal && format(t.goals.celebration.message, { name: goal.name, amount: money(goal.target_amount, goal.currency) })}
          </DialogDescription>
        </DialogHeader>
        <p className="type-caption text-muted-foreground">{t.goals.celebration.hint}</p>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" size="lg" onClick={onKeepSaving}>
            {t.goals.celebration.keep}
          </Button>
          <Button size="lg" onClick={() => goal && onMarkAchieved(goal)}>
            {t.goals.detail.markAchieved}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
