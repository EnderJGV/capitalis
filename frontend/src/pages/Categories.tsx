import { useCallback, useEffect, useState } from 'react'
import CategoryForm from '../components/CategoryForm'
import Modal from '../components/Modal'
import type { Category, CategoryInput, TxType } from '../domain/types'
import { categoriesApi } from '../services/api'

type Editing = Category | 'new' | null

const GROUPS: { type: TxType; title: string }[] = [
  { type: 'expense', title: 'Gastos' },
  { type: 'income', title: 'Ingresos' },
]

export default function Categories() {
  const [items, setItems] = useState<Category[]>([])
  const [editing, setEditing] = useState<Editing>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    categoriesApi.list().then(setItems).catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  async function save(data: CategoryInput) {
    if (editing && editing !== 'new') await categoriesApi.update(editing.id, data)
    else await categoriesApi.create(data)
    setEditing(null)
    load()
  }

  async function remove(id: number) {
    setError('')
    try {
      await categoriesApi.remove(id)
      setConfirmId(null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Categorías</h1>
        <button className="btn primary" onClick={() => setEditing('new')}>+ Nueva</button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="grid2">
        {GROUPS.map((g) => (
          <section className="card" key={g.type}>
            <h2>{g.title}</h2>
            <ul className="list">
              {items.filter((c) => c.type === g.type).map((c) => (
                <li key={c.id}>
                  <span className="chip"><i className="dot" style={{ background: c.color }} />{c.name}</span>
                  <span className="row-actions">
                    {confirmId === c.id ? (
                      <>
                        <button className="btn danger" onClick={() => remove(c.id)}>Confirmar</button>
                        <button className="btn ghost" onClick={() => setConfirmId(null)}>No</button>
                      </>
                    ) : (
                      <>
                        <button className="btn ghost" onClick={() => setEditing(c)}>Editar</button>
                        <button className="btn ghost" onClick={() => setConfirmId(c.id)}>Eliminar</button>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Nueva categoría' : 'Editar categoría'} onClose={() => setEditing(null)}>
          <CategoryForm initial={editing === 'new' ? undefined : editing} onSubmit={save} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </>
  )
}
