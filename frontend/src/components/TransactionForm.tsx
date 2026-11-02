import { useState, type FormEvent } from 'react'
import type { Category, Transaction, TransactionInput, TxType } from '../domain/types'
import { todayISO } from '../utils/format'

interface Props {
  categories: Category[]
  initial?: Transaction
  onSubmit: (data: TransactionInput) => Promise<void>
  onCancel: () => void
}

export default function TransactionForm({ categories, initial, onSubmit, onCancel }: Props) {
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [description, setDescription] = useState(initial?.description ?? '')
  const [categoryId, setCategoryId] = useState<number | null>(initial?.category_id ?? null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const options = categories.filter((c) => c.type === type)

  function changeType(next: TxType) {
    setType(next)
    setCategoryId(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSubmit({ type, amount, date, description, category_id: categoryId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="form">
      <div className="segmented">
        <button type="button" className={type === 'expense' ? 'active expense' : ''} onClick={() => changeType('expense')}>
          Gasto
        </button>
        <button type="button" className={type === 'income' ? 'active income' : ''} onClick={() => changeType('income')}>
          Ingreso
        </button>
      </div>
      <label>
        Monto
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label>
        Fecha
        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label>
        Categoría
        <select value={categoryId ?? ''} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Sin categoría</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label>
        Descripción
        <input maxLength={255} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  )
}
