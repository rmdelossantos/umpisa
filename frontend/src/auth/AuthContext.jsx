import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@/api.js'

const AuthContext = createContext(null)

// status: 'loading' | 'authenticated' | 'anonymous'
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null })

  useEffect(() => {
    api
      .me()
      .then((user) => setState({ status: 'authenticated', user }))
      .catch(() => setState({ status: 'anonymous', user: null }))
  }, [])

  const login = useCallback(async (email, password) => {
    const user = await api.login({ email, password })
    setState({ status: 'authenticated', user })
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      // Clear local state even if the request fails
      setState({ status: 'anonymous', user: null })
    }
  }, [])

  // Any API call that comes back 401 (e.g. expired token) ends the session
  const handleUnauthorized = useCallback((error) => {
    if (error.status === 401) setState({ status: 'anonymous', user: null })
    throw error
  }, [])

  // Keeps the sidebar and profile in sync when an admin edits their own account
  const setCurrentUser = useCallback((user) => setState((s) => ({ ...s, user })), [])

  const value = useMemo(
    () => ({
      ...state,
      isAdmin: state.user?.role === 'admin',
      login,
      logout,
      handleUnauthorized,
      setCurrentUser,
    }),
    [state, login, logout, handleUnauthorized, setCurrentUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
