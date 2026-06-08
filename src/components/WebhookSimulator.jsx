import React, { useState } from 'react';
import { Terminal, Send, CheckCircle2, Copy, Info } from 'lucide-react';

export default function WebhookSimulator({ onSimulateLog }) {
  const [copied, setCopied] = useState(false);
  const [event, setEvent] = useState('workflow_run.completed');
  
  const samplePayloads = {
    'workflow_run.completed': {
      event: "workflow_run",
      action: "completed",
      workflow_run: {
        id: 48920194,
        name: "Production Deployment Pipeline",
        status: "completed",
        conclusion: "failure",
        head_branch: "main",
        head_commit: {
          id: "fa82c10b2d",
          message: "release: v2.4.1 hotfix for database sync",
          author: { name: "alex-ops" }
        },
        html_url: "https://github.com/org/repo/actions/runs/48920194"
      },
      repository: {
        full_name: "aegis-enterprise/api-gateway"
      }
    },
    'push': {
      event: "push",
      ref: "refs/heads/main",
      before: "92b314da",
      after: "2d1a3c5f",
      commits: [
        {
          id: "2d1a3c5f",
          message: "fix: crash loop in connection pool initialization",
          timestamp: new Date().toISOString(),
          author: { name: "dev-dan" }
        }
      ],
      repository: {
        full_name: "aegis-enterprise/db-connector"
      }
    }
  };

  const [payloadText, setPayloadText] = useState(
    JSON.stringify(samplePayloads['workflow_run.completed'], null, 2)
  );

  const handleEventChange = (e) => {
    const selectedEvent = e.target.value;
    setEvent(selectedEvent);
    setPayloadText(JSON.stringify(samplePayloads[selectedEvent], null, 2));
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulate = () => {
    try {
      const parsed = JSON.parse(payloadText);
      let simulatedLogs = '';
      
      if (event === 'workflow_run.completed') {
        simulatedLogs = `[2026-06-08T14:20:11.890Z] INFO  [workflow-engine] Starting Job: Production Deployment
[2026-06-08T14:20:14.301Z] INFO  [runner] Pulling image: ghcr.io/aegis-enterprise/api-gateway:fa82c10b2d
[2026-06-08T14:20:17.152Z] INFO  [runner] Container started. Executing npm run db:migrate
[2026-06-08T14:20:18.910Z] ERROR [db-migrations] Migration 20260608_add_user_sessions failed!
[2026-06-08T14:20:18.911Z] FATAL [db-migrations] Connection terminated abnormally. Error code: 57P01 (Admin Shutdown)
[2026-06-08T14:20:19.455Z] ERROR [workflow-engine] Step 'db:migrate' failed with exit code 1.
[2026-06-08T14:20:20.100Z] FATAL [workflow-engine] Workflow run completed conclusion: failure. Triggering runbook generation alert.`;
      } else {
        simulatedLogs = `[2026-06-08T15:05:01.002Z] INFO  [git-receiver] Triggered webhook hook: 2d1a3c5f
[2026-06-08T15:05:03.411Z] INFO  [build-agent] Building app component db-connector...
[2026-06-08T15:05:08.520Z] ERROR [compiler] src/pool.ts(32,15): error TS2304: Cannot find name 'ConnectionPoolManager'.
[2026-06-08T15:05:08.522Z] ERROR [compiler] src/pool.ts(45,8): error TS2339: Property 'initialize' does not exist on type 'never'.
[2026-06-08T15:05:09.110Z] FATAL [build-agent] Compilation failed! Build process aborted. Webhook build fail alert emitted.`;
      }
      
      onSimulateLog(simulatedLogs, `GitHub Webhook: ${event}`);
    } catch (e) {
      alert("Invalid JSON payload! Please check your syntax.");
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-pink-500/10 text-pink-400 p-2 rounded-xl border border-pink-500/20">
            <Terminal size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-white">GitHub Webhook Simulator</h3>
            <p className="text-xs text-slate-400">Test webhook automation flow</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs text-green-400 font-mono">Listener: Active</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Info Box */}
        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3 flex gap-3 text-xs text-slate-300">
          <Info size={16} className="text-pink-400 shrink-0 mt-0.5" />
          <div>
            <p>GitHub Webhooks automatically trigger runbooks when pipelines fail. Copy the webhook details or use the simulation dashboard below to trigger an instant webhook failure log push.</p>
          </div>
        </div>

        {/* Integration Details */}
        <div className="bg-slate-950/80 rounded-xl p-3 border border-white/5 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-mono">Payload URL:</span>
            <div className="flex items-center space-x-2">
              <code className="text-pink-400 bg-pink-950/20 px-2 py-0.5 rounded text-[11px] font-mono">http://localhost:8000/webhook</code>
              <button 
                onClick={() => handleCopy("http://localhost:8000/webhook")}
                className="text-slate-400 hover:text-white transition-colors"
                title="Copy Webhook URL"
              >
                {copied ? <CheckCircle2 size={13} className="text-green-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-mono">Secret:</span>
            <code className="text-slate-300 bg-slate-800/40 px-2 py-0.5 rounded text-[11px]">ae9is_log_webhook_secret_xyz</code>
          </div>
        </div>

        {/* Webhook Payload Simulator Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 font-mono">
            Select Webhook Event Type:
          </label>
          <select 
            value={event}
            onChange={handleEventChange}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-pink-500/50 transition-colors cursor-pointer"
          >
            <option value="workflow_run.completed">GitHub Action: workflow_run.failed</option>
            <option value="push">GitHub Push: code compilation error</option>
          </select>
        </div>

        {/* Payload Text Area */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 font-mono">
            Webhook Event Payload (JSON):
          </label>
          <textarea
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            className="w-full h-32 bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-pink-500/50 transition-colors resize-none"
          />
        </div>

        {/* Trigger Button */}
        <button
          onClick={handleSimulate}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/20 active:scale-[0.98]"
        >
          <Send size={15} />
          <span>Simulate Webhook Trigger</span>
        </button>
      </div>
    </div>
  );
}
