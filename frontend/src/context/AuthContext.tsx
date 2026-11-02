import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Currency, User } from '../domain/types'
import { authApi } from '../services/api'
import { setUnauthorizedHandler, tokenStore } from '../services/http'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { name: string; email: string; password: string; currency: Currency }) => Promise<void>
  logout: () => void
  setCurrency: (currency: Currency) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => tokenStore.get() !== null)

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!tokenStore.get()) return
    authApi
      .me()
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false))
  }, [logout])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      logout,
      login: async (email, password) => {
        const res = await authApi.login({ email, password })
        tokenStore.set(res.access_token)
        setUser(res.user)
      },
      register: async (data) => {
        const res = await authApi.register(data)
        tokenStore.set(res.access_token)
        setUser(res.user)
      },
      setCurrency: async (currency) => setUser(await authApi.updateMe({ currency })),
    }),
    [user, loading, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
