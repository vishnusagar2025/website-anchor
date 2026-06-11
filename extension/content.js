/* Anchor Chrome Extension — GitHub Collaboration Intelligence */
const API = "http://localhost:8000/api";

// ── Detect GitHub page context ─────────────────────────────────────────────
function getPageContext() {
  const parts = location.pathname.split("/").filter(Boolean);
  const ctx = { repo: null, owner: null, filePath: null, branch: null, mode: "repo", prNumber: null };
  if (parts.length >= 2) {
    ctx.owner = parts[0];
    ctx.repo  = `${parts[0]}/${parts[1]}`;
    if (parts[2] === "blob" && parts.length > 4) {
      ctx.branch   = parts[3];
      ctx.filePath = parts.slice(4).join("/");
      ctx.mode     = "file";
    } else if (parts[2] === "pull" && parts[3]) {
      ctx.prNumber = parts[3];
      ctx.mode     = "pr";
    } else if (parts[2] === "compare") {
      ctx.mode = "compare";
    } else if (parts[2] === "tree") {
      ctx.branch = parts[3];
      ctx.mode   = "tree";
    }
  }
  return ctx;
}

// ── Grab code from GitHub file view ───────────────────────────────────────
function grabFileCode() {
  const lines = document.querySelectorAll("td.blob-code, .react-blob-print-hide td");
  if (lines.length > 0) return Array.from(lines).slice(0, 100).map(l => l.innerText).join("\n");
  const raw = document.querySelector(".blob-wrapper pre, .highlight pre");
  return raw ? raw.innerText.slice(0, 3000) : "";
}

// ── Grab diff from PR page ─────────────────────────────────────────────────
function grabPRDiff() {
  const tables = document.querySelectorAll(".diff-table");
  if (!tables.length) return "";
  const lines = [];
  tables[0].querySelectorAll("td.blob-code").forEach(td => lines.push(td.innerText));
  return lines.slice(0, 200).join("\n");
}

