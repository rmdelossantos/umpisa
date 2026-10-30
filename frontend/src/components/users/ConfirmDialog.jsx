import { useEffect, useRef } from 'react'

// Native <dialog>: focus trapping and Esc-to-close come from the browser
export default function ConfirmDialog({ open, title, children, confirmLabel, busy, onConfirm, onCancel }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={ref} className="dialog" onCancel={onCancel} aria-labelledby="dialog-title">
      <h2 id="dialog-title">{title}</h2>
      <div className="dialog-body">{children}</div>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
