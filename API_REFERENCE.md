# DevGuard AI — API Quick Reference

## Base URL
```
http://localhost:8000
```

## Interactive Docs
```
http://localhost:8000/docs        # Swagger UI
http://localhost:8000/redoc       # ReDoc
```

---

## 1️⃣ Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok"
}
```

---

## 2️⃣ Analyze Production Logs
```http
POST /analyze
```

**Request Body:**
```json
{
  "log_text": "string (your log text here)"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "log_text": "ERROR: Database connection pool exhausted\n502 Bad Gateway\nTimeout"
  }'
```

**Response:**
```json
{
  "root_cause": "string",
  "severity": "critical|high|medium|low",
  "affected_services": ["string"],
  "fix_steps": [
    {
      "step": 1,
      "action": "string",
      "command": "string"
    }
  ],
  "prevention": ["string"],
  "estimated_downtime": "string",
  "infra_cost_impact": "string"
}
```

**Status Codes:**
- `200` — Success
- `400` — Missing or empty log_text
- `500` — Internal error

---

## 3️⃣ Analyze GitHub Repository
```http
POST /analyze/repository
```

**Request Body:**
```json
{
  "owner": "string",              // GitHub username or org
  "repo": "string",               // Repository name
  "branch": "string?",            // Optional: branch name
  "max_files": "integer?",        // Optional: max 30 (default: 30)
  "extensions": ["string?"]       // Optional: [".py", ".js", ".ts"]
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/analyze/repository \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "torvalds",
    "repo": "linux",
    "branch": "master",
    "max_files": 10,
    "extensions": [".c"]
  }'
```

**Response:**
```json
{
  "repo": "owner/repo",
  "branch": "string",
  "files_analyzed": 25,
  "total_issues": 12,
  "issues": [
    {
      "file_name": "string",
      "line_number": "string",
      "issue_type": "Bug|Security|Performance|Code Smell|Logic Error",
      "severity": "critical|high|medium|low",
      "explanation": "string",
      "recommended_fix": "string",
      "corrected_code": "string"
    }
  ],
  "summary": {
    "by_severity": {
      "critical": 0,
      "high": 0,
      "medium": 0,
      "low": 0
    },
    "by_type": {
      "Bug": 0,
      "Security": 0,
      "Performance": 0,
      "Code Smell": 0
    }
  },
  "errors": ["string"]
}
```

**Status Codes:**
- `200` — Success
- `400` — Missing required fields
- `401` — GitHub token invalid
- `404` — Repository not found
- `429` — GitHub rate limit exceeded
- `502` — GitHub API error
- `500` — Internal error

---

## 4️⃣ Analyze GitHub Pull Request
```http
POST /analyze/pull-request
```

**Request Body:**
```json
{
  "owner": "string",              // GitHub username or org
  "repo": "string",               // Repository name
  "pr_number": "integer",         // Pull request number (e.g., 1234)
  "extensions": ["string?"]       // Optional: [".py", ".js", ".ts"]
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/analyze/pull-request \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "kubernetes",
    "repo": "kubernetes",
    "pr_number": 120000,
    "extensions": [".go"]
  }'
```

**Response:**
```json
{
  "repo": "owner/repo",
  "pr_number": 1234,
  "pr_title": "string",
  "pr_author": "string",
  "pr_url": "string",
  "files_analyzed": 3,
  "total_issues": 5,
  "issues": [
    {
      "file_name": "string",
      "line_number": "string",
      "issue_type": "Bug|Security|Performance|Code Smell|Logic Error",
      "severity": "critical|high|medium|low",
      "explanation": "string",
      "recommended_fix": "string",
      "corrected_code": "string"
    }
  ],
  "summary": {
    "by_severity": {
      "critical": 0,
      "high": 0,
      "medium": 0,
      "low": 0
    },
    "by_type": {
      "Bug": 0,
      "Security": 0,
      "Performance": 0,
      "Code Smell": 0
    }
  },
  "errors": ["string"]
}
```

**Status Codes:**
- `200` — Success
- `400` — Missing required fields
- `401` — GitHub token invalid
- `404` — Repository or PR not found
- `429` — GitHub rate limit exceeded
- `502` — GitHub API error
- `500` — Internal error

---

## 📋 Issue Type Reference

| Type | Description | Example |
|------|-------------|---------|
| **Security** | Vulnerabilities, credential exposure, unsafe operations | Hardcoded API key, SQL injection |
| **Bug** | Logical errors, unhandled exceptions, incorrect behavior | Null pointer dereference, logic error |
| **Performance** | Inefficient code, memory leaks, slow algorithms | O(n²) loop, memory leak |
| **Code Smell** | Poor practices, maintainability issues | Magic numbers, code duplication |
| **Logic Error** | Incorrect business logic | Wrong formula, off-by-one error |

---

## 🎯 Severity Levels

| Level | Action | Example |
|-------|--------|---------|
| **Critical** | Fix immediately | Hardcoded secrets, SQL injection |
| **High** | Fix ASAP | Buffer overflow, authentication bypass |
| **Medium** | Fix in current sprint | Missing input validation, inefficient query |
| **Low** | Consider for next iteration | Code style, code duplication |

---

## 🔑 Environment Variables

```env
# Required
GITHUB_TOKEN=ghp_xxxxx
GEMINI_API_KEY=AIzaSy_xxxxx
AI_PROVIDER=gemini

