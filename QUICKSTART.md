# ⚡ Quick Start — DevGuard AI

Get your full-stack AI engineering intelligence platform running in **5 minutes**.

---

## 📦 Prerequisites

- ✅ Python 3.10+
- ✅ Node.js 18+
- ✅ npm (comes with Node.js)
- ✅ Git

**Check installed versions:**
```bash
python --version   # Should be 3.10+
node --version     # Should be 18+
npm --version      # Should be 9+
```

---

## 🚀 5-Minute Setup

### Step 1: Navigate to Project (30 seconds)

```bash
cd c:\Users\yogap\OneDrive\Desktop\Anchor
```

### Step 2: Install Dependencies (2 minutes)

```bash
# Install Python backend
pip install -r requirements.txt

# Install Node frontend
npm install
```

**Progress indicators:**
- Backend: "Successfully installed X packages"
- Frontend: "added X packages in Ys"

### Step 3: Configure API Keys (1 minute)

```bash
# Copy template
copy .env.template .env

# Or on Mac/Linux:
cp .env.template .env
```

**Edit `.env` with:**

| Key | Value | Get From |
|-----|-------|----------|
| `GITHUB_TOKEN` | `ghp_...` | [github.com/settings/tokens](https://github.com/settings/tokens) |
| `GEMINI_API_KEY` | `AIzaSy_...` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| `AI_PROVIDER` | `gemini` | (leave as-is) |

### Step 4: Start Services (1.5 minutes)

**Option A: Two Terminal Windows (Recommended)**

```bash
# Terminal 1 - Backend
python -m uvicorn main:app --reload

# Terminal 2 - Frontend
npm run dev
```

**Option B: Single Command (Windows)**

```bash
.\dev.ps1
```

**Option C: Single Command (Linux/Mac)**

```bash
chmod +x dev.sh
./dev.sh
```

### Step 5: Open Application (30 seconds)

In your browser:
```
http://localhost:5173
```

---

## ✅ Verify Everything Works

### Backend Running?
Visit: http://localhost:8000/health

**Expected response:**
```json
{"status": "ok"}
```

### Frontend Running?
Visit: http://localhost:5173

**Expected:** React UI loads

### API Docs?
Visit: http://localhost:8000/docs

**Expected:** Swagger UI with all endpoints

---

## 🎯 Try It Out

### 1. Analyze Production Logs
1. Go to http://localhost:5173
2. Paste sample logs:
```
[ERROR] Database connection timeout at 10:23:45
[ERROR] Unable to acquire connection pool. Timeout after 30 seconds.
[ERROR] Service restart required.
```
3. Click "Analyze"
4. View AI-generated runbook with solutions

### 2. Scan GitHub Repository
1. Enter: `owner/repo` (e.g., `pytorch/pytorch`)
2. Click "Scan Repository"
3. View detected security issues and bugs

### 3. Review Pull Request
1. Enter: `owner/repo` (e.g., `kubernetes/kubernetes`)
2. Enter PR number (e.g., `120000`)
3. Click "Review PR"
4. Get AI analysis of code changes

---

## 📊 What's Running?

| Component | URL | Purpose | Port |
|-----------|-----|---------|------|
| **Frontend** | http://localhost:5173 | React UI (start here!) | 5173 |
| **Backend** | http://localhost:8000 | FastAPI REST API | 8000 |
| **API Docs** | http://localhost:8000/docs | Swagger documentation | 8000 |

---

## 🆘 Troubleshooting

### "Command not found: python"
```bash
# Use python3
python3 -m venv venv
source venv/Scripts/activate  # Windows
```

### "Port 8000 already in use"
```bash
# Kill the process
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or use different port
python -m uvicorn main:app --port 8001
```

### "Cannot find module 'fastapi'"
```bash
# Reinstall dependencies
pip install -r requirements.txt
```

### "API request failed"
Check `.env` file:
- `GITHUB_TOKEN` is not empty
- `GEMINI_API_KEY` is not empty
- Both are correctly copied (no extra spaces)

### "Frontend can't connect to backend"
Make sure both are running and check:
- Backend: Terminal shows "Uvicorn running on 0.0.0.0:8000"
- Frontend: Terminal shows "VITE ... ready in"

---

## 📚 Next Steps

After the quick start:

1. **Customize UI** → Edit `src/App.jsx` and components
2. **Add features** → Extend backend in `main.py`
3. **Deploy** → See [DEPLOYMENT.md](DEPLOYMENT.md)
4. **Full docs** → See [INTEGRATION.md](INTEGRATION.md)
5. **API reference** → See [API_REFERENCE.md](API_REFERENCE.md)

---

## 🐛 Development Tips

### Hot Reload
Both services have auto-reload:
- **Backend:** Edit Python files → automatically reloads
- **Frontend:** Edit React files → automatically updates browser

### View Logs
- **Backend logs:** Check terminal where you ran `uvicorn`
- **Frontend logs:** Check browser console (F12)
- **API errors:** Check http://localhost:8000/docs

### Debug Mode
```bash
# Backend with debug logging
ENVIRONMENT=development python -m uvicorn main:app --reload --log-level debug
```

---

## 🎓 Architecture Quick Overview

```
User's Browser
      ↓
http://localhost:5173
      ↓
   React App
      ↓
HTTP POST/GET requests
      ↓
http://localhost:8000
      ↓
  FastAPI Backend
      ↓
 ┌─────┴─────┐
 ↓           ↓
ML Pipeline  AI Services
(logs)       (Gemini/Claude)
             + GitHub API
```

---

## 💡 Common Tasks

### Change Backend Port
```bash
python -m uvicorn main:app --port 9000
```

### Change Frontend Port
```bash
npm run dev -- --port 3000
```

### Run Tests
```bash
# Backend tests
pytest tests/

# Frontend tests
npm run test
```

### Build for Production
```bash
# Frontend build
npm run build
# Output in: dist/

# Backend with gunicorn
pip install gunicorn
gunicorn -w 4 main:app
```

---

## ❓ Still Have Questions?

- **Full setup:** Read [SETUP.md](SETUP.md)
- **Integration details:** Read [INTEGRATION.md](INTEGRATION.md)
- **Deployment:** Read [DEPLOYMENT.md](DEPLOYMENT.md)
- **API details:** Read [API_REFERENCE.md](API_REFERENCE.md)

---

## 🎉 You're Good to Go!

```
✅ Dependencies installed
✅ Environment configured
✅ Services running
✅ Application accessible
✅ Ready to analyze code!
```

Start using DevGuard AI at: **http://localhost:5173**

---

**Questions? Issues? Check the docs or raise an issue on GitHub.**