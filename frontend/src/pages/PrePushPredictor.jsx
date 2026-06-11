import { useState } from 'react'
import { predictPush } from '../services/api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Spinner from '../components/Spinner'
import { Zap } from 'lucide-react'

const riskColor = { low: 'green', medium: 'medium', high: 'high', critical: 'critical' }

export default function PrePushPredictor() {
  const [form, setForm] = useState({ repo_full_name: '', base_branch: 'main', diff: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      setResult(await predictPush(form))
    } catch (err) {
      setError(err.response?.data?.detail || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Zap className="text-anchor-yellow" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Pre-Push Predictor</h1>
          <p className="text-gray-400 text-sm">Predict CI/CD failures and merge conflicts before you push</p>
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
                onChange={e => setForm({ ...form, repo_full_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Target Branch</label>
              <input
                className="w-full bg-anchor-dark border border-anchor-border rounded-lg px-3 py-2 text-sm text-white focus:border-anchor-accent outline-none"
                value={form.base_branch}
                onChange={e => setForm({ ...form, base_branch: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Git Diff</label>
            <textarea
              className="w-full bg-anchor-dark border border-anchor-border rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-anchor-accent outline-none h-52 resize-none"
              placeholder="Paste your git diff output here..."
              value={form.diff}
              onChange={e => setForm({ ...form, diff: e.target.value })}
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
    </div>
  )
}
