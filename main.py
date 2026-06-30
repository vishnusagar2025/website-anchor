"""
main.py — DevGuard AI
FastAPI backend: receives raw logs, runs ML pipeline, returns AI-generated runbook.

Run with:
    uvicorn main:app --reload

The sentence-transformer model is pre-loaded at startup so the first
/analyze request is not slow.
"""

import os
from dotenv import load_dotenv

# Load .env variables BEFORE importing modules that read env vars
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

import ml_pipeline
import runbook_generator
import code_analyzer
import chat_service
from contextlib import asynccontextmanager

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm the ML model at startup so the first request is instant."""
    print("[startup] Loading sentence-transformer model...")
    ml_pipeline._get_model()          # loads + caches the model now
    print("[startup] AI code analysis ready. DevGuard AI is live.")
    yield
    # (shutdown logic can go here if needed)

app = FastAPI(
    title="DevGuard AI",
    description="AI-powered engineering intelligence — log analysis & runbook generation.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # allow all origins (hackathon mode)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    log_text: str


class ChatMessage(BaseModel):
    role: str          # 'user' or 'assistant'
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[list[ChatMessage]] = []
    context: Optional[str] = None  # optional log/runbook text for context injection


class AnalyzeRepositoryRequest(BaseModel):
    owner: str
    repo: str
    branch: Optional[str] = None
    max_files: int = 30
    extensions: Optional[list[str]] = None


class AnalyzePRRequest(BaseModel):
    owner: str
    repo: str
    pr_number: int
    extensions: Optional[list[str]] = None


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

async def analyze_log(log_text: str) -> dict:
    """
    End-to-end analysis pipeline:
      1. ML pipeline extracts representative log lines.
      2. Claude generates a structured runbook from those lines.

    Returns a runbook dict.
    """
    # Step 1 — clean + embed + cluster logs via ML pipeline
    representative_lines = ml_pipeline.get_log_representatives(log_text)

    # Fallback: if ML pipeline returns nothing, use first 20 raw lines
    if not representative_lines:
        representative_lines = [
            line.strip()
            for line in log_text.splitlines()
            if line.strip()
        ][:20]

    # Step 2 — call Claude to generate runbook
    runbook = runbook_generator.generate_runbook(representative_lines)
    return runbook


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Ops"])
async def health_check():
    """Quick health probe — returns 200 OK when the service is running."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Frontend-compatible endpoints (Groq-powered)
# ---------------------------------------------------------------------------

def _groq_chat(system: str, user: str) -> str:
    """Call Groq with a system + user message and return the text response."""
    from groq import Groq
    import json as _json
    client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=2048,
    )
    return resp.choices[0].message.content


class LogsAnalyzeRequest(BaseModel):
    log_text: str


class PipelineAnalyzeRequest(BaseModel):
    repo_full_name: str
    file_path: Optional[str] = None
    code_snippet: str


class PredictorRequest(BaseModel):
    repo_full_name: str
    base_branch: str = "main"
    diff: str


@app.post("/logs/analyze", tags=["Logs"])
async def logs_analyze_endpoint(request: LogsAnalyzeRequest):
    """Analyze production logs and return structured incident data."""
    import json as _json
    if not request.log_text.strip():
        raise HTTPException(status_code=400, detail="log_text must not be empty.")
    lines = [l for l in request.log_text.splitlines() if l.strip()]
    system = (
        "You are a production log analysis expert. Analyze the provided logs and return ONLY valid JSON "
        "with this exact structure (no markdown, no extra text):\n"
        '{"total_lines": <int>, "summary": "<one paragraph summary>", '
        '"representative_logs": ["<log1>", "<log2>", "<log3>"], '
        '"incidents": [{"title": "<title>", "severity": "<critical|high|medium|low>", '
        '"root_cause": "<cause>", "fix_steps": ["step1", "step2"], '
        '"affected_services": ["svc1"]}]}'
    )
    try:
        raw = _groq_chat(system, f"Logs:\n{request.log_text[:3000]}")
        # extract JSON from response
        start = raw.find("{")
        end = raw.rfind("}") + 1
        data = _json.loads(raw[start:end])
        data.setdefault("total_lines", len(lines))
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis error: {exc}")


