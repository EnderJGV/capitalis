import { useCallback, useEffect, useState } from 'react'
import Modal from '../components/Modal'
import TransactionForm from '../components/TransactionForm'
import type { Category, Transaction, TransactionFilters, TransactionInput } from '../domain/types'
import { categoriesApi, transactionsApi } from '../services/api'
import { currentMonth, formatDate, useMoney } from '../utils/format'

type Editing = Transaction | 'new' | null

export default function Transactions() {
  const money = useMoney()
  const [filters, setFilters] = useState<TransactionFilters>({ month: currentMonth(), type: '', category_id: '' })
  const [items, setItems] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<Editing>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setError('')
    transactionsApi.list(filters).then(setItems).catch((e: Error) => setError(e.message))
  }, [filters])

  useEffect(load, [load])
  useEffect(() => {
    categoriesApi.list().then(setCategories).catch((e: Error) => setError(e.message))
  }, [])

  async function save(data: TransactionInput) {
    if (editing && editing !== 'new') await transactionsApi.update(editing.id, data)
    else await transactionsApi.create(data)
    setEditing(null)
    load()
  }

  async function remove(id: number) {
    try {
      await transactionsApi.remove(id)
      setConfirmId(null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Transacciones</h1>
        <button className="btn primary" onClick={() => setEditing('new')}>+ Nueva</button>
      </div>

      <div className="filters card">
        <input type="month" aria-label="Mes" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })} />
        <select aria-label="Tipo" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value as TransactionFilters['type'] })}>
          <option value="">Todos los tipos</option>
          <option value="income">Ingresos</option>
          <option value="expense">Gastos</option>
        </select>
        <select
          aria-label="Categoría"
          value={filters.category_id}
          onChange={(e) => setFilters({ ...filters, category_id: e.target.value ? Number(e.target.value) : '' })}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th className="num">Monto</th><th /></tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="muted center">No hay transacciones para estos filtros.</td></tr>
            )}
            {items.map((t) => (
              <tr key={t.id}>
                <td>{formatDate(t.date)}</td>
                <td>{t.description || <span className="muted">—</span>}</td>
                <td>
                  {t.category ? (
                    <span className="chip"><i className="dot" style={{ background: t.category.color }} />{t.category.name}</span>
                  ) : (
                    <span className="muted">Sin categoría</span>
                  )}
                </td>
                <td className={`num ${t.type}`}>{t.type === 'expense' ? '−' : '+'}{money(t.amount)}</td>
                <td className="row-actions">
                  {confirmId === t.id ? (
                    <>
                      <button className="btn danger" onClick={() => remove(t.id)}>Confirmar</button>
                      <button className="btn ghost" onClick={() => setConfirmId(null)}>No</button>
                    </>
                  ) : (
                    <>
                      <button className="btn ghost" onClick={() => setEditing(t)}>Editar</button>
                      <button className="btn ghost" onClick={() => setConfirmId(t.id)}>Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Nueva transacción' : 'Editar transacción'} onClose={() => setEditing(null)}>
          <TransactionForm
            categories={categories}
            initial={editing === 'new' ? undefined : editing}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  )
}
