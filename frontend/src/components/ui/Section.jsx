// A titled block standing on the 2px ink shelf rule. `aside` sits at the right end of the rule
// (a count, a link, or a muted note).
export default function Section({ title, aside, className = '', children, ...rest }) {
  return (
    <section className={`section ${className}`.trim()} {...rest}>
      <div className="section-head">
        <h2>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}
