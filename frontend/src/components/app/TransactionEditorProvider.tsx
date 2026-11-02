import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Account, Transaction, Transfer } from '@/domain/types'
import { getMessages } from '@/i18n/runtime'
import { accountsApi, transfersApi } from '@/services/api'
import { AccountEditor } from './AccountEditor'
import { TransactionEditor } from './TransactionEditor'
import { TransferEditor } from './TransferEditor'

interface QuickActionsValue {
  /** Cuentas del usuario (incluidas las archivadas); null mientras cargan. */
  accounts: Account[] | null
  openNew: () => void
  openEdit: (tx: Transaction) => void
  openTransfer: (options?: { fromAccountId?: number }) => void
  openEditTransfer: (transfer: Transfer) => void
  openAccount: (account?: Account) => void
  /** Cambia cada vez que se guarda o elimina algo; las páginas lo usan para recargar. */
  revision: number
}

const QuickActionsContext = createContext<QuickActionsValue | null>(null)

type Panel =
  | { kind: 'transaction'; initial?: Transaction }
  | { kind: 'transfer'; initial?: Transfer; fromAccountId?: number }
  | { kind: 'account'; initial?: Account }
  | null

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Editores de movimiento, transferencia y cuenta, disponibles desde cualquier pantalla. */
export function TransactionEditorProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<Panel>(null)
  const [revision, setRevision] = useState(0)
  const [accounts, setAccounts] = useState<Account[] | null>(null)

  useEffect(() => {
    accountsApi
      .list(true)
      .then(setAccounts)
      .catch(() => setAccounts([]))
  }, [revision])

  const openNew = useCallback(() => setPanel({ kind: 'transaction' }), [])
  const openEdit = useCallback((tx: Transaction) => setPanel({ kind: 'transaction', initial: tx }), [])
  const openTransfer = useCallback(
    (options?: { fromAccountId?: number }) => setPanel({ kind: 'transfer', fromAccountId: options?.fromAccountId }),
    [],
  )
  const openEditTransfer = useCallback((transfer: Transfer) => setPanel({ kind: 'transfer', initial: transfer }), [])
  const openAccount = useCallback((account?: Account) => setPanel({ kind: 'account', initial: account }), [])

  // Atajos: N, movimiento nuevo; T, transferencia nueva.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const key = e.key.toLowerCase()
      if (key !== 'n' && key !== 't') return
      if (panel || isTypingTarget(e.target) || document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return
      e.preventDefault()
      if (key === 'n') openNew()
      else openTransfer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, openNew, openTransfer])

  const done = useCallback((message: string) => {
    setPanel(null)
    setRevision((r) => r + 1)
    toast.success(message)
  }, [])

  const openTransferById = useCallback(async (transferId: number) => {
    const all = await transfersApi.list({})
    const found = all.find((tr) => tr.id === transferId)
    if (found) setPanel({ kind: 'transfer', initial: found })
  }, [])

  const close = (open: boolean) => !open && setPanel(null)

  const value = useMemo(
    () => ({ accounts, openNew, openEdit, openTransfer, openEditTransfer, openAccount, revision }),
    [accounts, openNew, openEdit, openTransfer, openEditTransfer, openAccount, revision],
  )

  return (
    <QuickActionsContext.Provider value={value}>
      {children}
      <TransactionEditor
        open={panel?.kind === 'transaction'}
        onOpenChange={close}
        initial={panel?.kind === 'transaction' ? panel.initial : undefined}
        accounts={accounts ?? []}
        onDone={(result) => done(getMessages().editor[result])}
        onCreateAccount={() => openAccount()}
        onOpenTransfer={(id) => void openTransferById(id)}
      />
      <TransferEditor
        open={panel?.kind === 'transfer'}
        onOpenChange={close}
        accounts={accounts ?? []}
        initial={panel?.kind === 'transfer' ? panel.initial : undefined}
        defaultFromId={panel?.kind === 'transfer' ? panel.fromAccountId : undefined}
        onDone={(result) => done(getMessages().transfer[result])}
        onCreateAccount={() => openAccount()}
      />
      <AccountEditor
        open={panel?.kind === 'account'}
        onOpenChange={close}
        initial={panel?.kind === 'account' ? panel.initial : undefined}
        onDone={(result) => done(getMessages().accounts[result])}
      />
    </QuickActionsContext.Provider>
  )
}

export function useTransactionEditor(): QuickActionsValue {
  const ctx = useContext(QuickActionsContext)
  if (!ctx) throw new Error('useTransactionEditor debe usarse dentro de TransactionEditorProvider')
  return ctx
}

/** Alias con un nombre más fiel: además de movimientos, abre transferencias y cuentas. */
export const useQuickActions = useTransactionEditor
