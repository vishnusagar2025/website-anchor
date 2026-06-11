import { GitBranch, Zap, ScrollText, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

const features = [
  {
    to: '/pipeline',
    icon: GitBranch,
    color: 'text-anchor-accent',
    bg: 'bg-anchor-accent/10',
    title: 'Pipeline Analyzer',
    desc: 'Detect rule violations against GitHub Actions workflows and lint configs in real time.'
  },
  {
    to: '/predictor',
    icon: Zap,
    color: 'text-anchor-yellow',
    bg: 'bg-anchor-yellow/10',
    title: 'Pre-Push Predictor',
    desc: 'Simulate your git diff and predict merge conflicts, CI failures, and branch protection violations.'
  },
  {
    to: '/logs',
    icon: ScrollText,
    color: 'text-anchor-purple',
    bg: 'bg-anchor-purple/10',
    title: 'Log Intelligence',
    desc: 'Compress thousands of log lines into structured incident runbooks using AI and FAISS clustering.'
  }
]

export default function Dashboard() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="text-anchor-green" size={32} />
          <h1 className="text-3xl font-bold text-white">Anchor</h1>
        </div>
        <p className="text-gray-400 text-lg">Zero-Drift Engineering Intelligence — prevent failures before they reach production.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map(({ to, icon: Icon, color, bg, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="bg-anchor-card border border-anchor-border rounded-xl p-6 hover:border-anchor-accent/50 transition-colors group"
          >
            <div className={`inline-flex p-3 rounded-lg ${bg} mb-4`}>
              <Icon className={color} size={24} />
            </div>
            <h2 className="text-white font-semibold text-lg mb-2 group-hover:text-anchor-accent transition-colors">{title}</h2>
            <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 bg-anchor-card border border-anchor-border rounded-xl p-6">
        <h3 className="text-white font-semibold mb-3">How Anchor Works</h3>
        <ol className="space-y-2 text-sm text-gray-400">
          {[
            'Developer writes code or prepares a git push.',
            'Anchor fetches repository rules, workflows, and branch protection policies from GitHub.',
            'AI checks compliance and predicts CI/CD failures before any push.',
            'Production logs are compressed via FAISS embeddings into representative patterns.',
            'Claude (via Amazon Bedrock) generates root causes, severity, and step-by-step runbooks.'
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-anchor-accent font-mono font-bold">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
