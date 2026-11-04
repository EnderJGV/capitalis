import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout } from './components/app/AuthLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AccountDetail from './pages/AccountDetail'
import GoalDetail from './pages/GoalDetail'
import Goals from './pages/Goals'
import Accounts from './pages/Accounts'
import Categories from './pages/Categories'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Movements from './pages/Movements'
import Register from './pages/Register'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/movimientos" element={<Movements />} />
        <Route path="/cuentas" element={<Accounts />} />
        <Route path="/cuentas/:id" element={<AccountDetail />} />
        <Route path="/objetivos" element={<Goals />} />
        <Route path="/objetivos/:id" element={<GoalDetail />} />
        <Route path="/categorias" element={<Categories />} />
        <Route path="/configuracion" element={<Settings />} />
      </Route>
      <Route path="/transacciones" element={<Navigate to="/movimientos" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
