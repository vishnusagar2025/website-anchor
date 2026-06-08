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

import ml_pipeline
import runbook_generator
from contextlib import asynccontextmanager

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm the ML model at startup so the first request is instant."""
    print("[startup] Loading sentence-transformer model...")
    ml_pipeline._get_model()          # loads + caches the model now
    print("[startup] Model ready. DevGuard AI is live.")
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
