import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CURRENCIES, type Currency } from '../domain/types'

export default function Layout() {
  const { user, logout, setCurrency } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Capitalis</span>
        <nav>
          <NavLink to="/" end>Resumen</NavLink>
          <NavLink to="/transacciones">Transacciones</NavLink>
          <NavLink to="/categorias">Categorías</NavLink>
        </nav>
        <div className="topbar-user">
          <select
            aria-label="Moneda"
            value={user?.currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <span className="muted">{user?.name}</span>
          <button
            className="btn ghost"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            Salir
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
