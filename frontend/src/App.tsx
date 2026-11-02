import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout } from './components/app/AuthLayout'
import ProtectedRoute from './components/ProtectedRoute'
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
        <Route path="/categorias" element={<Categories />} />
        <Route path="/configuracion" element={<Settings />} />
      </Route>
      <Route path="/transacciones" element={<Navigate to="/movimientos" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
