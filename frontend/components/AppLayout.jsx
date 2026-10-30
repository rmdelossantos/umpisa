import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../src/auth/AuthContext.jsx'
import { displayName } from '../src/format.js'
import Brand from './Brand.jsx'
import { LogoutIcon } from './Icons.jsx'

const TABS = [
  { to: '/', label: 'Home', end: true },
  { to: '/profile', label: 'My account' },
  { to: '/users', label: 'Users', adminOnly: true },
]

export default function AppLayout() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true, state: { loggedOut: true } })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand to="/" />
        <nav className="tabs" aria-label="Main">
          {TABS.filter((t) => !t.adminOnly || isAdmin).map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className="tab">
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-user">
          <span>
            <strong>{displayName(user)}</strong>
            <small>
              @{user.username}
              {isAdmin && ' · Admin'}
            </small>
          </span>
          <button type="button" className="icon-btn" onClick={handleLogout} title="Log out" aria-label="Log out">
            <LogoutIcon />
          </button>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
