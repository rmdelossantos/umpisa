import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext.jsx'

// Visiting /logout directly logs out and lands on the login page
export default function LogoutPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Safe to run twice under StrictMode: logout is idempotent
    logout().finally(() => navigate('/login', { replace: true, state: { loggedOut: true } }))
  }, [logout, navigate])

  return null
}
