import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Transaction } from '@/domain/types'
import { getMessages } from '@/i18n/runtime'
import { TransactionEditor } from './TransactionEditor'

interface EditorContextValue {
  openNew: () => void
  openEdit: (tx: Transaction) => void
  /** Cambia cada vez que se guarda o elimina un movimiento; las páginas lo usan para recargar. */
  revision: number
}

const EditorContext = createContext<EditorContextValue | null>(null)

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function TransactionEditorProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>()
  const [revision, setRevision] = useState(0)

  const openNew = useCallback(() => {
    setEditing(undefined)
    setOpen(true)
  }, [])
  const openEdit = useCallback((tx: Transaction) => {
    setEditing(tx)
    setOpen(true)
  }, [])

  // Atajo de teclado: N abre un movimiento nuevo.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      if (open || isTypingTarget(e.target) || document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return
      e.preventDefault()
      openNew()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, openNew])

  const value = useMemo(() => ({ openNew, openEdit, revision }), [openNew, openEdit, revision])

  return (
    <EditorContext.Provider value={value}>
      {children}
      <TransactionEditor
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onDone={(result) => {
          setOpen(false)
          setRevision((r) => r + 1)
          toast.success(getMessages().editor[result])
        }}
      />
    </EditorContext.Provider>
  )
}

export function useTransactionEditor(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useTransactionEditor debe usarse dentro de TransactionEditorProvider')
  return ctx
}
