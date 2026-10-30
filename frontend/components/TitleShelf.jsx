import { useEffect, useRef, useState } from 'react'
import { metaLine } from '../src/status.js'
import Cover from './Cover.jsx'
import { AlertIcon, CloseIcon } from './Icons.jsx'
import { HEIGHTS, TONES } from './Spine.jsx'
import StatusSelect from './StatusSelect.jsx'

const MEDIA_MARK = { anime: 'A', manga: 'M' }

const toneOf = (entry) => TONES[entry.anilist_id % TONES.length]

function TitleSpine({ entry, selected, onSelect }) {
  const tone = toneOf(entry)
  return (
    <button
      type="button"
      className={`spine spine-tall spine-${tone} title-spine`}
      style={{ '--h': `${HEIGHTS[entry.anilist_id % HEIGHTS.length]}px` }}
      aria-pressed={selected}
      aria-label={`${entry.title} (${entry.media_type})`}
      onClick={onSelect}
    >
      <span className="spine-title">{entry.title}</span>
      <span className="spine-mark" aria-hidden="true">
        {MEDIA_MARK[entry.media_type]}
      </span>
    </button>
  )
}

// The selected title opens in a strip under its shelf, not a modal
function TitleDetail({ entry, onStatus, onRemove, onClose }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const ref = useRef(null)

  // The strip opens under the shelf, which can be below the fold
  useEffect(() => {
    ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    // The strip's top band takes the volume's ink, tying it to the spine pulled from the shelf
    <div className="title-detail" ref={ref} style={{ '--tone': `var(--${toneOf(entry)})` }}>
      <Cover src={entry.image_url} />
      <div className="title-detail-body">
        <h3>{entry.title}</h3>
        <p className="person-sub">{metaLine(entry) || entry.media_type}</p>
        {error && (
          <div className="alert alert-error" role="alert">
            <AlertIcon />
            {error}
          </div>
        )}
        <div className="title-detail-actions">
          <StatusSelect
            id={`status-${entry.id}`}
            label="Status"
            mediaType={entry.media_type}
            value={entry.status}
            disabled={busy}
            onChange={(status) => run(async () => {
              await onStatus(entry, status)
              setBusy(false)
            })}
          />
          {confirming ? (
            <span className="confirm-inline" role="group" aria-label="Confirm removal">
              <span>Remove it and its status?</span>
              <button type="button" className="btn btn-danger" disabled={busy} onClick={() => run(() => onRemove(entry))}>
                Remove
              </button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setConfirming(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setConfirming(true)}>
              Remove from shelf
            </button>
          )}
        </div>
      </div>
      <button type="button" className="icon-btn title-detail-close" aria-label="Close details" onClick={onClose}>
        <CloseIcon />
      </button>
    </div>
  )
}

// One shelf of titles standing on the mustard ledge, with the selected title's details beneath it
export default function TitleShelf({ entries, selectedId, onSelect, onStatus, onRemove }) {
  const selected = entries.find((e) => e.id === selectedId)
  return (
    <>
      <ul className="shelf">
        {entries.map((e) => (
          <li key={e.id}>
            <TitleSpine entry={e} selected={e.id === selectedId} onSelect={() => onSelect(e.id === selectedId ? null : e.id)} />
          </li>
        ))}
      </ul>
      {selected && (
        <TitleDetail key={selected.id} entry={selected} onStatus={onStatus} onRemove={onRemove} onClose={() => onSelect(null)} />
      )}
    </>
  )
}
