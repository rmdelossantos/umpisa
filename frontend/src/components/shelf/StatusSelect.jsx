import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { STATUSES, statusLabel } from '@/status.js'
import { CheckIcon, ChevronDownIcon } from '@/components/ui/Icons.jsx'

const MENU_GAP = 4

// One control both shelves a title and re-files it. `value` is null when the title isn't saved yet.
// A custom listbox rather than a native <select>, whose popup can't be styled.
export default function StatusSelect({ id, mediaType, value, onChange, disabled, label }) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [flipUp, setFlipUp] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)

  const current = value ? statusLabel(value, mediaType) : 'Add to shelf…'

  function openMenu(index = Math.max(STATUSES.indexOf(value), 0)) {
    setActive(index)
    setOpen(true)
  }

  function close({ refocus = true } = {}) {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }

  function choose(status) {
    close()
    if (status !== value) onChange(status)
  }

  // Open upward when the menu would run past the bottom of the viewport
  useLayoutEffect(() => {
    if (!open) return
    const trigger = buttonRef.current.getBoundingClientRect()
    const menuHeight = listRef.current.offsetHeight + MENU_GAP
    setFlipUp(window.innerHeight - trigger.bottom < menuHeight && trigger.top > menuHeight)
    listRef.current.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (!rootRef.current.contains(e.target)) close({ refocus: false })
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function onTriggerKeyDown(e) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openMenu(e.key === 'ArrowUp' ? STATUSES.length - 1 : undefined)
    }
  }

  function onListKeyDown(e) {
    const last = STATUSES.length - 1
    const moves = {
      ArrowDown: () => setActive((i) => Math.min(i + 1, last)),
      ArrowUp: () => setActive((i) => Math.max(i - 1, 0)),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => choose(STATUSES[active]),
      ' ': () => choose(STATUSES[active]),
      Escape: () => close(),
      Tab: () => close({ refocus: false }),
    }
    if (moves[e.key]) {
      if (e.key !== 'Tab') e.preventDefault()
      moves[e.key]()
    }
  }

  return (
    <div className="status-menu" ref={rootRef}>
      <button
        id={id}
        ref={buttonRef}
        type="button"
        className={`input status-trigger${value ? '' : ' status-trigger-empty'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label ? `${label}: ${current}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        <span>{current}</span>
        <ChevronDownIcon size={16} />
      </button>
      {open && (
        <ul
          id={listId}
          ref={listRef}
          className={`status-options${flipUp ? ' status-options-up' : ''}`}
          role="listbox"
          tabIndex={-1}
          aria-label={label ?? 'Status'}
          aria-activedescendant={`${listId}-${STATUSES[active]}`}
          onKeyDown={onListKeyDown}
        >
          {STATUSES.map((status, i) => (
            <li
              key={status}
              id={`${listId}-${status}`}
              role="option"
              aria-selected={status === value}
              className={i === active ? 'is-active' : undefined}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(status)}
            >
              <span>{statusLabel(status, mediaType)}</span>
              {status === value && <CheckIcon size={16} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
