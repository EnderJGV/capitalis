import { BanIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'

/** 31 emojis sugeridos + "sin emoji" = grilla completa de 4×8. También se puede escribir cualquier otro. */
const SUGGESTED = [
  '🛒', '🍔', '☕', '🍽️', '🏠', '💡', '💧', '📱',
  '🚌', '🚗', '⛽', '✈️', '💊', '🏥', '🏋️', '🎓',
  '📚', '🎉', '🎬', '🎮', '👕', '🎁', '🐶', '👶',
  '💳', '🧾', '📦', '🔧', '💼', '💰', '📈',
]

interface Props {
  value: string
  onChange: (emoji: string) => void
  id?: string
}

export function EmojiPicker({ value, onChange, id }: Props) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-2">
      <div id={id} role="radiogroup" aria-label={t.categoryEditor.emoji} className="grid grid-cols-8 gap-1">
        <button
          type="button"
          role="radio"
          aria-checked={value === ''}
          aria-label={t.categoryEditor.noEmoji}
          title={t.categoryEditor.noEmoji}
          onClick={() => onChange('')}
          className={cn(
            'flex aspect-square items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
            value === '' && 'bg-accent ring-2 ring-primary',
          )}
        >
          <BanIcon className="size-4" />
        </button>
        {SUGGESTED.map((emoji) => (
          <button
            key={emoji}
            type="button"
            role="radio"
            aria-checked={value === emoji}
            aria-label={emoji}
            onClick={() => onChange(emoji)}
            className={cn(
              'flex aspect-square items-center justify-center rounded-lg text-xl transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
              value === emoji && 'bg-accent ring-2 ring-primary',
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
      <Input
        aria-label={t.categoryEditor.otherEmoji}
        placeholder={t.categoryEditor.otherEmojiPlaceholder}
        className="h-9"
        maxLength={8}
        value={SUGGESTED.includes(value) ? '' : value}
        onChange={(e) => onChange(e.target.value.trim())}
      />
    </div>
  )
}
