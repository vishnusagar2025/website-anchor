from fastapi import APIRouter
from app.models.schemas import PipelineAnalysisRequest, PipelineAnalysisResponse
from app.services.github_service import get_repo_context
from app.services.llm import invoke_llm
import json

router = APIRouter()


@router.post("/analyze", response_model=PipelineAnalysisResponse)
async def analyze_pipeline(req: PipelineAnalysisRequest):
    try:
        repo_ctx = get_repo_context(req.repo_full_name)
    except Exception:
        repo_ctx = {"name": req.repo_full_name, "workflows": [], "branch_protection": None, "lint_configs": []}

    prompt = f"""Review this code for security issues. Return ONLY JSON, no explanation.

CODE:
{req.code_snippet[:500]}

Return this exact JSON:
{{"violations":["issue1","issue2"],"suggestions":["fix1","fix2"],"workflow_issues":[],"compliance_score":50}}"""

    raw = invoke_llm(prompt)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        data = json.loads(raw[start:end])
    except Exception:
        data = {"violations": ["Could not parse response"], "suggestions": [raw[:300]], "workflow_issues": [], "compliance_score": 50}

    return PipelineAnalysisResponse(**data)