// ── Build panel HTML ───────────────────────────────────────────────────────
function buildPanel(ctx) {
  const modeLabel = { file: "📄 File View", pr: "🔀 Pull Request", compare: "⚡ Compare", tree: "📁 Repository", repo: "📁 Repository" };

  return `
  <div id="anchor-header">
    <div class="anchor-logo">
      <div class="anchor-logo-icon">⚓</div>
      <div>
        <div class="anchor-logo-name">Anchor</div>
        <div class="anchor-logo-sub">Zero-Drift Collaboration Intelligence</div>
      </div>
    </div>
    <button id="anchor-close-btn" title="Close">✕</button>
  </div>

  <div id="anchor-context-bar">
    <span class="ctx-icon">🔗</span>
    <span class="ctx-text">${ctx.repo || "GitHub"}</span>
    <span class="ctx-mode">${modeLabel[ctx.mode] || "GitHub"}</span>
  </div>

  <div id="anchor-tabs">
    <button class="anchor-tab active" data-tab="collab">🤝 Collab</button>
    <button class="anchor-tab" data-tab="pipeline">🔍 Analyze</button>
    <button class="anchor-tab" data-tab="predictor">⚡ Pre-Push</button>
    <button class="anchor-tab" data-tab="logs">📋 Logs</button>
  </div>

  <div id="anchor-content">

    <!-- ── COLLAB TAB ─────────────────────────────────── -->
    <div class="anchor-pane active" id="pane-collab">

      <div class="anchor-tip">
        ⚡ Anchor watches your GitHub activity and warns you <strong>before</strong> conflicts happen — so your team merges smoothly.
      </div>

      <div class="anchor-collab-banner">
        <h4>Current Session</h4>
        <div class="anchor-collab-row">
          <span class="anchor-collab-label">📁 Repository</span>
          <span style="color:#58a6ff;font-size:12px;font-weight:600">${ctx.repo || "—"}</span>
        </div>
        <div class="anchor-collab-row">
          <span class="anchor-collab-label">🌿 Branch</span>
          <span style="color:#3fb950;font-size:12px">${ctx.branch || "main"}</span>
        </div>
        <div class="anchor-collab-row">
          <span class="anchor-collab-label">📄 Page Mode</span>
          <span style="color:#d29922;font-size:12px">${modeLabel[ctx.mode]}</span>
        </div>
      </div>

      <div class="anchor-group">
        <label class="anchor-label">Your Branch Name</label>
        <input class="anchor-input" id="collab-branch" placeholder="feature/my-change" value="${ctx.branch || ""}" />
      </div>
      <div class="anchor-group">
        <label class="anchor-label">Target Branch (merging into)</label>
        <input class="anchor-input" id="collab-target" placeholder="main" value="main" />
      </div>
      <div class="anchor-group">
        <label class="anchor-label">Paste Your Git Diff (from git diff main)</label>
        <textarea class="anchor-textarea" id="collab-diff" rows="7" placeholder="Paste your git diff here to check for conflicts before pushing..."></textarea>
      </div>
      <button class="anchor-btn btn-green" id="collab-btn">🛡 Check for Conflicts & Safe to Merge</button>
      <div id="collab-result"></div>
    </div>

    <!-- ── PIPELINE ANALYZE TAB ───────────────────────── -->
    <div class="anchor-pane" id="pane-pipeline">
      <div class="anchor-group">
        <label class="anchor-label">GitHub Repo</label>
        <input class="anchor-input" id="pipe-repo" placeholder="owner/repo" value="${ctx.repo || ""}" />
      </div>
      <div class="anchor-row">
        <div class="anchor-group">
          <label class="anchor-label">File Path</label>
          <input class="anchor-input" id="pipe-path" placeholder="src/app.py" value="${ctx.filePath || ""}" />
        </div>
        <div class="anchor-group">
          <label class="anchor-label">Branch</label>
          <input class="anchor-input" id="pipe-branch" placeholder="main" value="${ctx.branch || "main"}" />
        </div>
      </div>
      <div class="anchor-group">
        <label class="anchor-label">Code Snippet</label>
        <textarea class="anchor-textarea" id="pipe-code" rows="8" placeholder="Paste code or it will auto-load from file view..."></textarea>
      </div>
      <button class="anchor-btn btn-blue" id="pipe-btn">🔍 Analyze Against Pipeline Rules</button>
      <div id="pipe-result"></div>
    </div>

    <!-- ── PRE-PUSH PREDICTOR TAB ─────────────────────── -->
    <div class="anchor-pane" id="pane-predictor">
      <div class="anchor-group">
        <label class="anchor-label">GitHub Repo</label>
        <input class="anchor-input" id="pred-repo" placeholder="owner/repo" value="${ctx.repo || ""}" />
      </div>
      <div class="anchor-group">
        <label class="anchor-label">Pushing to Branch</label>
        <input class="anchor-input" id="pred-branch" placeholder="main" value="main" />
      </div>
      <div class="anchor-group">
        <label class="anchor-label">Git Diff</label>
        <textarea class="anchor-textarea" id="pred-diff" rows="9" placeholder="Paste git diff output here..."></textarea>
      </div>
      <button class="anchor-btn btn-yellow" id="pred-btn">⚡ Predict Failures Before Push</button>
      <div id="pred-result"></div>
    </div>

    <!-- ── LOG INTELLIGENCE TAB ───────────────────────── -->
    <div class="anchor-pane" id="pane-logs">
      <div class="anchor-group">
        <label class="anchor-label">Raw Production Logs</label>
        <textarea class="anchor-textarea" id="log-input" rows="11" placeholder="Paste production logs here (any format, any size)..."></textarea>
      </div>
      <button class="anchor-btn btn-purple" id="log-btn">📋 Generate Incident Runbook</button>
      <div id="log-result"></div>
    </div>

  </div>`;
}

// ── Inject full panel ──────────────────────────────────────────────────────
function injectPanel() {
  if (document.getElementById("anchor-panel")) return;

  // Toggle tab button on right side
  const toggle = document.createElement("div");
  toggle.id = "anchor-toggle";
  toggle.innerHTML = `<span class="toggle-icon">⚓</span><span class="toggle-label">Anchor</span>`;
  toggle.onclick = () => document.getElementById("anchor-panel").classList.toggle("open");
  document.body.appendChild(toggle);

  // Main panel
  const panel = document.createElement("div");
  panel.id = "anchor-panel";
  const ctx = getPageContext();
  panel.innerHTML = buildPanel(ctx);
  document.body.appendChild(panel);

  // Auto-populate from page
  setTimeout(() => {
    if (ctx.mode === "file") {
      const code = grabFileCode();
      if (code) document.getElementById("pipe-code").value = code;
    }
    if (ctx.mode === "pr") {
      const diff = grabPRDiff();
      if (diff) {
        document.getElementById("pred-diff").value = diff;
        document.getElementById("collab-diff").value = diff;
      }
    }
  }, 1200);

  // Close button
  document.getElementById("anchor-close-btn").onclick = () => panel.classList.remove("open");

  // Tabs
  panel.querySelectorAll(".anchor-tab").forEach(tab => {
    tab.onclick = () => {
      panel.querySelectorAll(".anchor-tab").forEach(t => t.classList.remove("active"));
      panel.querySelectorAll(".anchor-pane").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`pane-${tab.dataset.tab}`).classList.add("active");
    };
  });

  // Wire buttons
  document.getElementById("collab-btn").onclick = runCollabCheck;
  document.getElementById("pipe-btn").onclick    = runPipeline;
  document.getElementById("pred-btn").onclick    = runPredictor;
  document.getElementById("log-btn").onclick     = runLogs;
}

