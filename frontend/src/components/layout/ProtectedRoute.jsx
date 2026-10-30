import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext.jsx'

export default function ProtectedRoute({ children }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return null
  if (status === 'anonymous') return <Navigate to="/login" state={{ from: location }} replace />
  return children
}
