import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nProvider'
import { AppShell } from './app/AppShell'
import { Logo } from './app/Logo'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const { t } = useI18n()
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-label={t.common.loading}>
        <Logo className="animate-pulse motion-reduce:animate-none" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <AppShell />
}
