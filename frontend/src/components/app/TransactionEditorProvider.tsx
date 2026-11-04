import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Account, Goal, Transaction, Transfer } from '@/domain/types'
import { getMessages } from '@/i18n/runtime'
import { accountsApi, goalsApi, transactionsApi, transfersApi } from '@/services/api'
import { AccountEditor } from './AccountEditor'
import { CardEditor } from './CardEditor'
import { ContributionEditor, type ContributionTarget } from './ContributionEditor'
import { GoalCelebration } from './GoalCelebration'
import { GoalEditor } from './GoalEditor'
import { TransactionEditor, type ExpensePreset } from './TransactionEditor'
import { TransferEditor, type TransferPreset } from './TransferEditor'

interface QuickActionsValue {
  /** Cuentas del usuario (incluidas las archivadas); null mientras cargan. */
  accounts: Account[] | null
  openNew: () => void
  openEdit: (tx: Transaction) => void
  /** Transferencia nueva, opcionalmente ya completada (p. ej., el pago de una factura). */
  openTransfer: (preset?: TransferPreset) => void
  openEditTransfer: (transfer: Transfer) => void
  /** Editor de cuenta; si la cuenta es una tarjeta, abre el de tarjeta. */
  openAccount: (account?: Account) => void
  openCard: (card?: Account) => void
  /** Editor de objetivo: sin argumento crea uno nuevo desde una plantilla. */
  openGoal: (goal?: Goal) => void
  /** Aporte o retiro de un objetivo; sin objetivo, se elige de la lista. */
  openContribution: (target?: ContributionTarget) => void
  /** Gasto nuevo ya completado. */
  openExpense: (preset: ExpensePreset) => void
  /** Cambia cada vez que se guarda o elimina algo; las páginas lo usan para recargar. */
  revision: number
}

const QuickActionsContext = createContext<QuickActionsValue | null>(null)

type Panel =
  | { kind: 'transaction'; initial?: Transaction; preset?: ExpensePreset }
  | { kind: 'transfer'; initial?: Transfer; preset?: TransferPreset }
  | { kind: 'account'; initial?: Account }
  | { kind: 'card'; initial?: Account }
  | { kind: 'goal'; initial?: Goal }
  | { kind: 'contribution'; target: ContributionTarget }
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
  /** Objetivo que acaba de llegar a la meta: se celebra una sola vez. */
  const [celebrating, setCelebrating] = useState<Goal | null>(null)

  useEffect(() => {
    accountsApi
      .list(true)
      .then(setAccounts)
      .catch(() => setAccounts([]))
  }, [revision])

  const openNew = useCallback(() => setPanel({ kind: 'transaction' }), [])
  const openEdit = useCallback((tx: Transaction) => setPanel({ kind: 'transaction', initial: tx }), [])
  const openTransfer = useCallback((preset?: TransferPreset) => setPanel({ kind: 'transfer', preset }), [])
  const openEditTransfer = useCallback((transfer: Transfer) => setPanel({ kind: 'transfer', initial: transfer }), [])
  const openAccount = useCallback(
    (account?: Account) => setPanel({ kind: account?.kind === 'credit_card' ? 'card' : 'account', initial: account }),
    [],
  )
  const openCard = useCallback((card?: Account) => setPanel({ kind: 'card', initial: card }), [])
  const openGoal = useCallback((goal?: Goal) => setPanel({ kind: 'goal', initial: goal }), [])
  const openContribution = useCallback((target: ContributionTarget = {}) => setPanel({ kind: 'contribution', target }), [])
  const openExpense = useCallback((preset: ExpensePreset) => setPanel({ kind: 'transaction', preset }), [])

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

  const openPurchaseOf = useCallback(async (fee: Transaction) => {
    // La compra y su tarifa tienen la misma cuenta y la misma fecha.
    const sameDay = await transactionsApi.list({ account_id: fee.account_id, start: fee.date, end: fee.date })
    const purchase = sameDay.find((tx) => tx.id === fee.parent_id)
    if (purchase) setPanel({ kind: 'transaction', initial: purchase })
  }, [])

  async function markAchieved(goal: Goal) {
    setCelebrating(null)
    try {
      await goalsApi.setStatus(goal.id, 'achieved')
      setRevision((r) => r + 1)
      toast.success(getMessages().goals.achievedToast)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : getMessages().goalEditor.saveError)
    }
  }

  const close = (open: boolean) => !open && setPanel(null)

  const value = useMemo(
    () => ({ accounts, openNew, openEdit, openTransfer, openEditTransfer, openAccount, openCard, openGoal, openContribution, openExpense, revision }),
    [accounts, openNew, openEdit, openTransfer, openEditTransfer, openAccount, openCard, openGoal, openContribution, openExpense, revision],
  )

  return (
    <QuickActionsContext.Provider value={value}>
      {children}
      <TransactionEditor
        open={panel?.kind === 'transaction'}
        onOpenChange={close}
        initial={panel?.kind === 'transaction' ? panel.initial : undefined}
        preset={panel?.kind === 'transaction' ? panel.preset : undefined}
        accounts={accounts ?? []}
        onDone={(result) => done(getMessages().editor[result])}
        onCreateAccount={() => openAccount()}
        onOpenTransfer={(id) => void openTransferById(id)}
        onOpenPurchase={(fee) => void openPurchaseOf(fee)}
      />
      <TransferEditor
        open={panel?.kind === 'transfer'}
        onOpenChange={close}
        accounts={accounts ?? []}
        initial={panel?.kind === 'transfer' ? panel.initial : undefined}
        preset={panel?.kind === 'transfer' ? panel.preset : undefined}
        onDone={(result) => done(getMessages().transfer[result])}
        onCreateAccount={() => openAccount()}
      />
      <AccountEditor
        open={panel?.kind === 'account'}
        onOpenChange={close}
        initial={panel?.kind === 'account' ? panel.initial : undefined}
        onDone={(result) => done(getMessages().accounts[result])}
      />
      <ContributionEditor
        open={panel?.kind === 'contribution'}
        onOpenChange={close}
        goal={panel?.kind === 'contribution' ? panel.target.goal : undefined}
        initial={panel?.kind === 'contribution' ? panel.target.initial : undefined}
        withdraw={panel?.kind === 'contribution' ? panel.target.withdraw : undefined}
        accounts={accounts ?? []}
        onCreateGoal={() => openGoal()}
        onDone={(kind, result) => {
          const t = getMessages().goals
          done({ created: t.contributed, withdrawn: t.withdrawn, updated: t.contributionUpdated, deleted: t.contributionDeleted }[kind])
          if (result.just_completed) setCelebrating(result.goal)
        }}
      />
      <GoalCelebration goal={celebrating} onKeepSaving={() => setCelebrating(null)} onMarkAchieved={(g) => void markAchieved(g)} />
      <GoalEditor
        open={panel?.kind === 'goal'}
        onOpenChange={close}
        initial={panel?.kind === 'goal' ? panel.initial : undefined}
        onDone={(result) => done(getMessages().goals[result])}
      />
      <CardEditor
        open={panel?.kind === 'card'}
        onOpenChange={close}
        initial={panel?.kind === 'card' ? panel.initial : undefined}
        accounts={accounts ?? []}
        onDone={(result) => done(getMessages().cards[result])}
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
