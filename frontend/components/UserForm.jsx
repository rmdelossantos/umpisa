import { useState } from 'react'

const EMPTY = { email: '', username: '', password: '', first_name: '', last_name: '', birthdate: '' }

export default function UserForm({ onSubmit }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)

  const field = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) })

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      await onSubmit({ ...form, birthdate: form.birthdate || null })
      setForm(EMPTY)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <input placeholder="First name" {...field('first_name')} required />
        <input placeholder="Last name" {...field('last_name')} required />
        <input type="date" aria-label="Birthdate" {...field('birthdate')} />
        <input placeholder="Username" minLength={3} {...field('username')} required />
        <input type="email" placeholder="Email" {...field('email')} required />
        <input type="password" placeholder="Password" minLength={8} {...field('password')} required />
        <button type="submit">Add user</button>
      </form>
      {error && <p className="error">{error}</p>}
    </>
  )
}
