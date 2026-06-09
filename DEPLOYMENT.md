# Deployment Guide — DevGuard AI Full Stack

Complete guide for deploying DevGuard AI in development, staging, and production environments.

---

## 📋 Table of Contents

1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Cloud Deployment](#cloud-deployment)
4. [Production Configuration](#production-configuration)
5. [Monitoring & Logging](#monitoring--logging)
6. [Troubleshooting](#troubleshooting)

---

## 🖥️ Local Development

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn
- Git

### Setup

```bash
# Clone repository
cd /path/to/Anchor

# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies
npm install

# Configure environment
cp .env.template .env
# Edit .env with your API keys
```

### Running Services

**Option 1: Separate Terminals**

Terminal 1 (Backend):
```bash
python -m uvicorn main:app --reload
```

Terminal 2 (Frontend):
```bash
npm run dev
```

**Option 2: Concurrent (Windows)**
```bash
# PowerShell
.\dev.ps1
```

**Option 3: Concurrent (Linux/Mac)**
```bash
# Bash
chmod +x dev.sh
./dev.sh
```

**Option 4: Using npm**
```bash
# Install concurrently first
npm install --save-dev concurrently

# Then run
npm run dev:all
```

### Access

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## 🐳 Docker Deployment

### Build Docker Images

#### Backend Image

Create `Dockerfile.backend`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ai_service.py .
COPY code_analyzer.py .
COPY github_service.py .
COPY ml_pipeline.py .
COPY runbook_generator.py .
COPY main.py .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Frontend Image

Create `Dockerfile.frontend`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json .
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve to run the app
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - AI_PROVIDER=${AI_PROVIDER:-gemini}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
      - ENVIRONMENT=production
    volumes:
      - ./:/app  # For development hot-reload
    restart: unless-stopped
    networks:
      - devguard
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://backend:8000
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - devguard

  # Optional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
    networks:
      - devguard

networks:
  devguard:
    driver: bridge
```

### Run with Docker Compose

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Build & Push to Docker Hub

```bash
# Login to Docker Hub
docker login

# Build
docker build -f Dockerfile.backend -t your-username/devguard-backend .
docker build -f Dockerfile.frontend -t your-username/devguard-frontend .

# Push
docker push your-username/devguard-backend
docker push your-username/devguard-frontend
```

---

## ☁️ Cloud Deployment

### Heroku (Deprecated, but example structure)

```bash
# Install Heroku CLI
# Create Procfile
cat > Procfile << EOF
web: gunicorn -w 4 -b 0.0.0.0:$PORT main:app
EOF

# Create app
heroku create devguard-ai

# Set environment variables
heroku config:set GITHUB_TOKEN=xxx
heroku config:set GEMINI_API_KEY=xxx

# Deploy
git push heroku main
```

### AWS (ECS + ALB)

**Backend:**
1. Create ECR repository
2. Build and push image: `docker push <ecr-uri>/devguard-backend`
3. Create ECS task definition (reference ECR image)
4. Create ECS service
5. Attach to ALB on port 8000

**Frontend:**
1. Build: `npm run build`
2. Upload `dist/` to S3 bucket
3. Configure CloudFront CDN
4. Set S3 bucket policy for CloudFront access

**Environment Variables:**
- Set in ECS task definition (backend)
- Set in Lambda@Edge or header rules (frontend API URL)

### Google Cloud (Cloud Run)

```bash
# Backend
gcloud run deploy devguard-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars "GITHUB_TOKEN=xxx,GEMINI_API_KEY=xxx" \
  --memory 512Mi

# Frontend (using Cloud Storage + CDN)
npm run build
gsutil -m cp -r dist/* gs://devguard-frontend/
```

### Azure (App Service)

```bash
# Create app service
az appservice plan create -g mygroup -n myplan --sku B1 --is-linux
az webapp create -g mygroup -p myplan -n devguard-ai --runtime "PYTHON|3.10"

# Deploy
az webapp deployment source config-zip -g mygroup -n devguard-ai --src app.zip

# Set environment variables
az webapp config appsettings set -g mygroup -n devguard-ai \
  --settings GITHUB_TOKEN=xxx GEMINI_API_KEY=xxx
```

---

## 🔧 Production Configuration

### Environment Variables

Create `.env.production`:

```env
# Backend
GITHUB_TOKEN=ghp_xxxx
GEMINI_API_KEY=AIzaSy_xxxx
AI_PROVIDER=gemini
ANTHROPIC_API_KEY=sk-ant-xxxx

# App Settings
ENVIRONMENT=production
MAX_FILES_PER_REPO=50
REQUEST_TIMEOUT=30

# Logging
LOG_LEVEL=INFO

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Frontend
VITE_API_URL=https://api.yourdomain.com
```

### Security Headers

Update `main.py`:

```python
# Add security headers middleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["yourdomain.com"])

# Update CORS for production
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    max_age=3600,
)
```

### Rate Limiting

Add to `main.py`:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/analyze")
@limiter.limit("30/minute")
async def analyze_logs(request: Request, logs: LogAnalysisRequest):
    # ...
```

### Database Configuration

```python
# If using PostgreSQL
DATABASE_URL = "postgresql://user:password@host:5432/devguard"

from sqlalchemy import create_engine
engine = create_engine(DATABASE_URL, pool_size=20, max_overflow=40)
```

---

## 📊 Monitoring & Logging

### Logging Configuration

Create `logging.conf`:

```ini
[loggers]
keys=root,devguard

[handlers]
keys=console,file

[formatters]
keys=standard

[logger_root]
level=INFO
handlers=console,file

[logger_devguard]
level=DEBUG
handlers=console,file
qualname=devguard

[handler_console]
class=StreamHandler
level=DEBUG
formatter=standard
args=(sys.stdout,)

[handler_file]
class=FileHandler
level=INFO
formatter=standard
args=('devguard.log',)

[formatter_standard]
format=%(asctime)s - %(name)s - %(levelname)s - %(message)s
```

### APM Integration (Datadog)

```python
from ddtrace import patch_all
from datadog import initialize, api

patch_all()

# In main.py
from fastapi.middleware.base import BaseHTTPMiddleware
import ddtrace

class DatadogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        with ddtrace.tracer.trace("http.request"):
            response = await call_next(request)
            return response

app.add_middleware(DatadogMiddleware)
```

### Health Checks

```python
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health/ready")
async def readiness_check():
    # Check dependencies: DB, cache, external APIs
    try:
        # Check Gemini API
        # Check GitHub API
        # Check any databases
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.get("/health/live")
async def liveness_check():
    # Just check if service is responding
    return {"status": "live"}
```

---

## 🔍 Troubleshooting

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :8000
kill -9 <PID>
```

### CORS Issues

**Error:** "No 'Access-Control-Allow-Origin' header"

**Solution:**
1. Check backend CORS configuration in `main.py`
2. Ensure frontend URL is in `allow_origins`
3. Check for typos in frontend API URL

### Memory Issues

**Error:** "OOMKilled" in Docker

**Solution:**
```yaml
services:
  backend:
    mem_limit: 1g
    memswap_limit: 1g
```

### Database Connection Issues

**Error:** "Connection refused"

**Solution:**
1. Check database is running: `docker ps`
2. Check network connectivity: `docker network ls`
3. Verify connection string in `.env`

### API Rate Limiting

**Error:** "429 Too Many Requests"

**Solution:**
1. Implement exponential backoff
2. Use Gemini (15 RPM) or Claude (rate depends on plan)
3. Cache results when possible

---

## 📚 Additional Resources

- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Vite Build Configuration](https://vitejs.dev/guide/build.html)
- [AWS ECS Deployment](https://docs.aws.amazon.com/AmazonECS/)

---

**Questions? Check SETUP.md for local development or INTEGRATION.md for full-stack overview.**
