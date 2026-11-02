import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PencilIcon, PlusIcon, TagsIcon, Trash2Icon } from 'lucide-react'
import { CategoryAvatar } from '@/components/app/CategoryAvatar'
import { CategoryEditor } from '@/components/app/CategoryEditor'
import { EmptyState } from '@/components/app/EmptyState'
import { PageHeader } from '@/components/app/PageHeader'
import { SectionTitle } from '@/components/app/StatCard'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Category, CategoryInput, TxType } from '@/domain/types'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { TYPE_ICON } from '@/lib/icons'
import { categoriesApi } from '@/services/api'

const GROUPS: { type: TxType; title: 'expenses' | 'incomes' }[] = [
  { type: 'expense', title: 'expenses' },
  { type: 'income', title: 'incomes' },
]

interface EditorState {
  open: boolean
  initial?: Category
  defaultType: TxType
}

export default function Categories() {
  const { t } = useI18n()
  const [items, setItems] = useState<Category[] | null>(null)
  const [editor, setEditor] = useState<EditorState>({ open: false, defaultType: 'expense' })
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    categoriesApi
      .list()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  async function save(data: CategoryInput) {
    if (editor.initial) await categoriesApi.update(editor.initial.id, data)
    else await categoriesApi.create(data)
    setEditor((s) => ({ ...s, open: false }))
    toast.success(editor.initial ? t.categories.updated : t.categories.created)
    load()
  }

  async function remove(category: Category) {
    try {
      await categoriesApi.remove(category.id)
      toast.success(t.categories.deleted)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.categories.deleteError)
    } finally {
      setToDelete(null)
    }
  }

  return (
    <>
      <PageHeader title={t.categories.title}>
        <Button size="lg" onClick={() => setEditor({ open: true, defaultType: 'expense' })}>
          <PlusIcon />
          {t.categories.new}
        </Button>
      </PageHeader>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 type-meta text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {GROUPS.map((g) => {
          const list = items?.filter((c) => c.type === g.type)
          return (
            <section key={g.type} aria-labelledby={`group-${g.type}`} className="flex min-w-0 flex-col">
              <SectionTitle
                id={`group-${g.type}`}
                icon={TYPE_ICON[g.type]}
                action={list && <span className="type-meta text-muted-foreground">{list.length}</span>}
              >
                {t.common[g.title]}
              </SectionTitle>

              {!list ? (
                <div className="flex-1 divide-y rounded-xl border bg-card">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <Skeleton className="size-4 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              ) : list.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-xl border bg-card">
                  <EmptyState
                    icon={TagsIcon}
                    title={format(t.categories.emptyGroup, { group: t.common[g.title].toLowerCase() })}
                    action={
                      <Button variant="outline" size="lg" onClick={() => setEditor({ open: true, defaultType: g.type })}>
                        <PlusIcon />
                        {t.categories.createOne}
                      </Button>
                    }
                  />
                </div>
              ) : (
                <ul className="flex-1 divide-y overflow-hidden rounded-xl border bg-card">
                  {list.map((c) => (
                    <li key={c.id} className="flex min-w-0 items-center gap-3 py-2 pr-2 pl-4 transition-colors hover:bg-muted/40">
                      <CategoryAvatar color={c.color} icon={c.icon} />
                      <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={format(t.categories.editAria, { name: c.name })}
                        onClick={() => setEditor({ open: true, initial: c, defaultType: c.type })}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={format(t.categories.deleteAria, { name: c.name })}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setToDelete(c)}
                      >
                        <Trash2Icon />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      <CategoryEditor
        open={editor.open}
        onOpenChange={(open) => setEditor((s) => ({ ...s, open }))}
        initial={editor.initial}
        defaultType={editor.defaultType}
        onSubmit={save}
      />

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{format(t.categories.deleteTitle, { name: toDelete?.name ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t.common.irreversible}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => toDelete && remove(toDelete)}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
