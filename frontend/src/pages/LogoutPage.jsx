import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export default function LogoutPage() {
  const { logout } = useAuth()
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Safe to run twice under StrictMode: logout is idempotent
    logout().finally(() => setDone(true))
  }, [logout])

  return (
    <main>
      <h1>{done ? "You've been logged out" : 'Logging out…'}</h1>
      {done && (
        <p>
          <Link to="/login">Log in again</Link>
        </p>
      )}
    </main>
  )
}
