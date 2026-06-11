import { useState } from 'react'
import { analyzeLogs } from '../services/api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'
import { ScrollText, ChevronDown, ChevronUp } from 'lucide-react'

function IncidentCard({ incident }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-anchor-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-anchor-dark hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3 text-left">
          <Badge level={incident.severity}>{incident.severity}</Badge>
          <span className="text-sm text-white font-mono truncate max-w-xl">{incident.pattern}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 py-4 space-y-3 bg-anchor-card border-t border-anchor-border">
          <div>
            <p className="text-xs text-gray-400 mb-1">Root Cause</p>
            <p className="text-sm text-gray-200">{incident.root_cause}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Infrastructure Cost Impact</p>
            <p className="text-sm text-anchor-yellow">{incident.cost_impact}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Recommended Fixes</p>
            <ul className="space-y-1">
              {incident.recommended_fixes.map((f, i) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-anchor-green">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">Runbook</p>
            <ol className="space-y-1">
              {incident.runbook.map((step, i) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-anchor-accent font-mono font-bold shrink-0">{i + 1}.</span> {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LogIntelligence() {
  const [logs, setLogs] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      setResult(await analyzeLogs({ logs }))
    } catch (err) {
      setError(err.response?.data?.detail || 'Log analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <ScrollText className="text-anchor-purple" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Log Intelligence</h1>
          <p className="text-gray-400 text-sm">Compress production logs into structured incident runbooks</p>
        </div>
      </div>

      <Card className="mb-6">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Raw Production Logs</label>
            <textarea
              className="w-full bg-anchor-dark border border-anchor-border rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-anchor-accent outline-none h-56 resize-none"
              placeholder="Paste raw log output here (any format)..."
              value={logs}
              onChange={e => setLogs(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-anchor-purple text-white font-semibold px-6 py-2 rounded-lg hover:bg-anchor-purple/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Analyzing...' : 'Analyze Logs'}
          </button>
        </form>
      </Card>

      {loading && <Spinner />}
      {error && <div className="bg-anchor-red/10 border border-anchor-red/30 text-anchor-red rounded-lg px-4 py-3 text-sm">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card title="Total Log Lines">
              <p className="text-3xl font-bold text-white">{result.total_lines.toLocaleString()}</p>
            </Card>
            <Card title="Incidents Found">
              <p className="text-3xl font-bold text-anchor-red">{result.incidents.length}</p>
            </Card>
          </div>

          <Card title="System Health Summary">
            <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>
          </Card>

          <Card title="Representative Log Patterns">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {result.representative_logs.map((log, i) => (
                <p key={i} className="text-xs font-mono text-gray-400 truncate">{log}</p>
              ))}
            </div>
          </Card>

          {result.incidents.length > 0 && (
            <Card title="Incidents & Runbooks">
              <div className="space-y-2">
                {result.incidents.map((inc, i) => (
                  <IncidentCard key={i} incident={inc} />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
