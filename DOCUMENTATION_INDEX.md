# DevGuard AI — Documentation Index

Complete guide to all documentation files and their purposes.

---

## 📚 Documentation Map

### 🚀 Getting Started (Start Here!)

| Document | Purpose | Best For |
|----------|---------|----------|
| **[QUICKSTART.md](QUICKSTART.md)** | 5-minute setup from zero | New users, quick start |
| **[INTEGRATION.md](INTEGRATION.md)** | Full-stack overview & architecture | Understanding the system |

### 🔧 Setup & Configuration

| Document | Purpose | Best For |
|----------|---------|----------|
| **[SETUP.md](SETUP.md)** | Detailed setup instructions | Step-by-step configuration |
| **[.env.template](.env.template)** | Environment variables guide | API key setup |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Deployment strategies | Production deployment |

### 📖 Reference

| Document | Purpose | Best For |
|----------|---------|----------|
| **[API_REFERENCE.md](API_REFERENCE.md)** | REST API documentation | API calls, integration |
| **[IMPLEMENTATION.md](IMPLEMENTATION.md)** | Implementation details | Architecture, code structure |

---

## 🎯 Quick Navigation by Use Case

### "I just cloned this, what do I do?"
1. Read: [QUICKSTART.md](QUICKSTART.md) (5 minutes)
2. Run: `pip install -r requirements.txt && npm install`
3. Setup: `copy .env.template .env` and add API keys
4. Start: `python -m uvicorn main:app --reload` + `npm run dev`
5. Visit: http://localhost:5173

### "I want to understand the architecture"
1. Read: [INTEGRATION.md](INTEGRATION.md) - Full-stack overview
2. Read: [IMPLEMENTATION.md](IMPLEMENTATION.md) - Technical details
3. Browse: Source code (main.py, ml_pipeline.py, etc.)

