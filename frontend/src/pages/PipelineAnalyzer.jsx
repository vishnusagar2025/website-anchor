import { useState } from 'react'
import { analyzePipeline } from '../services/api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'
import { GitBranch, CheckCircle, XCircle } from 'lucide-react'

export default function PipelineAnalyzer() {
  const [form, setForm] = useState({ repo_full_name: '', file_path: '', code_snippet: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      setResult(await analyzePipeline(form))
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <GitBranch className="text-anchor-accent" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline Analyzer</h1>
          <p className="text-gray-400 text-sm">Check your code against GitHub Actions workflows and lint rules</p>
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
                onChange={e => setForm({ ...form, repo_full_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">File Path (optional)</label>
              <input
                className="w-full bg-anchor-dark border border-anchor-border rounded-lg px-3 py-2 text-sm text-white focus:border-anchor-accent outline-none"
                placeholder="e.g. src/app.py"
                value={form.file_path}
                onChange={e => setForm({ ...form, file_path: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Code Snippet</label>
            <textarea
              className="w-full bg-anchor-dark border border-anchor-border rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-anchor-accent outline-none h-48 resize-none"
              placeholder="Paste your code here..."
              value={form.code_snippet}
              onChange={e => setForm({ ...form, code_snippet: e.target.value })}
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
              <ul className="space-y-2">
                {result.violations.map((v, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <XCircle className="text-anchor-red shrink-0 mt-0.5" size={16} />
                    {v}
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
              <ul className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="text-anchor-green shrink-0 mt-0.5" size={16} />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
