import React, { useState, useRef, useEffect } from 'react';

// ─── Simple inline markdown renderer ────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    // code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // bullets
    .replace(/^[*\-] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    // line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  return html;
}

// ─── Typing dots animation ───────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={styles.typingBubble}>
      <span style={{ ...styles.dot, animationDelay: '0s' }} />
      <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
      <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
    </div>
  );
}

// ─── Single message bubble ───────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      {!isUser && (
        <div style={styles.avatarAI} title="Anchor AI">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
      )}
      <div
        style={isUser ? styles.userBubble : styles.aiBubble}
        dangerouslySetInnerHTML={{ __html: isUser ? msg.content : renderMarkdown(msg.content) }}
        className="chat-bubble-content"
      />
      {isUser && (
        <div style={styles.avatarUser} title="You">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Main Chatbot component ──────────────────────────────────────────────────
export default function Chatbot({ currentContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "👋 Hi! I'm **Anchor AI**, your DevOps & SRE assistant.\n\nI can help you:\n- 🔍 Analyze logs and diagnose incidents\n- 📋 Explain runbook steps\n- 🛡️ Review code for security & bugs\n- ⚡ Answer general engineering questions\n\nWhat can I help you with today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [contextText, setContextText] = useState('');
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setHasUnread(false);
    }
  }, [isOpen]);

  // If parent passes new context (e.g. a runbook result), pre-fill context
  useEffect(() => {
    if (currentContext) setContextText(currentContext);
  }, [currentContext]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    // History = all messages except the welcome (first) assistant msg
    const historyForAPI = updatedMessages.slice(1, -1); // exclude first greeting + latest user msg

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyForAPI,
          context: contextText.trim() || null,
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            '⚠️ **Backend offline or error.**\n\nMake sure the FastAPI server is running:\n```\nuvicorn main:app --reload\n```',
        },
      ]);
    } finally {
      setIsLoading(false);
      if (!isOpen) setHasUnread(true);
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          "👋 Hi! I'm **Anchor AI**, your DevOps & SRE assistant.\n\nAsk me anything about logs, runbooks, or engineering!",
      },
    ]);
    setContextText('');
  };

  const panelWidth = isExpanded ? 520 : 380;
  const panelHeight = isExpanded ? 640 : 520;

  return (
    <>
      {/* ── Inject animation keyframes ── */}
      <style>{`
        @keyframes anchorDotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes anchorSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes anchorPulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(139,92,246,0.6); }
          70%  { box-shadow: 0 0 0 12px rgba(139,92,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(139,92,246,0); }
        }
        @keyframes anchorFabHover {
          from { transform: scale(1); }
          to   { transform: scale(1.08); }
        }
        .chat-bubble-content code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.82em;
          background: rgba(255,255,255,0.08);
          padding: 2px 6px;
          border-radius: 4px;
          color: #a78bfa;
        }
        .chat-bubble-content pre {
          background: #0b0c10;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 10px 12px;
          overflow-x: auto;
          margin: 8px 0;
          font-size: 0.8em;
          color: #e2e8f0;
        }
        .chat-bubble-content pre code {
          background: transparent;
          padding: 0;
          color: #e2e8f0;
        }
        .chat-bubble-content strong { color: #f1f5f9; }
        .chat-bubble-content em { color: #94a3b8; }
        .chat-bubble-content h1, .chat-bubble-content h2, .chat-bubble-content h3 {
          color: #f1f5f9; margin: 8px 0 4px; font-weight: 600;
        }
        .chat-bubble-content ul { padding-left: 16px; margin: 4px 0; }
        .chat-bubble-content li { margin: 2px 0; color: #cbd5e1; }
        .anchor-chat-input:focus { outline: none; }
        .anchor-send-btn:hover { background: linear-gradient(135deg, #7c3aed, #db2777) !important; }
        .anchor-icon-btn:hover { background: rgba(255,255,255,0.08) !important; color: #f1f5f9 !important; }
        .anchor-fab:hover { animation: anchorFabHover 0.15s ease forwards; }
        .anchor-context-textarea:focus { outline: none; border-color: rgba(139,92,246,0.5) !important; }
        .anchor-clear-btn:hover { background: rgba(239,68,68,0.1) !important; color: #f87171 !important; }
      `}</style>

      {/* ── FAB Toggle Button ── */}
      <button
        id="anchor-chat-fab"
        className="anchor-fab"
        onClick={() => setIsOpen(o => !o)}
        style={styles.fab}
        title="Anchor AI Chat"
        aria-label="Open Anchor AI Chatbot"
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
        {hasUnread && !isOpen && <span style={styles.unreadBadge} />}
      </button>

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div
          id="anchor-chat-panel"
          style={{ ...styles.panel, width: panelWidth, height: panelHeight }}
        >
          {/* Header */}
          <div style={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={styles.headerIcon}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9', letterSpacing: 0.3 }}>Anchor AI</div>
                <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  DevOps Assistant · Online
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {/* Context button */}
              <button
                id="anchor-chat-context-btn"
                className="anchor-icon-btn"
                onClick={() => setShowContextPanel(p => !p)}
                title="Attach log/runbook context"
                style={{ ...styles.iconBtn, color: contextText ? '#a78bfa' : '#64748b', background: contextText ? 'rgba(139,92,246,0.1)' : 'transparent' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              {/* Expand/collapse */}
              <button
                id="anchor-chat-expand-btn"
                className="anchor-icon-btn"
                onClick={() => setIsExpanded(e => !e)}
                title={isExpanded ? 'Collapse' : 'Expand'}
                style={styles.iconBtn}
              >
                {isExpanded ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="21" y2="3"/><line x1="3" y1="21" x2="14" y2="10"/>
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                )}
              </button>
              {/* Clear */}
              <button
                id="anchor-chat-clear-btn"
                className="anchor-icon-btn anchor-clear-btn"
                onClick={clearChat}
                title="Clear conversation"
                style={styles.iconBtn}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Context Panel (collapsible) */}
          {showContextPanel && (
            <div style={styles.contextPanel}>
              <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                ATTACH CONTEXT (paste logs, runbook, or code)
              </div>
              <textarea
                className="anchor-context-textarea"
                value={contextText}
                onChange={e => setContextText(e.target.value)}
                placeholder="Paste logs, error output, runbook text, or code here. The AI will use this as context for your questions..."
                style={styles.contextTextarea}
                rows={4}
              />
              {contextText && (
                <button
                  onClick={() => setContextText('')}
                  style={styles.clearContextBtn}
                >
                  ✕ Clear context
                </button>
              )}
            </div>
          )}

          {/* Messages area */}
          <div style={styles.messagesArea}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={styles.inputArea}>
            <div style={styles.inputRow}>
              <textarea
                id="anchor-chat-input"
                ref={inputRef}
                className="anchor-chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about logs, incidents, code... (Enter to send)"
                rows={1}
                style={styles.textInput}
                disabled={isLoading}
              />
              <button
                id="anchor-chat-send-btn"
                className="anchor-send-btn"
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                style={{
                  ...styles.sendBtn,
                  opacity: isLoading || !input.trim() ? 0.4 : 1,
                  cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                }}
                title="Send message (Enter)"
              >
                {isLoading ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                )}
              </button>
            </div>
            <div style={styles.inputHint}>
              Shift+Enter for new line · Powered by {' '}
              <span style={{ color: '#7c3aed', fontWeight: 600 }}>Anchor AI</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = {
  fab: {
    position: 'fixed',
    bottom: 28,
    right: 28,
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    boxShadow: '0 8px 32px rgba(124,58,237,0.45), 0 2px 8px rgba(0,0,0,0.4)',
    animation: 'anchorPulseRing 2.5s ease-out infinite',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  unreadBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#10b981',
    border: '2px solid #090a0f',
  },
  panel: {
    position: 'fixed',
    bottom: 96,
    right: 28,
    background: 'rgba(10, 11, 18, 0.97)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 20,
    border: '1px solid rgba(139,92,246,0.25)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
    zIndex: 9998,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'anchorSlideUp 0.22s cubic-bezier(0.16,1,0.3,1)',
    transition: 'width 0.25s ease, height 0.25s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'linear-gradient(to right, rgba(124,58,237,0.08), rgba(236,72,153,0.05))',
    flexShrink: 0,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  contextPanel: {
    padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(124,58,237,0.04)',
    flexShrink: 0,
  },
  contextTextarea: {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '8px 10px',
    color: '#cbd5e1',
    fontSize: 11,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    resize: 'none',
    boxSizing: 'border-box',
    lineHeight: 1.5,
    transition: 'border-color 0.15s ease',
  },
  clearContextBtn: {
    marginTop: 6,
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: 10,
    cursor: 'pointer',
    padding: 0,
    fontWeight: 500,
    transition: 'color 0.15s ease',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 14px 8px',
    display: 'flex',
    flexDirection: 'column',
  },
  avatarAI: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    flexShrink: 0,
    marginRight: 8,
    marginTop: 2,
    boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
  },
  avatarUser: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    flexShrink: 0,
    marginLeft: 8,
    marginTop: 2,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  userBubble: {
    maxWidth: '78%',
    background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(236,72,153,0.2))',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: '16px 4px 16px 16px',
    padding: '9px 13px',
    fontSize: 13,
    color: '#f1f5f9',
    lineHeight: 1.55,
  },
  aiBubble: {
    maxWidth: '82%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '4px 16px 16px 16px',
    padding: '9px 13px',
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 1.55,
  },
  typingBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '4px 16px 16px 16px',
    padding: '10px 14px',
    width: 'fit-content',
    marginBottom: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    display: 'inline-block',
    animation: 'anchorDotBounce 1.2s ease-in-out infinite',
  },
  inputArea: {
    padding: '10px 12px 14px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: '6px 6px 6px 12px',
    transition: 'border-color 0.2s ease',
  },
  textInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#f1f5f9',
    fontSize: 13,
    lineHeight: 1.5,
    resize: 'none',
    padding: '4px 0',
    fontFamily: "'Inter', system-ui, sans-serif",
    minHeight: 22,
    maxHeight: 100,
    overflowY: 'auto',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #7c3aed, #db2777)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
    transition: 'all 0.15s ease',
  },
  inputHint: {
    fontSize: 10,
    color: '#334155',
    marginTop: 6,
    paddingLeft: 4,
    textAlign: 'center',
  },
};
