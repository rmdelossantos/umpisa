import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import AdminRoute from '@/components/layout/AdminRoute.jsx'
import { useAuth } from '@/auth/AuthContext.jsx'

vi.mock('@/auth/AuthContext.jsx', () => ({ useAuth: vi.fn() }))

function renderUsersPage(isAdmin) {
  useAuth.mockReturnValue({ isAdmin })
  render(
    <MemoryRouter initialEntries={['/users']}>
      <Routes>
        <Route path="/" element={<p>shelf</p>} />
        <Route
          path="/users"
          element={
            <AdminRoute>
              <p>users page</p>
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

it('lets admins in', () => {
  renderUsersPage(true)
  expect(screen.getByText('users page')).toBeInTheDocument()
})

it('sends everyone else back to their shelf', () => {
  renderUsersPage(false)
  expect(screen.getByText('shelf')).toBeInTheDocument()
})
