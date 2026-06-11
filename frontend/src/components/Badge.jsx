const severity = {
  low: 'bg-anchor-green/10 text-anchor-green border-anchor-green/20',
  medium: 'bg-anchor-yellow/10 text-anchor-yellow border-anchor-yellow/20',
  high: 'bg-anchor-red/10 text-anchor-red border-anchor-red/20',
  critical: 'bg-red-900/30 text-red-300 border-red-700',
  info: 'bg-anchor-accent/10 text-anchor-accent border-anchor-accent/20'
}

export default function Badge({ level, children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${severity[level] || severity.info}`}>
      {children}
    </span>
  )
}
