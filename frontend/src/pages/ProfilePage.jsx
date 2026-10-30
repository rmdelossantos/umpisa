import Spine from '../../components/Spine.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { displayName, formatDate } from '../format.js'

export default function ProfilePage() {
  const { user } = useAuth()

  const rows = [
    ['Username', `@${user.username}`],
    ['Email', user.email],
    ['First name', user.details?.first_name || '—'],
    ['Last name', user.details?.last_name || '—'],
    ['Birthdate', formatDate(user.details?.birthdate)],
    ['Member since', formatDate(user.created_at)],
    ['Last login', formatDate(user.last_logged_in, true)],
  ]

  return (
    <div className="page">
      <div className="profile-head">
        <Spine user={user} tall />
        <div>
          <h1>{displayName(user)}</h1>
          <div className="tags">
            <span className={`tag${user.role === 'admin' ? ' tag-solid' : ''}`}>{user.role}</span>
            <span className={`tag${user.status === 'active' ? '' : ' tag-off'}`}>{user.status}</span>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>My account</h2>
        </div>
        <dl className="details">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
