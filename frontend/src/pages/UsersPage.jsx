import { useEffect, useState } from 'react'
import ConfirmDialog from '@/components/users/ConfirmDialog.jsx'
import Alert from '@/components/ui/Alert.jsx'
import { PlusIcon } from '@/components/ui/Icons.jsx'
import PageHeader from '@/components/ui/PageHeader.jsx'
import Section from '@/components/ui/Section.jsx'
import UserForm from '@/components/users/UserForm.jsx'
import UserList from '@/components/users/UserList.jsx'
import { api } from '@/api.js'
import { useAuth } from '@/auth/AuthContext.jsx'
import { displayName } from '@/format.js'

const count = (n, noun) => (
  <>
    <b>{n}</b> {noun}
    {n === 1 ? '' : 's'}
  </>
)

export default function UsersPage() {
  const { user: me, handleUnauthorized, setCurrentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  // null | { mode: 'add' } | { mode: 'edit', user }
  const [panel, setPanel] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    api
      .listUsers()
      .catch(handleUnauthorized)
      .then(setUsers)
      .catch((e) => setError(e.message))
  }, [handleUnauthorized])

  function openPanel(next) {
    setNotice(null)
    setPanel(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleCreate(data) {
    const created = await api.createUser(data).catch(handleUnauthorized)
    setUsers((prev) => [...prev, created])
    setPanel(null)
    setNotice(`${displayName(created)} was added.`)
  }

  async function handleUpdate(data) {
    const updated = await api.updateUser(panel.user.id, data).catch(handleUnauthorized)
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    if (updated.id === me.id) setCurrentUser(updated)
    setPanel(null)
    setNotice(`${displayName(updated)} was updated.`)
  }

  async function handleDelete() {
    setDeleteBusy(true)
    try {
      await api.deleteUser(deleting.id).catch(handleUnauthorized)
      setUsers((prev) => prev.filter((u) => u.id !== deleting.id))
      setNotice(`${displayName(deleting)} was deleted.`)
      if (panel?.user?.id === deleting.id) setPanel(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleteBusy(false)
      setDeleting(null)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Users"
        subtitle="Add, edit and remove the people who can log in to Umpisa."
        actions={
          !panel && (
            <button type="button" className="btn btn-primary" onClick={() => openPanel({ mode: 'add' })}>
              <PlusIcon size={18} />
              Add user
            </button>
          )
        }
      >
        {users.length > 0 && (
          <p className="header-counts">
            {count(users.length, 'account')} · <b>{users.filter((u) => u.status === 'active').length}</b> active ·{' '}
            {count(users.filter((u) => u.role === 'admin').length, 'admin')}
          </p>
        )}
      </PageHeader>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {panel && (
        <Section className="panel" title={panel.mode === 'edit' ? `Edit ${displayName(panel.user)}` : 'New user'}>
          <UserForm
            // Remount when switching users so the form resets to that user's values
            key={panel.mode === 'edit' ? panel.user.id : 'new'}
            user={panel.mode === 'edit' ? panel.user : undefined}
            isSelf={panel.mode === 'edit' && panel.user.id === me.id}
            onSubmit={panel.mode === 'edit' ? handleUpdate : handleCreate}
            onCancel={() => setPanel(null)}
          />
        </Section>
      )}

      <Section title="All users" aside={<span className="count">{users.length}</span>}>
        <UserList
          users={users}
          currentUserId={me.id}
          onEdit={(u) => openPanel({ mode: 'edit', user: u })}
          onDelete={setDeleting}
        />
      </Section>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete user?"
        confirmLabel="Delete user"
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      >
        {deleting && (
          <p>
            <strong>{displayName(deleting)}</strong> (@{deleting.username}) will lose access immediately. This can’t be
            undone.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
