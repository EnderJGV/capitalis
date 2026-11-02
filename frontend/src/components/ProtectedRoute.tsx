import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from './Layout'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <p className="center muted">Cargando…</p>
  if (!user) return <Navigate to="/login" replace />
  return <Layout />
}
