import { Link } from 'react-router-dom'

// The three-band spine mark plus the wordmark. Pass `to` to make it a link.
export default function Brand({ to, onClick }) {
  const content = (
    <>
      <span className="brand-bands" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="brand-name">Umpisa</span>
    </>
  )
  return to ? (
    <Link to={to} className="brand" onClick={onClick}>
      {content}
    </Link>
  ) : (
    <span className="brand">{content}</span>
  )
}
