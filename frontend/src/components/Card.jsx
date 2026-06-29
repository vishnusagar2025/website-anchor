export default function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-anchor-card border border-anchor-border rounded-xl p-5 ${className}`}>
      {title && <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">{title}</h3>}
      {children}
    </div>
  )
}
