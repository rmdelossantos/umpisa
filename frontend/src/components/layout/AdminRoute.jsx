import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext.jsx'

// The API enforces admin-only access too; this just keeps non-admins off the page
export default function AdminRoute({ children }) {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/" replace />
}
