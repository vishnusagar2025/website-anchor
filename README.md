HEAD
# DevGuard AI — Engineering Intelligence Platform

 **Production breaks. Engineers panic. Anchor fixes it.**

An AI-powered backend service that analyzes production logs and GitHub repositories to detect bugs, security vulnerabilities, performance issues, and generate actionable runbooks. Built for hackathons using **free-tier APIs only**.

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Python 3.10+
- pip or conda
- Git (for cloning)

### 1. Clone & Setup
```bash
cd your-workspace/Anchor
pip install -r requirements.txt
```

### 2. Get Free API Keys (No Credit Card Required)

#### GitHub Personal Access Token
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scope: "repo" (for private repos) or leave blank (public only)
4. Copy the token

#### Google Gemini API Key (Recommended)
1. Go to: https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Copy the key
4. **Free tier:** 15 requests/minute, no credit card required

#### Optional: Anthropic Claude API Key
1. Go to: https://console.anthropic.com
2. Sign up (get $5 free credits)
3. Create API key in the API Keys section
4. Copy the key

### 3. Configure Environment
```bash
cp .env.template .env
```

Edit `.env` and fill in:
```env
GITHUB_TOKEN=ghp_your_token_here
GEMINI_API_KEY=AIzaSy_your_key_here
AI_PROVIDER=gemini  # or "claude"
ANTHROPIC_API_KEY=sk-ant-your_key_here  # only if using claude
```

### 4. Run the Server
```bash
uvicorn main:app --reload
```

Server runs at: http://localhost:8000

API docs at: http://localhost:8000/docs (interactive Swagger UI)

## 📊 API Endpoints

### 1. Health Check
```http
GET /health
```

**Response:**
```json
{ "status": "ok" }
```

---

### 2. Analyze Production Logs → Generate Runbook
```http
POST /analyze
Content-Type: application/json

{
  "log_text": "ERROR: Database connection pool exhausted\n502 Bad Gateway\nTimeout after 30s\n..."
}
```

**Response:**
```json
{
  "root_cause": "Database connection pool exhausted",
  "severity": "critical",
  "affected_services": ["api-gateway", "user-service"],
  "fix_steps": [
    {
      "step": 1,
      "action": "Check active DB connections",
      "command": "SELECT count(*) FROM pg_stat_activity;"
    },
    {
      "step": 2,
      "action": "Kill idle connections",
      "command": "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';"
    }
  ],
  "prevention": ["Set connection pool limits", "Add monitoring alerts"],
  "estimated_downtime": "15-20 minutes",
  "infra_cost_impact": "High — every minute of DB downtime affects all services"
}
```

**Features:**
- Uses ML pipeline to extract representative log lines
- Rule-based or AI-generated runbook generation
- Works **entirely offline** (no API key needed)
- Detects: database, memory, service crashes, disk space, auth issues

---

### 3. Analyze GitHub Repository
```http
POST /analyze/repository
Content-Type: application/json

{
  "owner": "torvalds",
  "repo": "linux",
  "branch": "main",
  "max_files": 30,
  "extensions": [".c", ".h"]
}
```

**Response:**
```json
{
  "repo": "torvalds/linux",
  "branch": "main",
  "files_analyzed": 25,
  "total_issues": 12,
  "issues": [
    {
      "file_name": "kernel/sched.c",
      "line_number": "1234",
      "issue_type": "Security",
      "severity": "critical",
      "explanation": "Hardcoded credentials detected...",
      "recommended_fix": "Move secrets to environment variables...",
      "corrected_code": "password = os.environ.get('DB_PASSWORD')"
    }
  ],
  "summary": {
    "by_severity": {
      "critical": 2,
      "high": 3,
      "medium": 5,
      "low": 2
    },
    "by_type": {
      "Security": 3,
      "Bug": 5,
      "Performance": 2,
      "Code Smell": 2
    }
  },
  "errors": []
}
```

**Features:**
- Analyzes all source files in a repository
- Uses Google Gemini (free) or Claude for AI analysis
- Automatically chunks large files (>200 lines)
- Deduplicates issues across chunks
- Sorts by severity: critical → high → medium → low
- Works with public and private repos (requires GitHub token for private)

---

### 4. Analyze GitHub Pull Request
```http
POST /analyze/pull-request
Content-Type: application/json

{
  "owner": "kubernetes",
  "repo": "kubernetes",
  "pr_number": 112345,
  "extensions": [".go", ".yaml"]
}
```

**Response:**
```json
{
  "repo": "kubernetes/kubernetes",
  "pr_number": 112345,
  "pr_title": "Fix memory leak in pod scheduler",
  "pr_author": "alice",
  "pr_url": "https://github.com/kubernetes/kubernetes/pull/112345",
  "files_analyzed": 3,
  "total_issues": 5,
  "issues": [...],
  "summary": {...},
  "errors": []
}
```

