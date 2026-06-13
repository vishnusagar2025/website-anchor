import { useState } from 'react'
import { analyzePipeline } from '../services/api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'
import { useHistory } from '../hooks/useHistory'
import { GitBranch, CheckCircle, XCircle, Copy, Trash2, Clock } from 'lucide-react'

const EXAMPLE = {
  repo_full_name: 'vishnusagar2025/website-anchor',
  file_path: 'src/app.py',
  code_snippet: `password = "admin123"\nquery = "SELECT * FROM users WHERE id = " + user_input\nimport subprocess\nsubprocess.call(user_cmd, shell=True)`
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
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

export default function PipelineAnalyzer() {
  const [form, setForm] = useState(() => { try { return JSON.parse(localStorage.getItem('pipeline_form')) || { repo_full_name: '', file_path: '', code_snippet: '' } } catch { return { repo_full_name: '', file_path: '', code_snippet: '' } } })
  const [result, setResult] = useState(() => { try { return JSON.parse(localStorage.getItem('pipeline_result')) } catch { return null } })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { history, add, clear } = useHistory('pipeline_history')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await analyzePipeline(form)
      setResult(res)
      localStorage.setItem('pipeline_result', JSON.stringify(res))
      add({ form, result: res })
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setForm({ repo_full_name: '', file_path: '', code_snippet: '' }); setResult(null); setError(''); localStorage.removeItem('pipeline_result'); localStorage.removeItem('pipeline_form') }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <GitBranch className="text-anchor-accent" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-white">Pipeline Analyzer</h1>
            <p className="text-gray-400 text-sm">Check your code against GitHub Actions workflows and lint rules</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setForm(EXAMPLE)} className="text-xs px-3 py-1.5 rounded-lg border border-anchor-accent/40 text-anchor-accent hover:bg-anchor-accent/10 transition-colors">
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
                placeholder="e.g. facebook/react"
                value={form.repo_full_name}
                onChange={e => { const f = { ...form, repo_full_name: e.target.value }; setForm(f); localStorage.setItem('pipeline_form', JSON.stringify(f)) }}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">File Path (optional)</label>
              <input
                className="w-full bg-anchor-dark border border-anchor-border rounded-lg px-3 py-2 text-sm text-white focus:border-anchor-accent outline-none"
                placeholder="e.g. src/app.py"
                value={form.file_path}
                onChange={e => { const f = { ...form, file_path: e.target.value }; setForm(f); localStorage.setItem('pipeline_form', JSON.stringify(f)) }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Code Snippet</label>
            <textarea
              className="w-full bg-anchor-dark border border-anchor-border rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-anchor-accent outline-none h-48 resize-none"
              placeholder="Paste your code here..."
              value={form.code_snippet}
              onChange={e => { const f = { ...form, code_snippet: e.target.value }; setForm(f); localStorage.setItem('pipeline_form', JSON.stringify(f)) }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-anchor-accent text-anchor-dark font-semibold px-6 py-2 rounded-lg hover:bg-anchor-accent/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Analyzing...' : 'Analyze Code'}
          </button>
        </form>
      </Card>

      {loading && <Spinner />}
      {error && <div className="bg-anchor-red/10 border border-anchor-red/30 text-anchor-red rounded-lg px-4 py-3 text-sm">{error}</div>}

      {result && (
        <div className="space-y-4">
          <Card title="Compliance Score">
            <div className="flex items-center gap-4">
              <div className={`text-5xl font-bold ${result.compliance_score >= 80 ? 'text-anchor-green' : result.compliance_score >= 50 ? 'text-anchor-yellow' : 'text-anchor-red'}`}>
                {result.compliance_score}
              </div>
              <div className="flex-1 bg-anchor-dark rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${result.compliance_score >= 80 ? 'bg-anchor-green' : result.compliance_score >= 50 ? 'bg-anchor-yellow' : 'bg-anchor-red'}`}
                  style={{ width: `${result.compliance_score}%` }}
                />
              </div>
              <span className="text-gray-400 text-sm">/ 100</span>
            </div>
          </Card>

          {result.violations.length > 0 && (
            <Card title="Violations">
              <div className="flex justify-end mb-2">
                <CopyButton text={result.violations.join('\n')} />
              </div>
              <ul className="space-y-2">
                {result.violations.map((v, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <XCircle className="text-anchor-red shrink-0 mt-0.5" size={16} /> {v}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {result.workflow_issues.length > 0 && (
            <Card title="Workflow Issues">
              <ul className="space-y-2">
                {result.workflow_issues.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-anchor-yellow">
                    <span className="shrink-0">⚠</span> {w}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {result.suggestions.length > 0 && (
            <Card title="Suggestions">
              <div className="flex justify-end mb-2">
                <CopyButton text={result.suggestions.join('\n')} />
              </div>
              <ul className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="text-anchor-green shrink-0 mt-0.5" size={16} /> {s}
                  </li>
                ))}
              </ul>
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
                onClick={() => { setForm(h.form); setResult(h.result) }}
                className="w-full text-left bg-anchor-card border border-anchor-border rounded-lg px-4 py-3 hover:border-anchor-accent/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-mono">{h.form.repo_full_name}</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${h.result.compliance_score >= 80 ? 'text-anchor-green' : h.result.compliance_score >= 50 ? 'text-anchor-yellow' : 'text-anchor-red'}`}>
                      Score: {h.result.compliance_score}
                    </span>
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
