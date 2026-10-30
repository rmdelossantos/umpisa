import { AlertIcon, CheckIcon } from '@/components/ui/Icons.jsx'

const TONES = {
  error: { icon: AlertIcon, role: 'alert' },
  success: { icon: CheckIcon, role: 'status' },
}

// A flat washed message. Errors are announced immediately (role=alert); successes politely.
export default function Alert({ tone = 'error', onRetry, retryLabel = 'Try again', className = '', children }) {
  const { icon: ToneIcon, role } = TONES[tone]
  return (
    <div className={`alert alert-${tone}${onRetry ? ' alert-action' : ''} ${className}`.trim()} role={role}>
      <ToneIcon />
      <span>{children}</span>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  )
}
