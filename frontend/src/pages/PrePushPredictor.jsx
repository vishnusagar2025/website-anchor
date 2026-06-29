import { useState } from 'react'
import { predictPush } from '../services/api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'
import { useHistory } from '../hooks/useHistory'
import { Zap, Copy, Trash2, Clock } from 'lucide-react'

const EXAMPLE = {
  repo_full_name: 'vishnusagar2025/website-anchor',
  base_branch: 'main',
  diff: `+++ b/app.py\n+DB_PASSWORD = "supersecret"\n+def connect():\n+    import os\n+    os.system("rm -rf /tmp/*")\n+    cursor.execute("SELECT * FROM users WHERE id=" + id)`
}

const riskColor = { low: 'low', medium: 'medium', high: 'high', critical: 'critical' }

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

export default function PrePushPredictor() {
  const [form, setForm] = useState(() => { try { return JSON.parse(localStorage.getItem('predictor_form')) || { repo_full_name: '', base_branch: 'main', diff: '' } } catch { return { repo_full_name: '', base_branch: 'main', diff: '' } } })
  const [result, setResult] = useState(() => { try { return JSON.parse(localStorage.getItem('predictor_result')) } catch { return null } })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { history, add, clear } = useHistory('predictor_history')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await predictPush(form)
      setResult(res)
      localStorage.setItem('predictor_result', JSON.stringify(res))
      add({ form, result: res })
    } catch (err) {
      setError(err.response?.data?.detail || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setForm({ repo_full_name: '', base_branch: 'main', diff: '' }); setResult(null); setError(''); localStorage.removeItem('predictor_result'); localStorage.removeItem('predictor_form') }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Zap className="text-anchor-yellow" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-white">Pre-Push Predictor</h1>
            <p className="text-gray-400 text-sm">Predict CI/CD failures and merge conflicts before you push</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setForm(EXAMPLE)} className="text-xs px-3 py-1.5 rounded-lg border border-anchor-yellow/40 text-anchor-yellow hover:bg-anchor-yellow/10 transition-colors">
            Try Example
          </button>
          <button onClick={reset} className="text-xs px-3 py-1.5 rounded-lg border border-anchor-border text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex items-center gap-1">
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      <Card className="mb-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">GitHub Repo (owner/repo)</label>
              <input
                className="w-full bg-anchor-dark border border-anchor-border rounded-lg px-3 py-2 text-sm text-white focus:border-anchor-accent outline-none"
                placeholder="e.g. myorg/myrepo"
                value={form.repo_full_name}
                onChange={e => { const f = { ...form, repo_full_name: e.target.value }; setForm(f); localStorage.setItem('predictor_form', JSON.stringify(f)) }}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Target Branch</label>
              <input
                className="w-full bg-anchor-dark border border-anchor-border rounded-lg px-3 py-2 text-sm text-white focus:border-anchor-accent outline-none"
                value={form.base_branch}
                onChange={e => { const f = { ...form, base_branch: e.target.value }; setForm(f); localStorage.setItem('predictor_form', JSON.stringify(f)) }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Git Diff</label>
            <textarea
              className="w-full bg-anchor-dark border border-anchor-border rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-anchor-accent outline-none h-52 resize-none"
              placeholder="Paste your git diff output here..."
              value={form.diff}
              onChange={e => { const f = { ...form, diff: e.target.value }; setForm(f); localStorage.setItem('predictor_form', JSON.stringify(f)) }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-anchor-yellow text-anchor-dark font-semibold px-6 py-2 rounded-lg hover:bg-anchor-yellow/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Predicting...' : 'Predict Failures'}
          </button>
        </form>
      </Card>

      {loading && <Spinner />}
      {error && <div className="bg-anchor-red/10 border border-anchor-red/30 text-anchor-red rounded-lg px-4 py-3 text-sm">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card title="Overall Risk">
              <Badge level={riskColor[result.risk_level] || 'medium'}>{result.risk_level?.toUpperCase()}</Badge>
            </Card>
            <Card title="Merge Conflict Risk">
              <Badge level={riskColor[result.merge_conflict_risk] || 'medium'}>{result.merge_conflict_risk?.toUpperCase()}</Badge>
            </Card>
          </div>

          {result.ci_failure_predictions.length > 0 && (
            <Card title="CI Failure Predictions">
              <div className="flex justify-end mb-2">
                <CopyButton text={result.ci_failure_predictions.join('\n')} />
              </div>
              <ul className="space-y-2">
                {result.ci_failure_predictions.map((p, i) => (
                  <li key={i} className="text-sm text-anchor-red flex items-start gap-2">
                    <span className="shrink-0">✕</span> {p}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {result.branch_violations.length > 0 && (
            <Card title="Branch Protection Violations">
              <ul className="space-y-2">
                {result.branch_violations.map((v, i) => (
                  <li key={i} className="text-sm text-anchor-yellow flex items-start gap-2">
                    <span className="shrink-0">⚠</span> {v}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {result.recommendations.length > 0 && (
            <Card title="Recommendations">
              <div className="flex justify-end mb-2">
                <CopyButton text={result.recommendations.join('\n')} />
              </div>
              <ol className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-anchor-accent font-mono">{i + 1}.</span> {r}
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Clock size={14} /> Recent Predictions
            </h3>
            <button onClick={clear} className="text-xs text-gray-500 hover:text-anchor-red transition-colors">Clear history</button>
          </div>
          <div className="space-y-2">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setForm(h.form); setResult(h.result) }}
                className="w-full text-left bg-anchor-card border border-anchor-border rounded-lg px-4 py-3 hover:border-anchor-yellow/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-mono">{h.form.repo_full_name}</span>
                  <div className="flex items-center gap-3">
                    <Badge level={riskColor[h.result.risk_level] || 'medium'}>{h.result.risk_level?.toUpperCase()}</Badge>
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
