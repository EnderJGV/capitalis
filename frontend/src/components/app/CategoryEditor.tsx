import { useState, type FormEvent } from 'react'
import { ArrowLeftRightIcon, CheckIcon, PaletteIcon, SmileIcon, TagIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Category, CategoryInput, TxType } from '@/domain/types'
import { DEFAULT_CATEGORY_COLOR } from '@/lib/palette'
import { useI18n } from '@/i18n/I18nProvider'
import { TYPE_ICON } from '@/lib/icons'
import { CategoryAvatar } from './CategoryAvatar'
import { ColorSwatchPicker } from './ColorSwatchPicker'
import { EmojiPicker } from './EmojiPicker'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Category
  /** Tipo preseleccionado al crear desde una sección concreta. */
  defaultType?: TxType
  onSubmit: (data: CategoryInput) => Promise<void>
}

export function CategoryEditor({ open, onOpenChange, initial, defaultType = 'expense', onSubmit }: Props) {
  const { t } = useI18n()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? t.categoryEditor.editTitle : t.categoryEditor.newTitle}</DialogTitle>
          <DialogDescription>{t.categoryEditor.description}</DialogDescription>
        </DialogHeader>
        {open && (
          <CategoryForm
            key={initial?.id ?? 'new'}
            initial={initial}
            defaultType={defaultType}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface FormProps {
  initial?: Category
  defaultType: TxType
  onSubmit: Props['onSubmit']
  onCancel: () => void
}

function CategoryForm({ initial, defaultType, onSubmit, onCancel }: FormProps) {
  const { t } = useI18n()
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<TxType>(initial?.type ?? defaultType)
  const [color, setColor] = useState(initial?.color ?? DEFAULT_CATEGORY_COLOR)
  const [icon, setIcon] = useState(initial?.icon ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError(t.categoryEditor.nameRequired)
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), type, color, icon })
    } catch (err) {
      setError(err instanceof Error ? err.message : t.categoryEditor.saveError)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="cat-name">
          <TagIcon className="size-4 text-muted-foreground" />
          {t.categoryEditor.name}
        </Label>
        <div className="flex items-center gap-2">
          {/* Vista previa de cómo se verá la categoría en las listas. */}
          <CategoryAvatar color={color} icon={icon} />
          <Input
            id="cat-name"
            className="h-9 flex-1"
            autoFocus
            maxLength={60}
            placeholder={t.categoryEditor.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cat-icon">
          <SmileIcon className="size-4 text-muted-foreground" />
          {t.categoryEditor.emoji} <span className="font-normal text-muted-foreground">{t.common.optional}</span>
        </Label>
        <EmojiPicker id="cat-icon" value={icon} onChange={setIcon} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>
          <ArrowLeftRightIcon className="size-4 text-muted-foreground" />
          {t.categoryEditor.type}
        </Label>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={type}
          onValueChange={(v) => v && setType(v as TxType)}
          className="w-full"
          aria-label={t.categoryEditor.typeAria}
        >
          <ToggleGroupItem value="expense" className="h-9 flex-1 data-[state=on]:bg-expense/10 data-[state=on]:text-expense">
            <TYPE_ICON.expense />
            {t.common.expense}
          </ToggleGroupItem>
          <ToggleGroupItem value="income" className="h-9 flex-1 data-[state=on]:bg-income/10 data-[state=on]:text-income">
            <TYPE_ICON.income />
            {t.common.income}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cat-color">
          <PaletteIcon className="size-4 text-muted-foreground" />
          {t.categoryEditor.color}
        </Label>
        <ColorSwatchPicker id="cat-color" value={color} onChange={setColor} />
      </div>

      {error && (
        <p role="alert" className="type-meta text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          <CheckIcon />
          {saving ? t.common.saving : t.common.save}
        </Button>
      </DialogFooter>
    </form>
  )
}
