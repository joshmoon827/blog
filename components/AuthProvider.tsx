'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'

type AuthState = {
  loading: boolean
  authenticated: boolean
  user: { id: string } | null
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
      const data = (await res.json()) as {
        authenticated?: boolean
        user?: { id: string }
      }
      setAuthenticated(Boolean(data.authenticated))
      setUser(data.user ?? null)
    } catch {
      setAuthenticated(false)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh, pathname])

  const value = useMemo(
    () => ({ loading, authenticated, user, refresh }),
    [loading, authenticated, user, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

const fallbackAuth: AuthState = {
  loading: true,
  authenticated: false,
  user: null,
  refresh: async () => {},
}

export function useAuth(): AuthState {
  return useContext(AuthContext) ?? fallbackAuth
}