// ── API helper ─────────────────────────────────────────────────────────────
async function callAPI(path, payload) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "API error"); }
  return res.json();
}

function showSpinner(id) {
  document.getElementById(id).innerHTML = `<div class="anchor-spinner"><div class="anchor-ring"></div></div>`;
}
function showError(id, msg) {
  document.getElementById(id).innerHTML = `<div class="anchor-error">⛔ ${msg}</div>`;
}
function disableBtn(id) { document.getElementById(id).disabled = true; }
function enableBtn(id)  { document.getElementById(id).disabled = false; }

// ── COLLAB CHECK — core feature ───────────────────────────────────────────
async function runCollabCheck() {
  const repo         = document.getElementById("collab-branch").value.trim();
  const base_branch  = document.getElementById("collab-target").value.trim() || "main";
  const diff         = document.getElementById("collab-diff").value.trim();
  const repoName     = getPageContext().repo || "";

  if (!diff) { showError("collab-result", "Please paste your git diff first."); return; }

  showSpinner("collab-result"); disableBtn("collab-btn");

  try {
    const data = await callAPI("/predictor/predict", {
      repo_full_name: repoName,
      base_branch,
      diff
    });
    renderCollabResult(data);
  } catch (e) {
    showError("collab-result", e.message);
  }
  enableBtn("collab-btn");
}

function renderCollabResult(d) {
  const riskColors = { low: "#3fb950", medium: "#d29922", high: "#f85149", critical: "#ff7b72" };
  const risk       = d.risk_level || "medium";
  const merge      = d.merge_conflict_risk || "medium";
  const rColor     = riskColors[risk]  || "#d29922";
  const mColor     = riskColors[merge] || "#d29922";

  // Conflict meter percentage
  const pct = { low: 10, medium: 45, high: 75, critical: 95 };

  let html = `<div style="margin-top:12px">

    <div class="anchor-card">
      <div class="anchor-card-head">🛡 Merge Safety Report</div>
      <div class="anchor-card-body">

        <div style="display:flex;gap:14px;margin-bottom:10px">
          <div style="flex:1;text-align:center">
            <div style="font-size:10px;color:#8b949e;margin-bottom:4px">OVERALL RISK</div>
            <span class="anchor-badge badge-${risk}">${risk}</span>
          </div>
          <div style="flex:1;text-align:center">
            <div style="font-size:10px;color:#8b949e;margin-bottom:4px">MERGE CONFLICT</div>
            <span class="anchor-badge badge-${merge}">${merge}</span>
          </div>
        </div>

        <div class="conflict-meter">
          <div class="conflict-meter-label">
            <span>Conflict Probability</span>
            <span style="color:${mColor};font-weight:700">${pct[merge] || 45}%</span>
          </div>
          <div class="conflict-meter-bar">
            <div class="conflict-meter-fill" style="width:${pct[merge] || 45}%;background:${mColor}"></div>
          </div>
        </div>

        ${risk === "low" ? `<div style="background:#1a3a1a;border:1px solid #3fb95030;border-radius:6px;padding:8px 10px;font-size:12px;color:#3fb950;margin-top:8px">✅ Safe to merge — no critical conflicts detected</div>` : ""}
        ${risk === "critical" ? `<div style="background:#4a0a0a;border:1px solid #ff7b7230;border-radius:6px;padding:8px 10px;font-size:12px;color:#ff7b72;margin-top:8px">🚨 DO NOT MERGE — critical conflicts will break the build</div>` : ""}
      </div>
    </div>`;

  if (d.ci_failure_predictions?.length) {
    html += `<div class="anchor-card">
      <div class="anchor-card-head">✕ CI Steps That Will Fail</div>
      <div class="anchor-card-body">`;
    d.ci_failure_predictions.forEach(p => {
      html += `<div class="anchor-item"><span style="color:#f85149;flex-shrink:0">✕</span>${p}</div>`;
    });
    html += `</div></div>`;
  }

  if (d.branch_violations?.length) {
    html += `<div class="anchor-card">
      <div class="anchor-card-head">⚠ Branch Protection Violations</div>
      <div class="anchor-card-body">`;
    d.branch_violations.forEach(v => {
      html += `<div class="anchor-item"><span style="color:#d29922;flex-shrink:0">⚠</span>${v}</div>`;
    });
    html += `</div></div>`;
  }

  if (d.recommendations?.length) {
    html += `<div class="anchor-card">
      <div class="anchor-card-head">💡 What to Fix Before Merging</div>
      <div class="anchor-card-body">`;
    d.recommendations.forEach((r, i) => {
      html += `<div class="anchor-item"><span class="anchor-item-num">${i+1}.</span>${r}</div>`;
    });
    html += `</div></div>`;
  }

  html += `</div>`;
  document.getElementById("collab-result").innerHTML = html;
}

