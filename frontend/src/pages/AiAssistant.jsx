import { useState, useRef, useEffect } from 'react'
import { Send, Trash2, Paperclip, X, Bot, User, Maximize2, Minimize2, Github } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

// ── Inline markdown renderer ────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="ai-pre"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="ai-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="ai-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="ai-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="ai-h1">$1</h1>')
    .replace(/^[*\-] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul class="ai-ul">${m}</ul>`)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

// ── Typing dots ─────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{ animationDelay: `${i * 0.2}s` }}
          className="w-2 h-2 rounded-full bg-anchor-accent animate-bounce"
        />
      ))}
    </div>
  )
}

// ── Suggested prompts ────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: '🔀', label: 'Resolve merge conflict', prompt: 'How do I resolve a merge conflict in Git?' },
  { icon: '🔍', label: 'Analyze my logs', prompt: 'How do I analyze production logs for errors?' },
  { icon: '🚀', label: 'GitHub Actions CI/CD', prompt: 'How do I set up a GitHub Actions CI/CD pipeline?' },
  { icon: '🛡️', label: 'PR best practices', prompt: 'What are best practices for creating a good pull request?' },
  { icon: '📋', label: 'Branch strategy', prompt: 'What is the best Git branching strategy for a team?' },
  { icon: '⚡', label: 'Fix OOM error', prompt: 'How do I fix an Out of Memory error in a production server?' },
]

export default function AiAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `# 👋 Hi! I'm Anchor AI

I'm your intelligent engineering assistant. I can help you with:

- 🔍 **Log Analysis** — Paste logs and I'll diagnose the issue
- 🐙 **GitHub** — PRs, merge conflicts, branches, Actions, CI/CD
- 🛡️ **Security** — Vulnerabilities, code review, best practices
- ⚡ **Performance** — Bottlenecks, optimizations, scalability
- 📋 **DevOps & SRE** — Incidents, runbooks, infrastructure

Pick a suggestion below or type your question!`,
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [context, setContext] = useState('')
  const [showContext, setShowContext] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const SYSTEM_PROMPT = `You are Anchor AI, an expert engineering assistant specializing in GitHub workflows, DevOps, CI/CD, incident response, log analysis, code review, and security. Provide clear, concise, actionable answers with markdown formatting and code blocks.`

  const sendMessage = async (text) => {
    const userText = (text || input).trim()
    if (!userText || isLoading) return

    const userMsg = { role: 'user', content: userText }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setIsLoading(true)

    const historyForAPI = updated.slice(1, -1)

    try {
      let reply = null

      // ── Option 1: Call Groq directly from browser ──────────────────────────
      if (GROQ_API_KEY) {
        const groqMessages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...historyForAPI.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        ]
        if (context.trim()) {
          groqMessages.push({
            role: 'user',
            content: `[Context]\n\`\`\`\n${context.trim()}\n\`\`\`\n\n${userText}`,
          })
        } else {
          groqMessages.push({ role: 'user', content: userText })
        }

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: groqMessages,
            max_tokens: 2048,
          }),
        })
        if (groqRes.ok) {
          const groqData = await groqRes.json()
          reply = groqData.choices?.[0]?.message?.content
        }
      }

      // ── Option 2: Fall back to backend /chat ──────────────────────────────
      if (!reply && API) {
        const res = await fetch(`${API}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userText,
            history: historyForAPI,
            context: context.trim() || null,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          reply = data.reply
        }
      }

      if (reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      } else {
        throw new Error('No AI provider available')
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **AI not configured.**\n\nTo enable live AI responses, add your Groq API key to Vercel:\n\n**Key:** \`VITE_GROQ_API_KEY\`\n**Value:** your Groq key from [console.groq.com](https://console.groq.com)\n\nThen redeploy the site.`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `# 👋 Chat cleared!\n\nAsk me anything about **GitHub**, **DevOps**, **logs**, or **incidents**.`,
    }])
    setContext('')
  }

  return (
    <>
      <style>{`
        .ai-pre { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px; overflow-x: auto; margin: 8px 0; font-size: 0.82em; }
        .ai-code { background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; color: #a78bfa; font-family: monospace; font-size: 0.88em; }
        .ai-pre code { background: transparent; color: #e2e8f0; padding: 0; }
        .ai-h1 { font-size: 1.3em; font-weight: 700; color: #f1f5f9; margin: 8px 0 4px; }
        .ai-h2 { font-size: 1.1em; font-weight: 600; color: #e2e8f0; margin: 8px 0 4px; }
        .ai-h3 { font-size: 1em; font-weight: 600; color: #cbd5e1; margin: 6px 0 2px; }
        .ai-ul { padding-left: 18px; margin: 4px 0; }
        .ai-ul li { margin: 3px 0; color: #cbd5e1; }
        .anchor-ai-input:focus { outline: none; }
      `}</style>

      <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Anchor AI Assistant</h1>
              <p className="text-xs text-gray-400">DevOps · GitHub · Incidents · Code Review</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowContext(p => !p)}
              title="Attach context"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                context ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              <Paperclip size={13} />
              {context ? 'Context attached' : 'Attach context'}
            </button>
            <button
              onClick={clearChat}
              title="Clear chat"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 transition-all"
            >
              <Trash2 size={13} />
              Clear
            </button>
          </div>
        </div>

        {/* Context Panel */}
        {showContext && (
          <div className="mb-4 p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">
                📎 Attach Context (logs, code, runbook, error output)
              </span>
              <button onClick={() => setShowContext(false)} className="text-gray-500 hover:text-gray-300">
                <X size={14} />
              </button>
            </div>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="Paste logs, error messages, GitHub workflow YAML, or code here. The AI will reference this in its answers..."
              className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-xs text-gray-300 font-mono resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
              rows={5}
            />
            {context && (
              <button onClick={() => setContext('')} className="mt-2 text-xs text-gray-500 hover:text-red-400 transition-colors">
                ✕ Clear context
              </button>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 ${
                msg.role === 'user'
                  ? 'bg-white/10 border border-white/10'
                  : 'bg-gradient-to-br from-violet-500 to-pink-500 shadow-md shadow-violet-500/30'
              }`}>
                {msg.role === 'user' ? <User size={14} className="text-gray-300" /> : <Bot size={14} className="text-white" />}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-violet-500/25 to-pink-500/15 border border-violet-500/30 text-slate-100 rounded-tr-sm'
                    : 'bg-white/5 border border-white/8 text-slate-300 rounded-tl-sm'
                }`}
                dangerouslySetInnerHTML={{
                  __html: msg.role === 'user' ? msg.content : renderMarkdown(msg.content),
                }}
              />
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions (show only when 1 message) */}
        {messages.length === 1 && (
          <div className="grid grid-cols-3 gap-2 my-4 flex-shrink-0">
            {SUGGESTIONS.map(s => (
              <button
                key={s.label}
                onClick={() => sendMessage(s.prompt)}
                className="flex items-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/30 rounded-xl text-xs text-gray-400 hover:text-white transition-all text-left"
              >
                <span className="text-base">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex-shrink-0 mt-4">
          <div className="flex items-end gap-3 bg-white/5 border border-white/10 focus-within:border-violet-500/40 rounded-2xl p-3 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about GitHub, logs, incidents, CI/CD, code review... (Enter to send)"
              rows={1}
              disabled={isLoading}
              className="anchor-ai-input flex-1 bg-transparent text-sm text-slate-100 placeholder-gray-500 resize-none font-sans leading-relaxed"
              style={{ maxHeight: 120, overflowY: 'auto' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-500/30 transition-all"
            >
              <Send size={15} className="text-white" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">
            Shift+Enter for new line · Powered by <span className="text-violet-500 font-medium">Anchor AI</span>
          </p>
        </div>
      </div>
    </>
  )
}
