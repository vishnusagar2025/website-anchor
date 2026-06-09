# DevGuard AI — Full-Stack Integration Guide

> **Production breaks. Engineers panic. Anchor fixes it.**

Complete AI-powered engineering intelligence platform with **Frontend + Backend** integration.

---

## 🎯 What You Have

### **Frontend** (React + Vite)
- Modern UI for log analysis
- GitHub repository scanner interface
- PR analysis dashboard
- Real-time results display

### **Backend** (FastAPI)
- Production log analysis with ML
- GitHub code scanning with AI
- Pull request review automation
- Free-tier APIs (Gemini + Claude)

---

## 🚀 Quick Start (3 steps, 5 minutes)

### **Step 1: Install Dependencies**

```bash
# Navigate to project
cd c:\Users\yogap\OneDrive\Desktop\Anchor

# Install both backend and frontend dependencies
pip install -r requirements.txt
npm install
```

### **Step 2: Configure Environment Variables**

```bash
# Copy template
copy .env.template .env

# Edit .env and add:
GITHUB_TOKEN=ghp_xxxxx              # https://github.com/settings/tokens
GEMINI_API_KEY=AIzaSy_xxxxx         # https://aistudio.google.com/app/apikey
AI_PROVIDER=gemini
```

### **Step 3: Run Both Services**

#### **Option A: Run Separately (Recommended for Development)**

**Terminal 1 - Backend:**
```bash
python -m uvicorn main:app --reload
```
Backend runs at: **http://localhost:8000**

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Frontend runs at: **http://localhost:5173**

#### **Option B: Run Concurrently (All in One)**

```bash
# PowerShell (Windows)
npm run dev:all

# Or bash (Linux/Mac)
npm run dev:all:unix
```

---

## 🌐 Access the Application

Once both are running:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:5173 | Main UI - **START HERE** ⭐ |
| **Backend API** | http://localhost:8000 | REST API |
| **API Docs** | http://localhost:8000/docs | Swagger UI (API testing) |
| **Health Check** | http://localhost:8000/health | Backend status |

---

## 📊 Full-Stack Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DevGuard AI Application                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Frontend (React + Vite)                 │   │
│  │  http://localhost:5173                               │   │
│  │  ├─ Log Analysis UI                                  │   │
│  │  ├─ GitHub Repo Scanner                             │   │
│  │  ├─ PR Analysis Dashboard                           │   │
│  │  └─ Results Display & Export                        │   │
│  └────────────────────────┬─────────────────────────────┘   │
│                           │                                  │
│                    HTTP Requests                            │
│                    (CORS Enabled)                           │
│                           │                                  │
│  ┌────────────────────────┴─────────────────────────────┐   │
│  │              Backend (FastAPI)                       │   │
│  │  http://localhost:8000                               │   │
│  │  ├─ POST /analyze (logs → runbook)                  │   │
│  │  ├─ POST /analyze/repository (code scan)            │   │
│  │  ├─ POST /analyze/pull-request (PR review)          │   │
│  │  └─ GET /health (status check)                      │   │
│  └────────────────────────┬─────────────────────────────┘   │
│                           │                                  │
│          ┌────────────────┼────────────────┐               │
│          │                │                │               │
│      ML Pipeline      GitHub API        AI Providers       │
│   (sentence-trans)    (repos/PRs)    (Gemini/Claude)      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```
Anchor/
├── Backend (Python)
│   ├── main.py                  # FastAPI app
│   ├── ml_pipeline.py          # Log processing
│   ├── runbook_generator.py    # Incident response
│   ├── code_analyzer.py        # Code analysis
│   ├── ai_service.py           # AI integration
│   ├── github_service.py       # GitHub API
│   └── requirements.txt        # Python dependencies
│
├── Frontend (React + Vite)
│   ├── src/
│   │   ├── App.jsx            # Main component
│   │   ├── components/        # React components
│   │   ├── assets/            # Images, logos
│   │   ├── main.jsx          # Entry point
│   │   └── App.css           # Styles
│   ├── public/                # Static files
│   ├── package.json          # Node dependencies
│   ├── vite.config.js        # Vite config
│   └── index.html            # HTML template
│
├── Configuration
│   ├── .env                  # Environment variables
│   ├── .env.template        # Template
│   └── .gitignore          # Git ignore
│
└── Documentation
    ├── README.md             # Main docs
    ├── SETUP.md             # Setup guide
    ├── API_REFERENCE.md     # API docs
    └── IMPLEMENTATION.md    # Implementation
```

---

## 🔄 API Integration Points

### **Frontend → Backend Communication**

The frontend calls these backend endpoints:

#### **1. Log Analysis**
```javascript
const response = await fetch('http://localhost:8000/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ log_text: userLogs })
});
const runbook = await response.json();
```

#### **2. Repository Analysis**
```javascript
const response = await fetch('http://localhost:8000/analyze/repository', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    owner: 'pytorch',
    repo: 'pytorch',
    max_files: 30
  })
});
const issues = await response.json();
```

