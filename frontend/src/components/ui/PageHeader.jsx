// The 900-weight page title with an optional muted line (and any extra lines as children) under it,
// and actions bottom-aligned at the right
export default function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  )
}
