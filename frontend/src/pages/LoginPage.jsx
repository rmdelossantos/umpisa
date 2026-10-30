import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Alert from '@/components/ui/Alert.jsx'
import { EyeIcon, EyeOffIcon } from '@/components/ui/Icons.jsx'
import Brand from '@/components/layout/Brand.jsx'
import { api } from '@/api.js'
import { useAuth } from '@/auth/AuthContext.jsx'

// The login hero's shelf: one spine per list state, in the scheme's spine inks on an ink ground
const VERMILION = { bg: 'var(--vermilion)', fg: 'var(--on-vermilion)' }
const COBALT = { bg: 'var(--cobalt)', fg: 'var(--on-cobalt)' }
const MUSTARD = { bg: 'var(--mustard)', fg: 'var(--on-mustard)' }
const PAPER = { bg: '#f2f2f0', fg: '#18181b' }
const HERO_SHELF = [
  { label: 'Plan to watch', tone: PAPER, width: 56, height: 240 },
  { label: 'Watching', tone: VERMILION, width: 64, height: 272 },
  { label: 'Plan to read', tone: MUSTARD, width: 52, height: 232 },
  { label: 'Reading', tone: COBALT, width: 60, height: 260 },
  { label: 'Finished watching', tone: PAPER, width: 56, height: 284 },
  { label: 'Finished reading', tone: VERMILION, width: 52, height: 248 },
]

export default function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [demo, setDemo] = useState(null)

  // Fresh installs seed demo accounts; the backend says which, so reviewers can log in right away
  useEffect(() => {
    api
      .demoInfo()
      .then((info) => info.enabled && setDemo(info))
      .catch(() => {})
  }, [])

  function fillDemoAccount(account) {
    setEmail(account.email)
    setPassword(demo.password)
    setError(null)
  }

  const from = location.state?.from?.pathname ?? '/'
  const loggedOut = location.state?.loggedOut && !error

  if (status === 'authenticated') return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <Brand />
        <div>
          <h2>Every anime and manga you love, on one shelf.</h2>
          <p>Track what you plan to watch, what you’re reading now, and everything you’ve finished.</p>
        </div>
        <ul className="auth-shelf" aria-hidden="true">
          {HERO_SHELF.map(({ label, tone, width, height }, i) => (
            <li key={label} style={{ '--w': `${width}px`, '--h': `${height}px`, background: tone.bg, color: tone.fg }}>
              {label}
              <small>{i + 1}</small>
            </li>
          ))}
        </ul>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-head">
            <h1>Log in</h1>
            <p className="muted">Use the email and password your admin set up for you.</p>
          </div>

          {loggedOut && <Alert tone="success">You’ve been logged out.</Alert>}
          {error && <Alert>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                placeholder="you@example.com"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                // The login form is the page's only task, so it starts focused
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <input
                  id="password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          {demo && (
            <section className="demo-accounts" aria-label="Demo accounts">
              <p>
                Demo accounts, password <code>{demo.password}</code>
              </p>
              <ul>
                {demo.accounts.map((account) => (
                  <li key={account.email}>
                    <span>
                      {account.email} <span className="muted">({account.role})</span>
                    </span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => fillDemoAccount(account)}>
                      Use
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </section>
    </div>
  )
}
