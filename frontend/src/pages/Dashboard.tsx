import { useEffect, useState } from 'react'
import type { Summary } from '../domain/types'
import { dashboardApi } from '../services/api'
import { currentMonth, shortMonth, useMoney } from '../utils/format'

export default function Dashboard() {
  const money = useMoney()
  const [month, setMonth] = useState(currentMonth())
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!month) return
    let cancelled = false
    setError('')
    dashboardApi
      .summary(month)
      .then((s) => !cancelled && setSummary(s))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [month])

  const maxMonth = Math.max(1, ...(summary?.last_months ?? []).flatMap((m) => [Number(m.income), Number(m.expense)]))
  const totalExpense = Number(summary?.expense ?? 0)

  return (
    <>
      <div className="page-head">
        <h1>Resumen</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Mes" />
      </div>
      {error && <p className="error">{error}</p>}
      {summary && (
        <>
          <div className="stats">
            <div className="card stat"><span className="muted">Ingresos</span><strong className="income">{money(summary.income)}</strong></div>
            <div className="card stat"><span className="muted">Gastos</span><strong className="expense">{money(summary.expense)}</strong></div>
            <div className="card stat"><span className="muted">Saldo del mes</span><strong className={Number(summary.balance) < 0 ? 'expense' : 'income'}>{money(summary.balance)}</strong></div>
            <div className="card stat"><span className="muted">Saldo total</span><strong>{money(summary.total_balance)}</strong></div>
          </div>

          <div className="grid2">
            <section className="card">
              <h2>Gastos por categoría</h2>
              {summary.expenses_by_category.length === 0 && <p className="muted">Sin gastos este mes.</p>}
              {summary.expenses_by_category.map((c) => (
                <div className="bar-row" key={c.category_id ?? 'none'}>
                  <div className="bar-label">
                    <span>{c.name}</span>
                    <span className="muted">{money(c.total)} · {Math.round((Number(c.total) / totalExpense) * 100)}%</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(Number(c.total) / totalExpense) * 100}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </section>

            <section className="card">
              <h2>Últimos 6 meses</h2>
              <div className="months">
                {summary.last_months.map((m) => (
                  <div className="month-col" key={m.month} title={`${m.month}: ${money(m.income)} / ${money(m.expense)}`}>
                    <div className="month-bars">
                      <div className="vbar income-bg" style={{ height: `${(Number(m.income) / maxMonth) * 100}%` }} />
                      <div className="vbar expense-bg" style={{ height: `${(Number(m.expense) / maxMonth) * 100}%` }} />
                    </div>
                    <span className="muted">{shortMonth(m.month)}</span>
                  </div>
                ))}
              </div>
              <div className="legend">
                <span><i className="dot income-bg" /> Ingresos</span>
                <span><i className="dot expense-bg" /> Gastos</span>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  )
}