#### **3. PR Analysis**
```javascript
const response = await fetch('http://localhost:8000/analyze/pull-request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    owner: 'kubernetes',
    repo: 'kubernetes',
    pr_number: 120000
  })
});
const prIssues = await response.json();
```

---

## 🔐 Security Configuration

### **CORS (Cross-Origin Resource Sharing)**
The backend is configured to accept requests from the frontend:
- ✅ Frontend: http://localhost:5173
- ✅ Backend: http://localhost:8000
- ✅ All origins allowed (hackathon mode)

To restrict in production, edit `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📝 Environment Variables

Create `.env` file:

```env
# ─── Backend Configuration ─────────────────────────────────
# GitHub API
GITHUB_TOKEN=ghp_your_token_here

# AI Provider (gemini or claude)
AI_PROVIDER=gemini

# Google Gemini API
GEMINI_API_KEY=AIzaSy_your_key_here

# Anthropic Claude (optional)
ANTHROPIC_API_KEY=sk-ant-your_key_here

# ─── Frontend Configuration ────────────────────────────────
# Backend API URL (used by frontend)
VITE_API_URL=http://localhost:8000

# ─── Application Settings ────────────────────────────────
ENVIRONMENT=development
```

---

## 🧪 Testing the Integration

### **1. Start Backend**
```bash
python -m uvicorn main:app --reload
```
Wait for: `INFO: Application startup complete`

### **2. Start Frontend**
```bash
npm run dev
```
Wait for: `VITE v... ready in ... ms`

### **3. Open Frontend**
```
http://localhost:5173
```

### **4. Test Each Feature**
- ✅ Analyze production logs
- ✅ Scan GitHub repositories
- ✅ Review pull requests
- ✅ View results and runbooks

---

## 🛠️ Development Workflow

### **Making Changes to Backend**

```bash
# Backend auto-reloads with --reload flag
# Edit Python files → changes apply immediately

# Example: Edit main.py
# → Server reloads automatically
```

### **Making Changes to Frontend**

```bash
# Frontend hot-reloads with Vite
# Edit React components → changes apply instantly

# Example: Edit src/App.jsx
# → Browser updates automatically
```

---

## 📊 Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",                           # Run frontend only
    "dev:all": "concurrently npm:*",         # Run both (Windows)
    "dev:all:unix": "concurrently npm:*",    # Run both (Linux/Mac)
    "build": "vite build",                   # Build for production
    "preview": "vite preview",               # Preview production build
    "lint": "eslint . --ext .js,.jsx"       # Lint code
  }
}
```

---

## 🐳 Docker (Optional)

For containerized deployment:

```dockerfile
# Backend
FROM python:3.10
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]

# Frontend
FROM node:18
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "run", "preview"]
```

---

## 🚀 Production Deployment

### **Backend (FastAPI)**
```bash
# Install production server
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

### **Frontend (React)**
```bash
# Build for production
npm run build

# Serve with nginx (or any static server)
# dist/ folder contains production build
```

---

## ✅ Troubleshooting

### **"Cannot GET /" on Frontend**
- Make sure Vite dev server is running: `npm run dev`
- Check if running on port 5173

### **"Connection refused" in Frontend**
- Backend not running: Start with `python -m uvicorn main:app --reload`
- Check if running on port 8000

### **"CORS error" in Browser Console**
- Backend CORS not configured
- Or backend URL is wrong in frontend

### **Module not found (Backend)**
- Run: `pip install -r requirements.txt`

### **npm dependencies missing (Frontend)**
- Run: `npm install`

### **Port already in use**
- Backend: Change port: `uvicorn main:app --port 8001`
- Frontend: Change port: `npm run dev -- --port 5174`

---

## 📞 Quick Commands

```bash
# Setup
cd c:\Users\yogap\OneDrive\Desktop\Anchor
pip install -r requirements.txt
npm install
copy .env.template .env

# Run backend
python -m uvicorn main:app --reload

# Run frontend
npm run dev

# Test API
curl http://localhost:8000/health

# Check logs
# Backend: See terminal output
# Frontend: See browser console
```

---

## 🎓 Next Steps

1. **Customize the UI** — Edit React components in `src/components/`
2. **Add features** — Extend backend endpoints in `main.py`
3. **Connect database** — Add persistence layer
4. **Deploy** — Use Docker + cloud platform
5. **Integrate notifications** — Slack/Email alerts

---

## 📚 Documentation Links

- **Backend Setup:** See [SETUP.md](SETUP.md)
- **API Reference:** See [API_REFERENCE.md](API_REFERENCE.md)
- **Implementation:** See [IMPLEMENTATION.md](IMPLEMENTATION.md)

---

## 🎉 You're All Set!

Frontend and backend are fully integrated. Start both services and enjoy your DevGuard AI application!

**Frontend:** http://localhost:5173 ⭐  
**Backend API:** http://localhost:8000

---

**Made with ❤️ for hackers who want to ship fast and break nothing.**