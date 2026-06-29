import { useState } from 'react'
import { analyzeLogs } from '../services/api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'
import { useHistory } from '../hooks/useHistory'
import { ScrollText, ChevronDown, ChevronUp, Copy, Trash2, Clock } from 'lucide-react'

const EXAMPLE = `ERROR 2024-01-15 10:23:11 NullPointerException in UserService.java:45
ERROR 2024-01-15 10:23:45 Database connection timeout after 30s
WARN  2024-01-15 10:24:01 Memory usage at 95% threshold
ERROR 2024-01-15 10:24:10 Failed to authenticate user - token expired
ERROR 2024-01-15 10:24:55 OutOfMemoryError: Java heap space
ERROR 2024-01-15 10:25:03 Database connection timeout after 30s
WARN  2024-01-15 10:25:20 Disk usage at 89% on /var/log
ERROR 2024-01-15 10:25:44 NullPointerException in UserService.java:45`

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
      <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

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
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">Runbook</p>
              <CopyButton text={incident.runbook.map((s, i) => `${i + 1}. ${s}`).join('\n')} />
            </div>
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
  const [logs, setLogs] = useState(() => localStorage.getItem('logs_form') || '')
  const [result, setResult] = useState(() => { try { return JSON.parse(localStorage.getItem('logs_result')) } catch { return null } })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const { history, add, clear } = useHistory('logs_history')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await analyzeLogs({ logs })
      setResult(res)
      localStorage.setItem('logs_result', JSON.stringify(res))
      add({ logs: logs.slice(0, 100), result: res })
    } catch (err) {
      setError(err.response?.data?.detail || 'Log analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setLogs(''); setResult(null); setError(''); setSeverityFilter('all'); localStorage.removeItem('logs_result'); localStorage.removeItem('logs_form') }

  const filteredIncidents = result?.incidents.filter(inc =>
    severityFilter === 'all' || inc.severity === severityFilter
  ) || []

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ScrollText className="text-anchor-purple" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-white">Log Intelligence</h1>
            <p className="text-gray-400 text-sm">Compress production logs into structured incident runbooks</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setLogs(EXAMPLE)} className="text-xs px-3 py-1.5 rounded-lg border border-anchor-purple/40 text-anchor-purple hover:bg-anchor-purple/10 transition-colors">
            Try Example
          </button>
          <button onClick={reset} className="text-xs px-3 py-1.5 rounded-lg border border-anchor-border text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex items-center gap-1">
            <Trash2 size={12} /> Clear
          </button>
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
              onChange={e => { setLogs(e.target.value); localStorage.setItem('logs_form', e.target.value) }}
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
            <div className="flex justify-end mb-2">
              <CopyButton text={result.summary} />
            </div>
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
              <div className="flex gap-2 mb-4">
                {['all', 'high', 'medium', 'low'].map(level => (
                  <button
                    key={level}
                    onClick={() => setSeverityFilter(level)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${
                      severityFilter === level
                        ? 'border-anchor-accent bg-anchor-accent/10 text-anchor-accent'
                        : 'border-anchor-border text-gray-400 hover:text-white'
                    }`}
                  >
                    {level === 'all' ? `All (${result.incidents.length})` : level}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {filteredIncidents.length > 0
                  ? filteredIncidents.map((inc, i) => <IncidentCard key={i} incident={inc} />)
                  : <p className="text-sm text-gray-500 text-center py-4">No incidents match this filter</p>
                }
              </div>
            </Card>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Clock size={14} /> Recent Analyses
            </h3>
            <button onClick={clear} className="text-xs text-gray-500 hover:text-anchor-red transition-colors">Clear history</button>
          </div>
          <div className="space-y-2">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setLogs(h.logs); setResult(h.result) }}
                className="w-full text-left bg-anchor-card border border-anchor-border rounded-lg px-4 py-3 hover:border-anchor-purple/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 font-mono truncate max-w-xs">{h.logs}...</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-anchor-red">{h.result.incidents.length} incidents</span>
                    <span className="text-xs text-gray-500">{timeAgo(h.timestamp)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
