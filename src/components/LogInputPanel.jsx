import React, { useState } from 'react';
import { FileText, Cpu, Server, Play, Trash2, ShieldAlert } from 'lucide-react';

const PRESETS = [
  {
    id: 'faiss-timeout',
    title: 'FAISS Database Timeout',
    description: 'Connection drops & vector lookup timeouts',
    icon: Server,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    hoverColor: 'hover:border-violet-500/40 hover:bg-violet-500/5',
    logs: `[2026-06-08 21:00:01] INFO  [ml-pipeline] Initializing FAISS indexing update...
[2026-06-08 21:00:02] INFO  [ml-pipeline] Loading vector embeddings for document cluster (size=10500)
[2026-06-08 21:00:15] ERROR [ml-pipeline] Connection reset by peer: faiss-service:8502
[2026-06-08 21:00:15] WARN  [ml-pipeline] Retrying connection in 2s (Attempt 1/3)
[2026-06-08 21:00:17] ERROR [ml-pipeline] Connection attempt failed. Host 'faiss-service' unreachable.
[2026-06-08 21:00:25] ERROR [ml-pipeline] Fatal Exception: Timeout waiting for response from FAISS cluster service.
[2026-06-08 21:00:25] FATAL [main] Server failed to process vector similarity search endpoint. HTTP 504 Gateway Timeout.`
  },
  {
    id: 'oom-killer',
    title: 'OOM Killer Triggered',
    description: 'Critical kernel memory exhaustion',
    icon: Cpu,
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
    hoverColor: 'hover:border-red-500/40 hover:bg-red-500/5',
    logs: `[2026-06-08 20:45:12] INFO  [worker-4] Allocating batch buffer for model inference (batch_size=128)
[2026-06-08 20:45:15] WARN  [sys-monitor] Memory utilization exceeded threshold (Active RAM: 94.8%)
[2026-06-08 20:45:18] INFO  [kernel] Out of Memory: Kill process 18402 (gunicorn-worker) score 950 or sacrifice child
[2026-06-08 20:45:18] CRIT  [kernel] Killed process 18402 (gunicorn-worker) total-vm:4194304kB, anon-rss:3294812kB, file-rss:0kB
[2026-06-08 20:45:19] CRIT  [main] Daemon process exited unexpectedly with code 9 (killed by SIGKILL).
[2026-06-08 20:45:20] FATAL [main] Service terminated. Web server crashed due to kernel memory exhaustion.`
  },
  {
    id: 'claude-rate-limit',
    title: 'Claude API Rate Limit',
    description: 'Runbook API tier billing & limit breaches',
    icon: ShieldAlert,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    hoverColor: 'hover:border-amber-500/40 hover:bg-amber-500/5',
    logs: `[2026-06-08 19:12:00] INFO  [runbook-gen] Processing request payload size: 8402 tokens
[2026-06-08 19:12:01] INFO  [runbook-gen] Forwarding prompt to Anthropic Claude-3-5-Sonnet endpoint...
[2026-06-08 19:12:01] ERROR [anthropic-client] API responded with status 429: Too Many Requests
[2026-06-08 19:12:01] ERROR [anthropic-client] Detail: Rate limit exceeded for model 'claude-3-5-sonnet'. Limit: 40000 tokens per minute. Current usage: 42100 tokens per minute.
[2026-06-08 19:12:02] WARN  [runbook-gen] Anthropic API failed. Retrying with exponential backoff (delay: 4.5s)
[2026-06-08 19:12:06.500] ERROR [anthropic-client] Retry failed. API responded with status 429: Too Many Requests
[2026-06-08 19:12:06.502] FATAL [runbook-gen] Runbook generator aborted. API rate limit exceeded. SLA impact: HIGH.`
  }
];

export default function LogInputPanel({ onAnalyze, isLoading }) {
  const [logs, setLogs] = useState('');

  const handlePresetSelect = (presetLogs) => {
    setLogs(presetLogs);
  };

  const handleAnalyze = () => {
    if (!logs.trim()) return;
    onAnalyze(logs);
  };

  const handleClear = () => {
    setLogs('');
  };

  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col h-full min-h-[580px]">
      {/* Background glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-white/5 pb-4 mb-4">
        <div className="bg-violet-500/10 text-violet-400 p-2 rounded-xl border border-violet-500/20">
          <FileText size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-white">Log Input Console</h3>
          <p className="text-xs text-slate-400">Paste logs or load preset incidents</p>
        </div>
      </div>

      {/* Demo Preset Cards */}
      <div className="mb-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 font-mono">
          Demo Log Scenarios
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset.logs)}
                className={`glass-card rounded-xl p-2.5 text-left border flex flex-col items-start gap-1 transition-all duration-200 cursor-pointer ${preset.color} ${preset.hoverColor} group`}
              >
                <div className="flex items-center justify-between w-full">
                  <Icon size={16} className="transition-transform group-hover:scale-110" />
                  <span className="text-[10px] uppercase font-bold tracking-wide text-slate-400">load</span>
                </div>
                <h4 className="font-medium text-xs text-slate-200 truncate w-full mt-1.5">{preset.title}</h4>
                <p className="text-[10px] text-slate-400 line-clamp-1 w-full">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Log Textarea */}
      <div className="flex-1 flex flex-col">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
          Raw Log Stream
        </label>
        <div className="flex-1 relative">
          <textarea
            value={logs}
            onChange={(e) => setLogs(e.target.value)}
            placeholder="Paste application logs, kernel dumps, or database trace records here..."
            className="w-full h-full min-h-[260px] bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-violet-500/50 transition-colors resize-none leading-relaxed"
          />
          {logs && (
            <button
              onClick={handleClear}
              className="absolute bottom-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/5"
              title="Clear Input"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !logs.trim()}
          className={`w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white rounded-xl py-3 text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none ${
            isLoading ? 'animate-pulse' : ''
          }`}
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Analyzing Logs with Claude...</span>
            </>
          ) : (
            <>
              <Play size={15} />
              <span>Analyze & Generate Runbook</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
