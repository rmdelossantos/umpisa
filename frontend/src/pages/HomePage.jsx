import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import UserForm from '../../components/UserForm.jsx'
import UserList from '../../components/UserList.jsx'

export default function HomePage() {
  const { user, handleUnauthorized } = useAuth()
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .listUsers()
      .catch(handleUnauthorized)
      .then(setUsers)
      .catch((e) => setError(e.message))
  }, [handleUnauthorized])

  async function handleCreate(data) {
    const created = await api.createUser(data).catch(handleUnauthorized)
    setUsers((prev) => [...prev, created])
  }

  const displayName = user.details ? `${user.details.first_name} ${user.details.last_name}`.trim() : user.username

  return (
    <main>
      <header className="app-header">
        <h1>Umpisa</h1>
        <span>
          {displayName} · <Link to="/logout">Log out</Link>
        </span>
      </header>
      {error && <p className="error">{error}</p>}
      <UserForm onSubmit={handleCreate} />
      <UserList users={users} />
    </main>
  )
}