// ── Pipeline Analyzer ─────────────────────────────────────────────────────
async function runPipeline() {
  const repo_full_name = document.getElementById("pipe-repo").value.trim();
  const file_path      = document.getElementById("pipe-path").value.trim();
  const code_snippet   = document.getElementById("pipe-code").value.trim();
  if (!repo_full_name || !code_snippet) { showError("pipe-result", "Repo and code are required."); return; }

  showSpinner("pipe-result"); disableBtn("pipe-btn");
  try {
    const data = await callAPI("/pipeline/analyze", { repo_full_name, file_path, code_snippet });
    renderPipelineResult(data);
  } catch(e) { showError("pipe-result", e.message); }
  enableBtn("pipe-btn");
}

function renderPipelineResult(d) {
  const score = d.compliance_score;
  const color = score >= 80 ? "#3fb950" : score >= 50 ? "#d29922" : "#f85149";
  let html = `<div style="margin-top:10px">
    <div class="anchor-card">
      <div class="anchor-card-head">📊 Compliance Score</div>
      <div class="anchor-card-body">
        <div class="anchor-score-big" style="color:${color}">${score}<span style="font-size:18px;color:#8b949e">/100</span></div>
        <div class="anchor-score-bar"><div class="anchor-score-fill" style="width:${score}%;background:${color}"></div></div>
      </div>
    </div>`;

  if (d.violations?.length) {
    html += `<div class="anchor-card"><div class="anchor-card-head">⛔ Violations</div><div class="anchor-card-body">`;
    d.violations.forEach(v => { html += `<div class="anchor-item"><span style="color:#f85149;flex-shrink:0">✕</span>${v}</div>`; });
    html += `</div></div>`;
  }
  if (d.workflow_issues?.length) {
    html += `<div class="anchor-card"><div class="anchor-card-head">⚠ CI/CD Issues</div><div class="anchor-card-body">`;
    d.workflow_issues.forEach(w => { html += `<div class="anchor-item"><span style="color:#d29922;flex-shrink:0">⚠</span>${w}</div>`; });
    html += `</div></div>`;
  }
  if (d.suggestions?.length) {
    html += `<div class="anchor-card"><div class="anchor-card-head">✅ Suggested Fixes</div><div class="anchor-card-body">`;
    d.suggestions.forEach(s => { html += `<div class="anchor-item"><span style="color:#3fb950;flex-shrink:0">✓</span>${s}</div>`; });
    html += `</div></div>`;
  }
  html += `</div>`;
  document.getElementById("pipe-result").innerHTML = html;
}

// ── Pre-Push Predictor ────────────────────────────────────────────────────
async function runPredictor() {
  const repo_full_name = document.getElementById("pred-repo").value.trim();
  const base_branch    = document.getElementById("pred-branch").value.trim() || "main";
  const diff           = document.getElementById("pred-diff").value.trim();
  if (!repo_full_name || !diff) { showError("pred-result", "Repo and diff are required."); return; }

  showSpinner("pred-result"); disableBtn("pred-btn");
  try {
    const data = await callAPI("/predictor/predict", { repo_full_name, base_branch, diff });
    renderCollabResult2("pred-result", data);
  } catch(e) { showError("pred-result", e.message); }
  enableBtn("pred-btn");
}

