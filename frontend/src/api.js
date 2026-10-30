const BASE = '/api/v1'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message =
      res.status === 429
        ? `Too many requests. Try again in ${res.headers.get('Retry-After') ?? 'a few '}s.`
        : (typeof body.detail === 'string' ? body.detail : null) ?? `Request failed: ${res.status}`
    const error = new Error(message)
    error.status = res.status
    throw error
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  listUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  popularCatalog: (type, page = 1) => request(`/catalog/popular?type=${type}&page=${page}`),
  searchCatalog: (type, q, page = 1) =>
    request(`/catalog/search?type=${type}&q=${encodeURIComponent(q)}&page=${page}`),
  listCollection: () => request('/collection'),
  addToCollection: (data) => request('/collection', { method: 'POST', body: JSON.stringify(data) }),
  updateEntry: (id, status) => request(`/collection/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  removeEntry: (id) => request(`/collection/${id}`, { method: 'DELETE' }),
}
