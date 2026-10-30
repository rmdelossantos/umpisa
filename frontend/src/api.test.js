import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api.js'

function respond(status, body, headers = {}) {
  return Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    }),
  )
}

describe('api', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('returns parsed JSON on success', async () => {
    fetchMock.mockReturnValue(respond(200, { id: 1 }))
    await expect(api.me()).resolves.toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/me', expect.any(Object))
  })

  it('returns null for 204 No Content', async () => {
    fetchMock.mockReturnValue(respond(204))
    await expect(api.removeEntry(3)).resolves.toBeNull()
  })

  it('surfaces the server detail and status on errors', async () => {
    fetchMock.mockReturnValue(respond(409, { detail: 'That title is already on your shelf' }))
    await expect(api.addToCollection({})).rejects.toMatchObject({
      message: 'That title is already on your shelf',
      status: 409,
    })
  })

  it('explains rate limiting with Retry-After', async () => {
    fetchMock.mockReturnValue(respond(429, {}, { 'Retry-After': '12' }))
    await expect(api.listUsers()).rejects.toThrow('Too many requests. Try again in 12s.')
  })

  it('encodes the search query', async () => {
    fetchMock.mockReturnValue(respond(200, { items: [] }))
    await api.searchCatalog('manga', 'Yotsuba&!', 2)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/catalog/search?type=manga&q=Yotsuba%26!&page=2')
  })
})