### "How do I integrate this into my app?"
1. Read: [API_REFERENCE.md](API_REFERENCE.md) - All endpoints
2. Check: [INTEGRATION.md](INTEGRATION.md#-api-integration-points) - Frontend integration
3. Copy: API call examples from documentation

### "I want to deploy this to production"
1. Read: [DEPLOYMENT.md](DEPLOYMENT.md) - All deployment options
2. Choose: Docker, Heroku, AWS, GCP, or Azure
3. Follow: Step-by-step deployment guides

### "Something isn't working"
1. Check: [QUICKSTART.md](QUICKSTART.md#-troubleshooting) - Common issues
2. Check: [SETUP.md](SETUP.md) - Detailed setup guide
3. Check: Log output in terminals (backend & frontend)

---

## 📁 Project Structure

```
Anchor/
│
├── 📚 Documentation (START HERE!)
│   ├── README.md                    # Main README
│   ├── QUICKSTART.md               # 5-minute setup ⭐
│   ├── INTEGRATION.md              # Full-stack overview ⭐
│   ├── SETUP.md                    # Detailed setup
│   ├── DEPLOYMENT.md               # Deployment guide
│   ├── API_REFERENCE.md            # API docs
│   ├── IMPLEMENTATION.md           # Tech details
│   └── DOCUMENTATION_INDEX.md      # You are here!
│
├── 🐍 Backend (Python + FastAPI)
│   ├── main.py                     # FastAPI application (4 endpoints)
│   ├── ml_pipeline.py              # Log analysis & clustering
│   ├── runbook_generator.py        # Incident response runbooks
│   ├── code_analyzer.py            # Code scanning engine
│   ├── ai_service.py               # AI provider abstraction
│   ├── github_service.py           # GitHub API wrapper
│   └── requirements.txt            # Python dependencies
│
├── ⚛️ Frontend (React + Vite)
│   ├── src/
│   │   ├── App.jsx                 # Main app component
│   │   ├── main.jsx                # Entry point
│   │   ├── App.css                 # Styling
│   │   ├── components/             # React components
│   │   ├── assets/                 # Images, icons
│   │   └── index.css               # Global styles
│   ├── public/                     # Static assets
│   ├── index.html                  # HTML template
│   ├── vite.config.js              # Vite configuration
│   ├── package.json                # Node dependencies
│   ├── eslint.config.js            # Linting rules
│   └── package-lock.json           # Locked dependencies
│
├── ⚙️ Configuration
│   ├── .env.template               # Environment template
│   ├── .env                        # Your local config (create this)
│   ├── .gitignore                  # Git ignore rules
│   └── .git/                       # Git repository
│
└── 🛠️ Helper Scripts
    ├── dev.ps1                     # Windows dev launcher
    └── dev.sh                      # Linux/Mac dev launcher
```

---

## 🔄 Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      DevGuard AI Stack                           │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)                                        │
│  http://localhost:5173                                          │
│                                                                  │
│  ├─ Log Analysis UI                                             │
│  ├─ GitHub Repository Scanner                                   │
│  ├─ Pull Request Analysis                                       │
│  └─ Results Dashboard                                           │
└────────────────────┬───────────────────────────────────────────┘
                     │
          HTTP (CORS Enabled)
                     │
┌────────────────────▼───────────────────────────────────────────┐
│  Backend (FastAPI + Uvicorn)                                    │
│  http://localhost:8000                                          │
│                                                                  │
│  ├─ POST /analyze              (log analysis)                   │
│  ├─ POST /analyze/repository   (code scanning)                  │
│  ├─ POST /analyze/pull-request (PR review)                      │
│  ├─ GET /health                (health check)                   │
│  └─ GET /docs                  (Swagger UI)                     │
└────────────────────┬───────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
    ┌───▼───┐   ┌────▼────┐   ┌──▼────┐
    │  ML   │   │   AI    │   │GitHub │
    │Pipeline   │Providers │   │ API   │
    │(logs) │   │(Gemini) │   │       │
    └───────┘   └────┬────┘   └───────┘
                 ┌───▼────┐
                 │ Claude │
                 │(optional)
                 └────────┘
```

---

## 🚀 Common Workflows

### Development

```bash
# Terminal 1: Backend
cd Anchor
python -m uvicorn main:app --reload

# Terminal 2: Frontend  
cd Anchor
npm run dev

# Visit: http://localhost:5173
```

### Testing API

```bash
# Option 1: Swagger UI (Interactive)
http://localhost:8000/docs

# Option 2: cURL
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"log_text":"[ERROR] Database connection failed"}'

# Option 3: Python
import requests
resp = requests.post("http://localhost:8000/analyze",
  json={"log_text": "[ERROR] OOMKilled"})
print(resp.json())
```

### Building for Production

```bash
# Frontend
npm run build
# Creates: dist/ (ready for CDN/nginx)

# Backend
pip install gunicorn
gunicorn -w 4 main:app
# Runs on port 8000 (production-ready)
```

---

## 📊 File Purposes

### Backend Files

| File | Purpose | Key Functions |
|------|---------|----------------|
| `main.py` | FastAPI app entry point | 4 REST endpoints, CORS, error handling |
| `ml_pipeline.py` | Log processing pipeline | Cleaning, embedding, clustering logs |
| `runbook_generator.py` | Incident response | Template-based runbook generation |
| `code_analyzer.py` | Code scanning engine | File/repo/PR analysis with chunking |
| `ai_service.py` | AI provider abstraction | Gemini/Claude integration |
| `github_service.py` | GitHub API wrapper | Repo/PR/file access |
| `requirements.txt` | Python dependencies | All pip packages needed |

### Frontend Files

| File | Purpose | Key Functions |
|------|---------|----------------|
| `App.jsx` | Main app component | Routes, state management |
| `main.jsx` | React entry point | DOM mounting |
| `components/` | React components | UI building blocks |
| `vite.config.js` | Build configuration | Vite settings |
| `package.json` | Node dependencies | npm scripts, packages |

### Configuration Files

| File | Purpose | Notes |
|------|---------|-------|
| `.env` | Runtime environment variables | Create from .env.template |
| `.env.template` | Configuration template | Contains all needed keys |
| `.gitignore` | Git ignore patterns | Excludes secrets, node_modules |
| `vite.config.js` | Frontend build config | Vite-specific settings |

---

## 🔐 Security Considerations

### API Keys
- Store in `.env` (not in code)
- Never commit `.env` to Git
- Rotate keys regularly
- Use service-specific tokens (e.g., GitHub repo access)

### CORS
- Frontend on port 5173
- Backend on port 8000
- CORS headers configured in `main.py`
- Change for production

### Environment
- `ENVIRONMENT=development` for local
- `ENVIRONMENT=production` for deployed

---

## 📞 Getting Help

### Documentation
- **Quick start?** → [QUICKSTART.md](QUICKSTART.md)
- **Setup stuck?** → [SETUP.md](SETUP.md)
- **API question?** → [API_REFERENCE.md](API_REFERENCE.md)
- **Deploy?** → [DEPLOYMENT.md](DEPLOYMENT.md)

### Common Issues
1. Check [QUICKSTART.md#-troubleshooting](QUICKSTART.md#-troubleshooting)
2. Check terminal logs (backend & frontend)
3. Verify `.env` configuration
4. Check if ports are in use

### Debug Mode
```bash
# Backend debug logging
ENVIRONMENT=development python -m uvicorn main:app --reload --log-level debug

# Frontend console
# Press F12 in browser, check console tab
```

---

## 🎓 Learning Path

1. **Complete Beginner?**
   - Start: [QUICKSTART.md](QUICKSTART.md)
   - Time: 5 minutes
   - Result: Running full stack

2. **Want to Understand?**
   - Read: [INTEGRATION.md](INTEGRATION.md)
   - Read: [IMPLEMENTATION.md](IMPLEMENTATION.md)
   - Time: 15 minutes
   - Result: Understanding architecture

3. **Want to Integrate?**
   - Reference: [API_REFERENCE.md](API_REFERENCE.md)
   - Copy: Examples from docs
   - Time: 30 minutes
   - Result: Integrated API calls

4. **Want to Deploy?**
   - Read: [DEPLOYMENT.md](DEPLOYMENT.md)
   - Choose: Deployment platform
   - Time: 1 hour
   - Result: Production deployment

---

## ✅ Checklist for Success

- [ ] Python 3.10+ installed
- [ ] Node.js 18+ installed
- [ ] Dependencies installed: `pip install -r requirements.txt && npm install`
- [ ] `.env` file created from `.env.template`
- [ ] API keys filled in (GitHub token, Gemini key)
- [ ] Backend running: `python -m uvicorn main:app --reload`
- [ ] Frontend running: `npm run dev`
- [ ] Frontend accessible: http://localhost:5173
- [ ] Backend responding: http://localhost:8000/health
- [ ] Ready to use! 🎉

---

## 🎯 Next Steps

1. **Start here:** [QUICKSTART.md](QUICKSTART.md)
2. **Then read:** [INTEGRATION.md](INTEGRATION.md)
3. **Use API:** [API_REFERENCE.md](API_REFERENCE.md)
4. **Deploy:** [DEPLOYMENT.md](DEPLOYMENT.md)

---

**Made with ❤️ for engineers who want to ship fast and break nothing.**