function renderCollabResult2(id, d) {
  // reuse same renderer but target different div
  const old = document.getElementById("collab-result").innerHTML;
  renderCollabResult(d);
  const html = document.getElementById("collab-result").innerHTML;
  document.getElementById("collab-result").innerHTML = old;
  document.getElementById(id).innerHTML = html;
}

// ── Log Intelligence ──────────────────────────────────────────────────────
async function runLogs() {
  const logs = document.getElementById("log-input").value.trim();
  if (!logs) { showError("log-result", "Please paste some logs."); return; }

  showSpinner("log-result"); disableBtn("log-btn");
  try {
    const data = await callAPI("/logs/analyze", { logs });
    renderLogsResult(data);
  } catch(e) { showError("log-result", e.message); }
  enableBtn("log-btn");
}

function renderLogsResult(d) {
  let html = `<div style="margin-top:10px">
    <div class="anchor-card">
      <div class="anchor-card-head">📋 Summary</div>
      <div class="anchor-card-body" style="font-size:12px;color:#c9d1d9;line-height:1.6">${d.summary}</div>
    </div>
    <div class="anchor-card">
      <div class="anchor-card-head">📊 Stats</div>
      <div class="anchor-card-body" style="display:flex;gap:20px">
        <div><div style="font-size:10px;color:#8b949e">Total Lines</div><div style="font-size:26px;font-weight:900;color:#fff">${d.total_lines}</div></div>
        <div><div style="font-size:10px;color:#8b949e">Incidents</div><div style="font-size:26px;font-weight:900;color:#f85149">${d.incidents.length}</div></div>
      </div>
    </div>`;

  if (d.incidents?.length) {
    d.incidents.forEach((inc) => {
      html += `<div class="anchor-incident">
        <div class="anchor-incident-hd" onclick="this.nextElementSibling.classList.toggle('open')">
          <span class="anchor-badge badge-${inc.severity}">${inc.severity}</span>
          <span class="anchor-incident-pattern">${inc.pattern}</span>
          <span style="color:#8b949e">▾</span>
        </div>
        <div class="anchor-incident-bd">
          <div class="anchor-field-label">Root Cause</div>
          <div class="anchor-field-val">${inc.root_cause}</div>
          <div class="anchor-field-label">Cost Impact</div>
          <div class="anchor-field-val" style="color:#d29922">${inc.cost_impact}</div>
          <div class="anchor-field-label">Recommended Fixes</div>
          ${inc.recommended_fixes.map(f => `<div style="font-size:11px;color:#3fb950;padding:2px 0">✓ ${f}</div>`).join("")}
          <div class="anchor-field-label">Runbook</div>
          ${inc.runbook.map((s,i) => `<div class="anchor-runbook-step"><span class="anchor-runbook-num">${i+1}.</span>${s}</div>`).join("")}
        </div>
      </div>`;
    });
  }
  html += `</div>`;
  document.getElementById("log-result").innerHTML = html;
}

// ── Init & SPA navigation watch ───────────────────────────────────────────
injectPanel();

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    const panel = document.getElementById("anchor-panel");
    if (panel) {
      const ctx = getPageContext();
      panel.innerHTML = buildPanel(ctx);
      setTimeout(() => {
        document.getElementById("anchor-close-btn").onclick = () => panel.classList.remove("open");
        panel.querySelectorAll(".anchor-tab").forEach(tab => {
          tab.onclick = () => {
            panel.querySelectorAll(".anchor-tab").forEach(t => t.classList.remove("active"));
            panel.querySelectorAll(".anchor-pane").forEach(p => p.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById(`pane-${tab.dataset.tab}`).classList.add("active");
          };
        });
        document.getElementById("collab-btn").onclick = runCollabCheck;
        document.getElementById("pipe-btn").onclick    = runPipeline;
        document.getElementById("pred-btn").onclick    = runPredictor;
        document.getElementById("log-btn").onclick     = runLogs;
        if (ctx.mode === "file") {
          const code = grabFileCode();
          if (code) document.getElementById("pipe-code").value = code;
        }
        if (ctx.mode === "pr") {
          const diff = grabPRDiff();
          if (diff) { document.getElementById("pred-diff").value = diff; document.getElementById("collab-diff").value = diff; }
        }
      }, 1400);
    }
  }
}).observe(document.body, { subtree: true, childList: true });
