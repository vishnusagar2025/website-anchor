from fastapi import APIRouter, HTTPException
from app.models.schemas import LogAnalysisRequest, LogAnalysisResponse, Incident
from app.services.llm import invoke_llm
import json

router = APIRouter()


@router.post("/analyze", response_model=LogAnalysisResponse)
async def analyze_logs(req: LogAnalysisRequest):
    raw_lines = [l.strip() for l in req.logs.splitlines() if l.strip()]
    if not raw_lines:
        raise HTTPException(status_code=400, detail="No log lines provided")

    representative = raw_lines[:5]
    log_sample = "\n".join(representative)

    prompt = f"""Analyze these logs. Return ONLY JSON.
LOGS: {log_sample}
JSON: {{"summary":"one sentence","incidents":[{{"pattern":"error","root_cause":"cause","severity":"high","recommended_fixes":["fix1"],"cost_impact":"low","runbook":["step1","step2"]}}]}}"""

    raw = invoke_llm(prompt)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        data = json.loads(raw[start:end])
    except Exception:
        data = {"summary": raw[:200], "incidents": []}

    incidents = [Incident(**i) for i in data.get("incidents", [])]

    return LogAnalysisResponse(
        total_lines=len(raw_lines),
        representative_logs=representative,
        incidents=incidents,
        summary=data.get("summary", "")
    )
