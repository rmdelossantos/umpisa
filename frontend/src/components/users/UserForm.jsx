import { useState } from 'react'
import { AlertIcon } from '@/components/ui/Icons.jsx'

const EMPTY = {
  email: '',
  username: '',
  password: '',
  first_name: '',
  last_name: '',
  birthdate: '',
  role: 'user',
  status: 'active',
}

const FIELDS = [
  { key: 'first_name', label: 'First name', required: true, autoComplete: 'given-name' },
  { key: 'last_name', label: 'Last name', required: true, autoComplete: 'family-name' },
  { key: 'birthdate', label: 'Birthdate', type: 'date' },
  { key: 'username', label: 'Username', required: true, minLength: 3, autoComplete: 'off' },
  { key: 'email', label: 'Email', type: 'email', required: true, autoComplete: 'off' },
  { key: 'password', label: 'Password', type: 'password', required: true, minLength: 8, autoComplete: 'new-password' },
]

function toForm(user) {
  return {
    ...EMPTY,
    email: user.email,
    username: user.username,
    first_name: user.details?.first_name ?? '',
    last_name: user.details?.last_name ?? '',
    birthdate: user.details?.birthdate ?? '',
    role: user.role,
    status: user.status,
  }
}

// Creates a user, or edits `user` when given. When editing, password is optional (blank keeps it)
// and role/status can be changed, except on your own account (`isSelf`).
export default function UserForm({ user, isSelf = false, onSubmit, onCancel }) {
  const editing = Boolean(user)
  const [form, setForm] = useState(() => (editing ? toForm(user) : EMPTY))
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { role, status, password, ...rest } = form
    const payload = { ...rest, birthdate: form.birthdate || null }
    if (password) payload.password = password
    if (editing && !isSelf) Object.assign(payload, { role, status })
    try {
      await onSubmit(payload)
      if (!editing) setForm(EMPTY)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
          <AlertIcon />
          {error}
        </div>
      )}
      <div className="form-grid">
        {FIELDS.map(({ key, label, type = 'text', ...rest }) => {
          const required = rest.required && !(editing && key === 'password')
          return (
            <div className="field" key={key}>
              <label htmlFor={`user-${key}`}>
                {editing && key === 'password' ? 'New password' : label}
                {!required && (
                  <span className="muted"> ({editing && key === 'password' ? 'leave blank to keep' : 'optional'})</span>
                )}
              </label>
              <input
                id={`user-${key}`}
                className="input"
                type={type}
                value={form[key]}
                onChange={set(key)}
                {...rest}
                required={required}
              />
            </div>
          )
        })}
        {editing && (
          <>
            <div className="field">
              <label htmlFor="user-role">Role</label>
              <select id="user-role" className="input" value={form.role} onChange={set('role')} disabled={isSelf}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="user-status">Status</label>
              <select id="user-status" className="input" value={form.status} onChange={set('status')} disabled={isSelf}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </>
        )}
      </div>
      {editing && isSelf && <p className="muted hint">You can't change your own role or status.</p>}
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add user'}
        </button>
      </div>
    </form>
  )
}
