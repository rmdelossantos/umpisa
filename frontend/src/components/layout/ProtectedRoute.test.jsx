import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ProtectedRoute from '@/components/layout/ProtectedRoute.jsx'
import { useAuth } from '@/auth/AuthContext.jsx'

vi.mock('@/auth/AuthContext.jsx', () => ({ useAuth: vi.fn() }))

function renderAt(status) {
  useAuth.mockReturnValue({ status })
  render(
    <MemoryRouter initialEntries={['/search']}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <p>search page</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('sends anonymous visitors to the login page', () => {
    renderAt('anonymous')
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('renders nothing while the session is being checked', () => {
    renderAt('loading')
    expect(screen.queryByText('search page')).not.toBeInTheDocument()
    expect(screen.queryByText('login page')).not.toBeInTheDocument()
  })

  it('renders the page for a logged-in user', () => {
    renderAt('authenticated')
    expect(screen.getByText('search page')).toBeInTheDocument()
  })
})
