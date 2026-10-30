import { displayName, formatDate } from '../src/format.js'
import { EditIcon, TrashIcon } from './Icons.jsx'
import Spine from './Spine.jsx'

export default function UserList({ users, currentUserId, onEdit, onDelete }) {
  if (users.length === 0) return <p className="empty">No users yet. Add the first one with “Add user”.</p>

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th className="spine-cell">
              <span className="sr-only">Spine</span>
            </th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last login</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId
            return (
              <tr key={u.id} className={u.status === 'active' ? undefined : 'inactive'}>
                <td className="spine-cell">
                  <Spine user={u} />
                </td>
                <td>
                  <div className="person-name">
                    {displayName(u)}
                    {isSelf && <span className="muted"> (you)</span>}
                  </div>
                  <div className="person-sub">@{u.username}</div>
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={`tag${u.role === 'admin' ? ' tag-solid' : ''}`}>{u.role}</span>
                </td>
                <td>
                  <span className={`tag${u.status === 'active' ? '' : ' tag-off'}`}>{u.status}</span>
                </td>
                <td>{formatDate(u.last_logged_in, true)}</td>
                <td className="row-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    title="Edit"
                    aria-label={`Edit ${displayName(u)}`}
                    onClick={() => onEdit(u)}
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    title={isSelf ? "You can't delete your own account" : 'Delete'}
                    aria-label={`Delete ${displayName(u)}`}
                    onClick={() => onDelete(u)}
                    disabled={isSelf}
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
