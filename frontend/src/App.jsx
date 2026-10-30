import { Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from '../components/AdminRoute.jsx'
import AppLayout from '../components/AppLayout.jsx'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import LogoutPage from './pages/LogoutPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import UsersPage from './pages/UsersPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/logout" element={<LogoutPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route
          path="users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
