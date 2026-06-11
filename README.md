# Anchor — Zero-Drift Engineering Intelligence

AI-powered developer assistant that prevents deployment failures before code reaches production.

## Features

| Module | Description |
|---|---|
| **Pipeline Analyzer** | Checks code against GitHub Actions workflows and lint rules |
| **Pre-Push Predictor** | Predicts CI/CD failures and merge conflicts from a git diff |
| **Log Intelligence** | Compresses production logs into AI-generated incident runbooks |

## Tech Stack

- **Backend**: Python, FastAPI, async
- **AI**: Amazon Bedrock (Claude 3), sentence-transformers, FAISS
- **Frontend**: React 18, Vite, Tailwind CSS
- **Integration**: GitHub API (PyGithub)
- **Deployment**: Docker, Docker Compose

---

## Quick Start

### 1. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```
GITHUB_TOKEN=ghp_your_token_here
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

> Your GitHub token needs `repo` and `read:org` scopes.
> AWS credentials must be configured with Bedrock access (`~/.aws/credentials`).

### 2. Run with Docker (recommended)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 3. Run locally (without Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/pipeline/analyze` | Analyze code vs pipeline rules |
| POST | `/api/predictor/predict` | Predict push failures from diff |
| POST | `/api/logs/analyze` | Analyze and cluster production logs |
| GET | `/health` | Health check |

---

## AWS Bedrock Setup

1. Enable Claude 3 Sonnet in AWS Bedrock console (us-east-1)
2. Ensure your IAM role/user has `bedrock:InvokeModel` permission
3. Configure AWS CLI: `aws configure`

---

## Architecture

```
Developer
    │
    ▼
React Dashboard (port 3000)
    │
    ▼ REST API
FastAPI Backend (port 8000)
    ├── /api/pipeline  ──► GitHub API ──► Amazon Bedrock (Claude)
    ├── /api/predictor ──► GitHub API ──► Amazon Bedrock (Claude)
    └── /api/logs      ──► FAISS + sentence-transformers ──► Amazon Bedrock (Claude)
```
