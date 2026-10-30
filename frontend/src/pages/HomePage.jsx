import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertIcon, SearchIcon } from '@/components/ui/Icons.jsx'
import TitleShelf from '@/components/shelf/TitleShelf.jsx'
import { api } from '@/api.js'
import { useAuth } from '@/auth/AuthContext.jsx'
import { STATUSES, statusLabel } from '@/status.js'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'anime', label: 'Anime' },
  { value: 'manga', label: 'Manga' },
]
const SKELETON_SPINES = 6

const EMPTY_SHELF = {
  planning: 'Nothing planned yet.',
  in_progress: 'Nothing in progress.',
  done: 'Nothing finished yet.',
}

function SkeletonShelf() {
  return (
    <ul className="shelf shelf-skeleton" aria-busy="true" aria-label="Loading your shelf">
      {Array.from({ length: SKELETON_SPINES }, (_, i) => (
        <li key={i}>
          <span className="spine spine-tall" />
        </li>
      ))}
    </ul>
  )
}

const BLANK_VOLUMES = [236, 260, 224, 248, 230]

function EmptyLibrary() {
  return (
    <section className="empty-library">
      <ul className="shelf shelf-skeleton" aria-hidden="true">
        {BLANK_VOLUMES.map((h) => (
          <li key={h}>
            <span className="spine spine-tall" style={{ '--h': `${h}px` }} />
          </li>
        ))}
      </ul>
      <h2>Your shelf is empty</h2>
      <p>Search for an anime or manga, then file it as planning, in progress, or done. It'll stand here on the shelf.</p>
      <Link to="/search" className="btn btn-primary">
        <SearchIcon size={18} />
        Find titles
      </Link>
    </section>
  )
}

export default function HomePage() {
  const { handleUnauthorized } = useAuth()
  const [entries, setEntries] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    api
      .listCollection()
      .catch(handleUnauthorized)
      .then(setEntries)
      .catch((e) => setError(e.message))
  }, [handleUnauthorized])

  async function handleStatus(entry, status) {
    const updated = await api.updateEntry(entry.id, status).catch(handleUnauthorized)
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
  }

  async function handleRemove(entry) {
    await api.removeEntry(entry.id).catch(handleUnauthorized)
    setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    setSelectedId(null)
  }

  const visible = entries?.filter((e) => filter === 'all' || e.media_type === filter) ?? []
  const count = (type) => entries?.filter((e) => e.media_type === type).length ?? 0

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Your shelf</h1>
          {entries && entries.length > 0 && (
            <p>
              {entries.length} {entries.length === 1 ? 'title' : 'titles'} · {count('anime')} anime · {count('manga')}{' '}
              manga
            </p>
          )}
        </div>
        {entries && entries.length > 0 && (
          <div className="header-actions">
            <div className="segmented" role="group" aria-label="Show">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={filter === f.value}
                  onClick={() => {
                    setFilter(f.value)
                    setSelectedId(null)
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <Link to="/search" className="btn btn-primary">
              <SearchIcon size={18} />
              Find titles
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertIcon />
          {error}
        </div>
      )}

      {!entries && !error && (
        <section className="section">
          <div className="section-head">
            <h2>Loading your shelf…</h2>
          </div>
          <SkeletonShelf />
        </section>
      )}

      {entries && entries.length === 0 && <EmptyLibrary />}

      {entries &&
        entries.length > 0 &&
        STATUSES.map((status) => {
          const onShelf = visible.filter((e) => e.status === status)
          return (
            <section className="section" key={status}>
              <div className="section-head">
                <h2>{statusLabel(status, filter)}</h2>
                <span className="count">{onShelf.length}</span>
              </div>
              {onShelf.length === 0 ? (
                <p className="shelf-empty">{EMPTY_SHELF[status]}</p>
              ) : (
                <TitleShelf
                  entries={onShelf}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onStatus={handleStatus}
                  onRemove={handleRemove}
                />
              )}
            </section>
          )
        })}
    </div>
  )
}
