import { useAuth } from '../auth/AuthContext.jsx'
import { formatDate } from '../format.js'

export default function HomePage() {
  const { user } = useAuth()
  const firstName = user.details?.first_name || user.username

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {firstName}</h1>
          <p>Last login {formatDate(user.last_logged_in, true)}</p>
        </div>
      </div>
    </div>
  )
}
