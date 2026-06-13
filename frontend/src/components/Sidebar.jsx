import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Anchor, GitBranch, Zap, ScrollText, LayoutDashboard } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pipeline', icon: GitBranch, label: 'Pipeline Analyzer' },
  { to: '/predictor', icon: Zap, label: 'Pre-Push Predictor' },
  { to: '/logs', icon: ScrollText, label: 'Log Intelligence' },
]

function StatusDot({ ok }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${ok === null ? 'bg-gray-500' : ok ? 'bg-anchor-green' : 'bg-anchor-red'}`} />
}

export default function Sidebar() {
  const [backendOk, setBackendOk] = useState(null)
  const [ollamaOk, setOllamaOk] = useState(null)

  useEffect(() => {
    const check = async () => {
      const backendUrl = import.meta.env.VITE_API_URL 
        ? import.meta.env.VITE_API_URL.replace('/api', '') 
        : 'http://localhost:8000'
      try {
        const res = await fetch(`${backendUrl}/health`)
        setBackendOk(res.ok)
      } catch { setBackendOk(false) }
      setOllamaOk(null)
    }
    check()
    const id = setInterval(check, 15000)
    return () => clearInterval(id)
  }, [])

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
      <div className="p-4 border-t border-anchor-border space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">System Status</p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Backend API</span>
          <div className="flex items-center gap-1.5">
            <StatusDot ok={backendOk} />
            <span className={backendOk === null ? 'text-gray-500' : backendOk ? 'text-anchor-green' : 'text-anchor-red'}>
              {backendOk === null ? 'Checking...' : backendOk ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

      </div>
    </aside>
  )
}