**Features:**
- Analyzes only changed files in PR
- Detects issues that could be introduced by the PR
- Perfect for CI/CD integration (pre-merge quality gate)
- Includes PR metadata (author, title, URL)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FastAPI Backend                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  /health      /analyze      /analyze/repository         │
│   (Ops)       (Log Analysis) (Code Quality)             │
│               /analyze/pull-request                     │
│               (PR Review)                                │
│                                                           │
├─────────────────────────────────────────────────────────┤
│              ML Pipeline & AI Services                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │  Log Analysis Chain  │  │  Code Analysis Chain     │ │
│  ├──────────────────────┤  ├──────────────────────────┤ │
│  │ clean_logs()         │  │ github_service           │ │
│  │ embed_logs() ────────┼──│ ├─ fetch repo files      │ │
│  │ cluster_logs()       │  │ ├─ fetch PR files       │ │
│  │                      │  │ └─ get commits/PRs      │ │
│  │ → representative     │  │                          │ │
│  │   lines             │  │ ai_service (Gemini)      │ │
│  │                      │  │ ├─ analyze_code()       │ │
│  │ runbook_generator() │  │ └─ parse issues         │ │
│  │ ├─ rule-based       │  │                          │ │
│  │ └─ keyword matching │  │ code_analyzer           │ │
│  └──────────────────────┘  │ ├─ analyze_repository() │
│                             │ ├─ analyze_pr()        │ │
│                             │ └─ dedup & sort        │
│                             └──────────────────────────┘
│                                                           │
├─────────────────────────────────────────────────────────┤
│                   External APIs                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  GitHub API    Google Gemini API    Anthropic Claude API│
│  (free)        (free tier 15 RPM)   ($5 free credits)   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 📂 Project Structure

```
Anchor/
├── main.py                  # FastAPI app + endpoints
├── ml_pipeline.py          # Log processing: clean → embed → cluster
├── runbook_generator.py    # Rule-based runbook generation
├── code_analyzer.py        # Code analysis orchestrator
├── ai_service.py           # AI provider abstraction (Gemini/Claude)
├── github_service.py       # GitHub REST API wrapper
├── requirements.txt        # Python dependencies
├── .env.template          # Environment configuration template
├── .env                    # (created by user) Actual configuration
└── README.md              # This file
```

## 🧠 How It Works

### Log Analysis Pipeline
1. **Clean** — Remove empty lines, timestamps, noise
2. **Embed** — Convert logs to 384-dim vectors using `sentence-transformers`
3. **Cluster** — Use KMeans + FAISS to find representative logs
4. **Generate Runbook** — Match patterns against rule templates
   - Detects: database issues, OOMKilled, service crashes, disk full, auth failures
   - Returns: root cause, severity, fix steps, prevention measures

### Code Analysis Pipeline
1. **Fetch Repository** — Use GitHub API to get file list
2. **Download Files** — Get source code content
3. **Chunk Large Files** — Split >200 line files into overlapping windows
4. **Analyze with Gemini/Claude** — AI detects issues:
   - Security vulnerabilities
   - Logical bugs
   - Performance problems
   - Code smells
5. **Deduplicate & Sort** — Remove duplicates, sort by severity
6. **Return Issues** — Structured JSON with line numbers & fixes

## 🔐 Security Features

✅ **No Hardcoded Secrets** — Uses environment variables  
✅ **GitHub Token Safety** — Optional, supports public repos without token  
✅ **Free APIs Only** — No paid services, no billing surprises  
✅ **CORS Enabled** — Safe for frontend integration  
✅ **Error Handling** — Graceful failures, never crashes  
✅ **Rate Limit Aware** — Handles GitHub & Gemini rate limits  

## 🛠️ Development

### Run Tests (example)
```bash
# Test an endpoint
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"log_text": "ERROR: Database connection failed"}'
```

### Enable Debug Logging
```bash
# In main.py, set:
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Switch AI Provider
```bash
# In .env, change:
AI_PROVIDER=claude  # from "gemini"
# (make sure ANTHROPIC_API_KEY is set)

# Then restart the server
```

## 📊 Cost Analysis (Free Tier)

| Service | Free Tier | Limit | Cost |
|---------|-----------|-------|------|
| GitHub API | ✅ Yes | 60 req/hr | $0 |
| Google Gemini | ✅ Yes | 15 req/min | $0 |
| Anthropic Claude | ✅ Yes ($5) | 5 req/min | $0 (for hackathon) |
| Sentence Transformers | ✅ Yes | Unlimited | $0 |
| FAISS | ✅ Yes | Unlimited | $0 |

**Total Cost for Hackathon:** $0 (entirely free tier)

## 🐛 Troubleshooting

### "ModuleNotFoundError: No module named 'xxx'"
```bash
pip install -r requirements.txt
```

### "GitHub API rate limit exceeded"
- Use a GitHub token: https://github.com/settings/tokens
- Or wait 1 hour for rate limit reset

### "Invalid or expired GitHub token"
- Token format should start with `ghp_`
- Regenerate at: https://github.com/settings/tokens

### "Gemini API key not found"
- Make sure `.env` has `GEMINI_API_KEY=AIzaSy...`
- Restart the server after changing `.env`

### "Model not found: gemini-2.5-flash"
- Update `google-generativeai`: `pip install --upgrade google-generativeai`

## 🎓 Learning Resources

- **FastAPI Docs:** https://fastapi.tiangolo.com
- **Sentence Transformers:** https://www.sbert.net
- **FAISS:** https://github.com/facebookresearch/faiss
- **GitHub API:** https://docs.github.com/en/rest
- **Google Gemini:** https://ai.google.dev
- **Anthropic Claude:** https://docs.anthropic.com

## 📝 License

Created for educational & hackathon purposes.

## 🤝 Contributing

Ideas? Issues? Improvements?  
This is open source. Feel free to fork, modify, and submit PRs!

---

**Made with ❤️ for hackers who want to ship fast and break nothing.**
=======
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
origin/frontend
