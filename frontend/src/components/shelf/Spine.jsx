import { displayName, initials } from '@/format.js'

export const TONES = ['vermilion', 'cobalt', 'mustard', 'ink']
// Tall spines vary in height per id, like a shelf of mixed series
export const HEIGHTS = [236, 260, 224, 248, 272, 230, 254]

// A user drawn as a manga volume spine. The colour is fixed per user id; inactive accounts are hatched.
// `tall` spines carry the full name like a book title, with an "A" mark for admins.
export default function Spine({ user, tall = false }) {
  const tone = user.status === 'active' ? TONES[user.id % TONES.length] : 'off'
  const className = `spine spine-${tone}${tall ? ' spine-tall' : ''}`

  if (!tall) {
    return (
      <span className={className} aria-hidden="true">
        {initials(user)}
      </span>
    )
  }
  return (
    <span className={className} title={displayName(user)} style={{ '--h': `${HEIGHTS[user.id % HEIGHTS.length]}px` }}>
      <span className="spine-title">{displayName(user)}</span>
      {user.role === 'admin' && <span className="spine-mark">A</span>}
    </span>
  )
}