@app.post("/pipeline/analyze", tags=["Pipeline"])
async def pipeline_analyze_endpoint(request: PipelineAnalyzeRequest):
    """Analyze a code snippet for security, bugs, and compliance issues."""
    import json as _json
    if not request.code_snippet.strip():
        raise HTTPException(status_code=400, detail="code_snippet must not be empty.")
    system = (
        "You are a code security and quality expert. Analyze the provided code snippet and return ONLY valid JSON "
        "with this exact structure (no markdown, no extra text):\n"
        '{"compliance_score": <int 0-100>, '
        '"violations": ["<security issue 1>", "<security issue 2>"], '
        '"workflow_issues": ["<workflow/quality issue 1>", "<workflow/quality issue 2>"], '
        '"suggestions": ["<improvement suggestion 1>", "<improvement suggestion 2>"]}'
    )
    user = f"Repository: {request.repo_full_name}\nFile: {request.file_path or 'unknown'}\n\nCode:\n{request.code_snippet[:3000]}"
    try:
        raw = _groq_chat(system, user)
        start = raw.find("{")
        end = raw.rfind("}") + 1
        data = _json.loads(raw[start:end])
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis error: {exc}")


@app.post("/predictor/predict", tags=["Predictor"])
async def predictor_predict_endpoint(request: PredictorRequest):
    """Predict CI/CD failures and merge conflicts from a git diff."""
    import json as _json
    if not request.diff.strip():
        raise HTTPException(status_code=400, detail="diff must not be empty.")
    system = (
        "You are a CI/CD and git expert. Analyze the provided git diff and predict issues. "
        "Return ONLY valid JSON with this exact structure (no markdown, no extra text):\n"
        '{"risk_level": "<low|medium|high|critical>", '
        '"merge_conflict_risk": "<low|medium|high|critical>", '
        '"ci_failure_predictions": ["<prediction 1>", "<prediction 2>"], '
        '"branch_violations": ["<violation 1>", "<violation 2>"], '
        '"recommendations": ["<recommendation 1>", "<recommendation 2>"]}'
    )
    user = f"Repository: {request.repo_full_name}\nBase branch: {request.base_branch}\n\nDiff:\n{request.diff[:3000]}"
    try:
        raw = _groq_chat(system, user)
        start = raw.find("{")
        end = raw.rfind("}") + 1
        data = _json.loads(raw[start:end])
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")


@app.post("/chat", tags=["Chat"])
async def chat_endpoint(request: ChatRequest):
    """
    Multi-turn GenAI chatbot endpoint.

    **Request body**
    ```json
    {
      "message": "What does this log mean?",
      "history": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}],
      "context": "optional log or runbook text"
    }
    ```

    **Response**
    ```json
    { "reply": "AI response in markdown" }
    ```
    """
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty.")

    # Convert Pydantic models to plain dicts for chat_service
    history_dicts = [
        {"role": msg.role, "content": msg.content}
        for msg in (request.history or [])
    ]

    try:
        reply = chat_service.chat(
            history=history_dicts,
            user_message=request.message,
            context=request.context,
        )
        return {"reply": reply}
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Chat error: {exc}",
        ) from exc


@app.post("/analyze", tags=["Analysis"])
async def analyze_endpoint(request: AnalyzeRequest):
    """
    Analyze production logs and return an AI-generated runbook.

    **Request body**
    ```json
    { "log_text": "<paste raw log lines here>" }
    ```

    **Response** — structured runbook JSON:
    ```json
    {
      "root_cause": "...",
      "severity": "critical|high|medium|low",
      "affected_services": [...],
      "fix_steps": [...],
      "prevention": [...],
      "estimated_downtime": "...",
      "infra_cost_impact": "..."
    }
    ```
    """
    if not request.log_text or not request.log_text.strip():
        raise HTTPException(status_code=400, detail="log_text must not be empty.")

    try:
        runbook = await analyze_log(request.log_text)
        return runbook
    except EnvironmentError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"API key configuration error: {exc}",
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI response parsing error: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Internal error during log analysis: {exc}",
        ) from exc