# Optional
ANTHROPIC_API_KEY=sk-ant-xxxxx
NOTIFY_ENABLED=false
```

---

## ⏱️ Rate Limits

| Service | Limit | Duration |
|---------|-------|----------|
| Gemini API | 15 requests | per minute |
| GitHub API | 60 requests | per hour (without token) |
| GitHub API | 5,000 requests | per hour (with token) |

---

## 📱 Python Client Example

```python
import requests
import json

BASE_URL = "http://localhost:8000"

# Analyze logs
response = requests.post(
    f"{BASE_URL}/analyze",
    json={"log_text": "ERROR: Database connection failed"}
)
print(json.dumps(response.json(), indent=2))

# Analyze repository
response = requests.post(
    f"{BASE_URL}/analyze/repository",
    json={
        "owner": "python",
        "repo": "cpython",
        "max_files": 10
    }
)
print(json.dumps(response.json(), indent=2))

# Analyze PR
response = requests.post(
    f"{BASE_URL}/analyze/pull-request",
    json={
        "owner": "kubernetes",
        "repo": "kubernetes",
        "pr_number": 120000
    }
)
print(json.dumps(response.json(), indent=2))
```

---

## 🐚 Shell Script Examples

### Analyze Multiple Repos
```bash
#!/bin/bash

repos=(
  "torvalds:linux"
  "python:cpython"
  "kubernetes:kubernetes"
)

for repo in "${repos[@]}"; do
  owner="${repo%:*}"
  repo_name="${repo#*:}"
  echo "Analyzing $owner/$repo_name..."
  curl -s -X POST http://localhost:8000/analyze/repository \
    -H "Content-Type: application/json" \
    -d "{\"owner\": \"$owner\", \"repo\": \"$repo_name\", \"max_files\": 5}" \
    | jq '.summary'
done
```

### Monitor PR Quality
```bash
#!/bin/bash

# Get PR number from command line
PR_NUM=${1:-120000}

curl -X POST http://localhost:8000/analyze/pull-request \
  -H "Content-Type: application/json" \
  -d "{
    \"owner\": \"kubernetes\",
    \"repo\": \"kubernetes\",
    \"pr_number\": $PR_NUM
  }" | jq '.summary | {critical: .by_severity.critical, issues_found: (. | length)}'
```

---

## 🔗 Integration Examples

### GitHub Actions Workflow
```yaml
name: Code Analysis
on: [pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - name: Analyze PR
        run: |
          curl -X POST https://your-server.com/analyze/pull-request \
            -H "Content-Type: application/json" \
            -d '{
              "owner": "${{ github.repository_owner }}",
              "repo": "${{ github.event.repository.name }}",
              "pr_number": ${{ github.event.pull_request.number }}
            }'
```

### Slack Notification
```bash
#!/bin/bash

ANALYSIS=$(curl -s -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"log_text": "ERROR: Service down"}')

ISSUES=$(echo "$ANALYSIS" | jq '.total_issues')
SEVERITY=$(echo "$ANALYSIS" | jq -r '.severity')

curl -X POST $SLACK_WEBHOOK \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"DevGuard Analysis: $ISSUES issues found (severity: $SEVERITY)\"
  }"
```

---

## 📞 Support

- **Docs:** See README.md
- **Setup:** See SETUP.md
- **Issues:** Check troubleshooting in SETUP.md
- **Code:** All source files in this directory

---

**Created for hackathons. Made by engineers. 🚀**