import React, { useState, useEffect } from 'react';
import { Shield, Server, RefreshCw, CheckCircle2, AlertCircle, Play, Info, GitFork, Activity } from 'lucide-react';
import LogInputPanel from './components/LogInputPanel';
import RunbookDisplayPanel from './components/RunbookDisplayPanel';
import WebhookSimulator from './components/WebhookSimulator';
import Chatbot from './components/Chatbot';

// Preset mock data generator for simulation fallback
const MOCK_RESULTS = {
  'faiss-timeout': {
    severity: 'critical',
    summary: 'FAISS Vector Similarity Search Engine Connection Timeout',
    root_cause: "The vector database service ('faiss-service') became unreachable on port 8502 due to a socket connection reset. Gunicorn api-endpoints timed out waiting for similarity index lookup response vectors.",
    fix_steps: [
      "Verify container running state: run `docker ps | grep faiss`.",
      "Check connection socket boundaries: execute `curl http://faiss-service:8502/health`.",
      "Restart vector backend container: run `docker-compose restart faiss-service`.",
      "Clear corrupted cache indices and re-index vector segments.",
      "Verify system status: run verify script `python -m ml_pipeline --test-connection`."
    ],
    costs: { downtime: '$15,200/hr', SLA: 'High', compute: '12% RAM', MTTR: '15m' },
    detailed_runbook: `# Incident Runbook: FAISS Vector Service Socket Timeout (504)\n\n## Description\nCritical failure in vector similarity pipeline. API Gateway endpoints timed out while processing requests requiring vector embeddings lookup from the FAISS database clusters.\n\n## Trigger Condition\nSocket connection reset by peer on port 8502, raising a \`TimeoutError\` in \`ml_pipeline.py\`.\n\n## Immediate Resolution Steps\n- **Step 1:** Restart the FAISS indexing cluster to flush dead file descriptors.\n- **Step 2:** Ensure local DNS binds resolve \`faiss-service\` accurately.\n- **Step 3:** Trigger manual sync sequence to pull fresh embeddings from disk.\n\n## Architectural Prevention\n- Implement circuit breaker patterns using Python's \`pybreaker\` package in the backend endpoint connector.\n- Add a fallback to key-value search if similarity index is offline.`
  },
  'oom-killer': {
    severity: 'critical',
    summary: 'Linux Kernel Out Of Memory (OOM) Killer SIGKILL Process Termination',
    root_cause: "System memory exhaustion (94.8% allocation peak) forced the kernel memory supervisor to issue SIGKILL (Code 9) against the main Gunicorn web worker container process.",
    fix_steps: [
      "Trace OOM kernel logs: run `dmesg -T | grep -i oom`.",
      "Identify memory allocation spike source PID and inspect system resource consumption.",
      "Restart Gunicorn web server stack: run `sudo systemctl restart gunicorn`.",
      "Configure a 2GB swap space: run `sudo dd if=/dev/zero of=/swapfile bs=1M count=2048`.",
      "Reduce model pipeline batch processing allocations from 128 to 64."
    ],
    costs: { downtime: '$28,000/hr', SLA: 'Critical', compute: '98% RAM Peak', MTTR: '8m' },
    detailed_runbook: `# Incident Runbook: Kernel OOM Killer SIGKILL Recoveries\n\n## Description\nThe OS kernel terminated the backend daemon process (PID 18402) after physical RAM exhaustions. Web gateways returned HTTP 502 Bad Gateway to active users.\n\n## Trigger Condition\n\`sys-monitor\` raised memory utilization alert (>94.8% memory leak) followed by immediate connection dropping.\n\n## Immediate Resolution Steps\n- **Step 1:** Force reboot the web container instance to purge cache memory.\n- **Step 2:** Check for model loading leaks. Ensure model files load once on start, not per api-request.\n- **Step 3:** Restructure Python garbage collection cycles using \`import gc; gc.collect()\`.\n\n## Architectural Prevention\n- Set runtime container constraints (\`deploy.resources.limits.memory\`) in Docker Compose config to avoid full-host memory crashes.`
  },
  'claude-rate-limit': {
    severity: 'warning',
    summary: 'Claude API Token Rate Limit Exceeded (HTTP 429)',
    root_cause: "The Anthropic API returned a Too Many Requests error because concurrent runbook generation volume surpassed the organization quota threshold of 40,000 tokens per minute.",
    fix_steps: [
      "Check token quota metrics in the Anthropic Developer Dashboard console.",
      "Add client rate-throttling buffers in `runbook_generator.py` API requests.",
      "Prune raw logs before submission: extract only relevant trace lines, avoiding full database dumps.",
      "Configure redis-backed task queues to stagger concurrent generation operations.",
      "Submit enterprise API tier upgrade request to increase RPM limits."
    ],
    costs: { downtime: '$4,500/hr', SLA: 'Medium', compute: 'Normal', MTTR: '25m' },
    detailed_runbook: `# Incident Runbook: Anthropic API Rate Limit Recovery (429)\n\n## Description\nAI runbook generation backend failed to resolve, raising an \`APIStatusError\` from Anthropic clients. Backoff limits were breached.\n\n## Trigger Condition\nAPI responds with HTTP 429 status code containing rate-limit detail payloads.\n\n## Immediate Resolution Steps\n- **Step 1:** Enable backend fallback to local vector matching to output cached solutions.\n- **Step 2:** Compress prompt inputs. Strip stack traces of non-error boilerplate rows to save 70% token overhead.\n- **Step 3:** Stagger API queues using backoff libraries with jitter.\n\n## Architectural Prevention\n- Establish dual-model fallbacks: dynamically shift queues to Claude-3-Haiku or alternative engines when Sonnet limits are saturated.`
  }
};

