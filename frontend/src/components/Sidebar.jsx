import { NavLink } from 'react-router-dom'
import { Anchor, GitBranch, Zap, ScrollText, LayoutDashboard } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pipeline', icon: GitBranch, label: 'Pipeline Analyzer' },
  { to: '/predictor', icon: Zap, label: 'Pre-Push Predictor' },
  { to: '/logs', icon: ScrollText, label: 'Log Intelligence' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-anchor-card border-r border-anchor-border flex flex-col">
      <div className="flex items-center gap-3 p-6 border-b border-anchor-border">
        <Anchor className="text-anchor-accent" size={28} />
        <div>
          <h1 className="font-bold text-white text-lg leading-none">Anchor</h1>
          <p className="text-xs text-gray-400 mt-0.5">Zero-Drift Intelligence</p>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-anchor-accent/10 text-anchor-accent font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-anchor-border">
        <p className="text-xs text-gray-500 text-center">HackArena 2.0 · MVP</p>
      </div>
    </aside>
  )
}
