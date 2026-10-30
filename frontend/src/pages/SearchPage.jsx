import { useEffect, useRef, useState } from 'react'
import Cover from '../../components/Cover.jsx'
import { AlertIcon, SearchIcon } from '../../components/Icons.jsx'
import StatusSelect from '../../components/StatusSelect.jsx'
import { api } from '../api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { entryKey, metaLine } from '../status.js'

const TYPES = [
  { value: 'anime', label: 'Anime' },
  { value: 'manga', label: 'Manga' },
]
const DEBOUNCE_MS = 400
const MIN_QUERY = 2
const SKELETON_ROWS = 4

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
  const [results, setResults] = useState(null) // null = nothing searched yet
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)
  const [entries, setEntries] = useState({}) // entryKey -> saved entry
  const latest = useRef(0) // drops responses from searches the user has already typed past

  useEffect(() => {
    api
      .listCollection()
      .catch(handleUnauthorized)
      .then((list) => setEntries(Object.fromEntries(list.map((e) => [entryKey(e), e]))))
      .catch(() => {}) // search still works; rows just won't show what's already shelved
  }, [handleUnauthorized])

  async function runSearch(q, pageNo) {
    const ticket = ++latest.current
    setLoading(true)
    setError(null)
    if (pageNo === 1) setResults([])
    try {
      const res = await api.searchCatalog(type, q, pageNo).catch(handleUnauthorized)
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
    const q = query.trim()
    if (q.length < MIN_QUERY) {
      latest.current++
      setResults(null)
      setError(null)
      setLoading(false)
      return
    }
    const timer = setTimeout(() => runSearch(q, 1), DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // runSearch reads type and query from this render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, type, retryTick])

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

  const q = query.trim()
  const noun = type === 'anime' ? 'anime' : 'manga'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Find titles</h1>
          <p>Search anime and manga, then file them straight onto your shelf.</p>
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
            autoFocus
          />
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>{results === null ? 'Results' : `${noun[0].toUpperCase()}${noun.slice(1)} matching “${q}”`}</h2>
          {results && results.length > 0 && <span className="count">{results.length}</span>}
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

        {results === null && !loading && !error && (
          <p className="shelf-empty">Type at least {MIN_QUERY} letters to search {noun} by title.</p>
        )}

        {results && results.length === 0 && !loading && !error && (
          <p className="shelf-empty">No {noun} matches “{q}”. Check the spelling, or try the English or romaji title.</p>
        )}

        <ul className="results" aria-busy={loading}>
          {results?.map((item) => (
            <ResultRow key={entryKey(item)} item={item} entry={entries[entryKey(item)]} onChange={handleRowChange} />
          ))}
          {loading &&
            Array.from({ length: page === 1 && !results?.length ? SKELETON_ROWS : 1 }, (_, i) => (
              <li className="result result-skeleton" key={`s${i}`} aria-hidden="true">
                <span className="cover cover-sm" />
                <div className="result-body">
                  <span className="bar" />
                  <span className="bar bar-short" />
                </div>
              </li>
            ))}
        </ul>

        {hasNext && !loading && results?.length > 0 && (
          <div className="load-more">
            <button type="button" className="btn btn-ghost" onClick={() => runSearch(q, page + 1)}>
              Load more
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