export default function App() {
  const [logsText, setLogsText] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  const [simulationMode, setSimulationMode] = useState(false);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'webhooks'

  // Diagnostic ping check on FastAPI backend port 8000
  useEffect(() => {
    const checkBackend = async () => {
      try {
        // Fast ping to health check or analyze stub
        const res = await fetch('http://localhost:8000/health', { method: 'GET', signal: AbortSignal.timeout(2000) });
        setBackendStatus('online');
      } catch (err) {
        setBackendStatus('offline');
        // Enable simulationMode by default if backend is offline to guarantee demo works
        setSimulationMode(true);
      }
    };
    checkBackend();
  }, []);

  const handleAnalyze = async (logs) => {
    setIsLoading(true);
    setLogsText(logs);

    // Identify if the logs match a preset to choose the fallback data
    let matchedPreset = 'faiss-timeout';
    if (logs.includes('SIGKILL') || logs.includes('OOM') || logs.includes('Out of Memory')) {
      matchedPreset = 'oom-killer';
    } else if (logs.includes('Claude') || logs.includes('429') || logs.includes('rate limit')) {
      matchedPreset = 'claude-rate-limit';
    }

    if (simulationMode) {
      // Simulate network delay for realistic experience
      setTimeout(() => {
        setResult(MOCK_RESULTS[matchedPreset]);
        setIsLoading(false);
      }, 1500);
      return;
    }

    // Live backend mode fetch
    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs })
      });

      if (!response.ok) {
        throw new Error(`API returned error status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.warn("Backend request failed, falling back to simulated output.", err);
      // Fallback
      setResult(MOCK_RESULTS[matchedPreset]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateWebhook = (simulatedLogs, sourceName) => {
    // Switch view to dashboard, load logs, and trigger analysis
    setActiveView('dashboard');
    handleAnalyze(simulatedLogs);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 relative overflow-hidden flex flex-col font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-[#090a0f]/85 backdrop-blur-md border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveView('dashboard')}>
            <div className="bg-gradient-to-tr from-violet-500 to-pink-500 p-2.5 rounded-xl text-white shadow-lg shadow-violet-500/20">
              <Shield size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  AegisLog AI
                </h1>
                <span className="text-[10px] bg-violet-500/15 text-violet-400 font-semibold px-2 py-0.5 rounded border border-violet-500/20 uppercase tracking-wider">
                  v1.2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Real-time vector clustering & runbook compilation console</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-6">
            <nav className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'dashboard'
                    ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Incident Analyzer
              </button>
              <button
                onClick={() => setActiveView('webhooks')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'webhooks'
                    ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                GitHub Webhooks
              </button>
            </nav>

            {/* Server Connection Panel */}
            <div className="flex items-center space-x-4 bg-slate-950 px-4 py-1.5 rounded-xl border border-white/5">
              {/* Ping Lights */}
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  backendStatus === 'online' 
                    ? 'bg-green-500 animate-pulse' 
                    : backendStatus === 'offline' 
                    ? 'bg-red-500' 
                    : 'bg-amber-500'
                }`}></span>
                <span className="text-xs text-slate-300 font-mono">
                  FastAPI: {backendStatus === 'online' ? 'Online' : backendStatus === 'offline' ? 'Offline' : 'Checking...'}
                </span>
              </div>

              {/* Mode Toggle Switch */}
              <div className="h-4 w-[1px] bg-white/10"></div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-400 font-mono">Simulation Fallback:</span>
                <button
                  onClick={() => setSimulationMode(!simulationMode)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    simulationMode ? 'bg-violet-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      simulationMode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {activeView === 'dashboard' ? (
          /* Split Grid Layout */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="h-full">
              <LogInputPanel onAnalyze={handleAnalyze} isLoading={isLoading} />
            </div>
            <div className="h-full">
              <RunbookDisplayPanel result={result} isLoading={isLoading} />
            </div>
          </div>
        ) : (
          /* Full Width Webhook Simulation Dashboard */
          <div className="max-w-2xl mx-auto">
            <WebhookSimulator onSimulateLog={handleSimulateWebhook} />
          </div>
        )}
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-white/5 py-4 bg-[#090a0f]/50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-slate-500">
          <span>&copy; 2026 AegisLog Inc. Open-source incident analytics suite.</span>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-slate-300 transition-colors">Documentation</a>
            <a href="#" className="hover:text-slate-300 transition-colors">API Reference</a>
            <a href="#" className="hover:text-slate-300 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

      {/* Global floating AI Chatbot — context-aware with current runbook result */}
      <Chatbot
        currentContext={
          result
            ? `Root Cause: ${result.root_cause || ''}\n\nSeverity: ${result.severity || ''}\n\nFix Steps:\n${(result.fix_steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}`
            : logsText
        }
      />
    </div>
  );
}