@app.post("/analyze/repository", tags=["Code Analysis"])
async def analyze_repository_endpoint(request: AnalyzeRepositoryRequest):
    """
    Analyze all source files in a GitHub repository using Gemini AI.

    **Request body**
    ```json
    {
      "owner": "torvalds",
      "repo": "linux",
      "branch": "master",
      "max_files": 30,
      "extensions": [".c", ".h"]
    }
    ```

    **Response** — structured analysis with issues sorted by severity:
    ```json
    {
      "repo": "owner/repo",
      "branch": "main",
      "files_analyzed": 25,
      "total_issues": 12,
      "issues": [
        {
          "file_name": "src/api.py",
          "line_number": "42",
          "issue_type": "Security",
          "severity": "critical",
          "explanation": "...",
          "recommended_fix": "...",
          "corrected_code": "..."
        }
      ],
      "summary": {
        "by_severity": {"critical": 2, "high": 3, "medium": 5, "low": 2},
        "by_type": {"Security": 3, "Bug": 5, ...}
      },
      "errors": []
    }
    ```
    """
    if not request.owner or not request.repo:
        raise HTTPException(
            status_code=400,
            detail="owner and repo are required.",
        )

    try:
        result = code_analyzer.analyze_repository(
            owner=request.owner,
            repo=request.repo,
            extensions=request.extensions,
            max_files=request.max_files,
            branch=request.branch,
        )
        return result
    except code_analyzer.github_service.GitHubRateLimitError as exc:
        raise HTTPException(
            status_code=429,
            detail=f"GitHub API rate limit hit. Retry after {exc.retry_after}s.",
        ) from exc
    except code_analyzer.github_service.GitHubAuthError as exc:
        raise HTTPException(
            status_code=401,
            detail=f"GitHub authentication failed: {exc}",
        ) from exc
    except code_analyzer.github_service.GitHubNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Repository not found: {exc}",
        ) from exc
    except code_analyzer.github_service.GitHubError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"GitHub API error: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Internal error during repository analysis: {exc}",
        ) from exc


@app.post("/analyze/pull-request", tags=["Code Analysis"])
async def analyze_pull_request_endpoint(request: AnalyzePRRequest):
    """
    Analyze changed files in a GitHub pull request using Gemini AI.

    **Request body**
    ```json
    {
      "owner": "torvalds",
      "repo": "linux",
      "pr_number": 1234,
      "extensions": [".py", ".ts"]
    }
    ```

    **Response** — analysis of changed files with issues:
    ```json
    {
      "repo": "owner/repo",
      "pr_number": 1234,
      "pr_title": "Fix memory leak in parser",
      "pr_author": "alice",
      "pr_url": "https://github.com/...",
      "files_analyzed": 3,
      "total_issues": 5,
      "issues": [...],
      "summary": {...},
      "errors": []
    }
    ```
    """
    if not request.owner or not request.repo or request.pr_number < 1:
        raise HTTPException(
            status_code=400,
            detail="owner, repo, and valid pr_number are required.",
        )

    try:
        result = code_analyzer.analyze_pull_request(
            owner=request.owner,
            repo=request.repo,
            pr_number=request.pr_number,
            extensions=request.extensions,
        )
        return result
    except code_analyzer.github_service.GitHubRateLimitError as exc:
        raise HTTPException(
            status_code=429,
            detail=f"GitHub API rate limit hit. Retry after {exc.retry_after}s.",
        ) from exc
    except code_analyzer.github_service.GitHubAuthError as exc:
        raise HTTPException(
            status_code=401,
            detail=f"GitHub authentication failed: {exc}",
        ) from exc
    except code_analyzer.github_service.GitHubNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Resource not found: {exc}",
        ) from exc
    except code_analyzer.github_service.GitHubError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"GitHub API error: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Internal error during PR analysis: {exc}",
        ) from exc
