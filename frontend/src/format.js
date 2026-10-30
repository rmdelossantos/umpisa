export function displayName(user) {
  const full = user.details ? `${user.details.first_name} ${user.details.last_name}`.trim() : ''
  return full || user.username
}

export function initials(user) {
  const parts = displayName(user).split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

export function formatDate(value, withTime = false) {
  if (!value) return '—'
  // The API returns naive UTC timestamps
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
  })
}
