import { useState, type FormEvent } from 'react'
import type { Category, CategoryInput, TxType } from '../domain/types'

interface Props {
  initial?: Category
  onSubmit: (data: CategoryInput) => Promise<void>
  onCancel: () => void
}

export default function CategoryForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const [color, setColor] = useState(initial?.color ?? '#6b7280')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), type, color })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="form">
      <label>
        Nombre
        <input required autoFocus maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Tipo
        <select value={type} onChange={(e) => setType(e.target.value as TxType)}>
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </select>
      </label>
      <label>
        Color
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  )
}
