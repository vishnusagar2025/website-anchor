from fastapi import APIRouter
from app.models.schemas import PrePushRequest, PrePushResponse
from app.services.github_service import get_repo_context
from app.services.llm import invoke_llm
import json

router = APIRouter()


@router.post("/predict", response_model=PrePushResponse)
async def predict_push(req: PrePushRequest):
    try:
        repo_ctx = get_repo_context(req.repo_full_name)
    except Exception:
        repo_ctx = {"name": req.repo_full_name, "workflows": [], "branch_protection": None, "lint_configs": []}

    prompt = f"""Analyze this git diff for risks. Return ONLY JSON.
DIFF: {req.diff[:300]}
JSON: {{"merge_conflict_risk":"low","ci_failure_predictions":["issue1"],"branch_violations":[],"recommendations":["fix1"],"risk_level":"medium"}}"""

    raw = invoke_llm(prompt)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        data = json.loads(raw[start:end])
    except Exception:
        data = {"merge_conflict_risk": "medium", "ci_failure_predictions": [], "branch_violations": [], "recommendations": [raw[:300]], "risk_level": "medium"}

    return PrePushResponse(**data)
