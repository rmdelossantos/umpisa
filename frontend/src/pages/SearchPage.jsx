import { useEffect, useRef, useState } from 'react'
import Cover from '@/components/ui/Cover.jsx'
import { AlertIcon, SearchIcon } from '@/components/ui/Icons.jsx'
import StatusSelect from '@/components/shelf/StatusSelect.jsx'
import { api } from '@/api.js'
import { useAuth } from '@/auth/AuthContext.jsx'
import { entryKey, metaLine } from '@/status.js'

const TYPES = [
  { value: 'anime', label: 'Anime' },
  { value: 'manga', label: 'Manga' },
]
const DEBOUNCE_MS = 400
const MIN_QUERY = 2
const SKELETON_ROWS = 4
const MAX_PAGE = 20 // the API's page cap: 400 titles per list

function ResultRow({ item, entry, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const selectId = `add-${entryKey(item).replace(':', '-')}`

  async function handleChange(status) {
    setBusy(true)
    setError(null)
    try {
      await onChange(item, entry, status)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="result">
      <Cover src={item.image_url} small />
      <div className="result-body">
        <div className="person-name">{item.title}</div>
        <div className="person-sub">{metaLine(item)}</div>
        {error && (
          <p className="result-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="result-action">
        {entry && <span className="tag tag-plain">On your shelf</span>}
        <StatusSelect
          id={selectId}
          mediaType={item.media_type}
          value={entry?.status ?? null}
          disabled={busy}
          onChange={handleChange}
          label={entry ? `Status of ${item.title}` : `Add ${item.title} to your shelf`}
        />
      </div>
    </li>
  )
}

export default function SearchPage() {
  const { handleUnauthorized } = useAuth()
  const [type, setType] = useState('anime')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)
  const [entries, setEntries] = useState({}) // entryKey -> saved entry
  const latest = useRef(0) // drops responses from searches the user has already typed past

  const q = query.trim()
  // With nothing typed the page browses AniList's most popular titles; typing narrows it to a search
  const searching = q.length >= MIN_QUERY

  useEffect(() => {
    api
      .listCollection()
      .catch(handleUnauthorized)
      .then((list) => setEntries(Object.fromEntries(list.map((e) => [entryKey(e), e]))))
      .catch(() => {}) // search still works; rows just won't show what's already shelved
  }, [handleUnauthorized])

  async function load(pageNo) {
    const ticket = ++latest.current
    setLoading(true)
    setError(null)
    if (pageNo === 1) setResults([])
    try {
      const request = searching ? api.searchCatalog(type, q, pageNo) : api.popularCatalog(type, pageNo)
      const res = await request.catch(handleUnauthorized)
      if (ticket !== latest.current) return
      setResults((prev) => (pageNo === 1 ? res.items : [...prev, ...res.items]))
      setPage(pageNo)
      setHasNext(res.has_next_page)
    } catch (e) {
      if (ticket === latest.current) setError(e.message)
    } finally {
      if (ticket === latest.current) setLoading(false)
    }
  }

  useEffect(() => {
    // Browsing loads straight away; a search waits until the typing pauses
    const timer = setTimeout(() => load(1), searching ? DEBOUNCE_MS : 0)
    return () => clearTimeout(timer)
    // load reads type and the query from this render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching ? q : '', type, retryTick])

  async function handleRowChange(item, entry, status) {
    const key = entryKey(item)
    if (!entry) {
      const created = await api
        .addToCollection({ media_type: item.media_type, anilist_id: item.anilist_id, status })
        .catch(handleUnauthorized)
      setEntries((prev) => ({ ...prev, [key]: created }))
    } else {
      const updated = await api.updateEntry(entry.id, status).catch(handleUnauthorized)
      setEntries((prev) => ({ ...prev, [key]: updated }))
    }
  }

  const noun = type === 'anime' ? 'anime' : 'manga'
  const Noun = noun[0].toUpperCase() + noun.slice(1)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Find titles</h1>
          <p>Browse what’s popular or search by title, then file it straight onto your shelf.</p>
        </div>
      </div>

      <div className="search-bar">
        <div className="segmented" role="group" aria-label="Search in">
          {TYPES.map((t) => (
            <button key={t.value} type="button" aria-pressed={type === t.value} onClick={() => setType(t.value)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="search-input">
          <SearchIcon size={18} />
          <label className="sr-only" htmlFor="search-q">
            Search {noun}
          </label>
          <input
            id="search-q"
            className="input"
            type="search"
            placeholder={type === 'anime' ? 'Frieren, Mob Psycho 100, Ping Pong…' : 'Berserk, Vagabond, Yotsuba&!…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>{searching ? `${Noun} matching “${q}”` : `Popular ${noun}`}</h2>
          {searching ? (
            results.length > 0 && <span className="count">{results.length}</span>
          ) : (
            <span className="muted section-note">Most-followed on AniList</span>
          )}
        </div>

        {error && (
          <div className="alert alert-error search-alert" role="alert">
            <AlertIcon />
            <span>{error}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRetryTick((n) => n + 1)}>
              Try again
            </button>
          </div>
        )}

        {searching && results.length === 0 && !loading && !error && (
          <p className="shelf-empty">
            No {noun} matches “{q}”. Check the spelling, or try the English or romaji title.
          </p>
        )}

        <ul className="results" aria-busy={loading}>
          {results.map((item) => (
            <ResultRow key={entryKey(item)} item={item} entry={entries[entryKey(item)]} onChange={handleRowChange} />
          ))}
          {loading &&
            Array.from({ length: results.length === 0 ? SKELETON_ROWS : 1 }, (_, i) => (
              <li className="result result-skeleton" key={`s${i}`} aria-hidden="true">
                <span className="cover cover-sm" />
                <div className="result-body">
                  <span className="bar" />
                  <span className="bar bar-short" />
                </div>
              </li>
            ))}
        </ul>

        {hasNext && page < MAX_PAGE && !loading && results.length > 0 && (
          <div className="load-more">
            <button type="button" className="btn btn-ghost" onClick={() => load(page + 1)}>
              Load more
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
