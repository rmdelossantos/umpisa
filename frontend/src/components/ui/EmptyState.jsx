// What to show when there's nothing yet: a short heading, one line on what to do, and the way to do it
export default function EmptyState({ title, children, action, art }) {
  return (
    <section className="empty-library">
      {art}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </section>
  )
}
