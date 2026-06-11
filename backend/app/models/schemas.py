from pydantic import BaseModel


class PipelineAnalysisRequest(BaseModel):
    repo_full_name: str
    code_snippet: str
    file_path: str = ""


class PipelineAnalysisResponse(BaseModel):
    violations: list[str]
    suggestions: list[str]
    workflow_issues: list[str]
    compliance_score: int


class PrePushRequest(BaseModel):
    repo_full_name: str
    base_branch: str = "main"
    diff: str


class PrePushResponse(BaseModel):
    merge_conflict_risk: str
    ci_failure_predictions: list[str]
    branch_violations: list[str]
    recommendations: list[str]
    risk_level: str


class LogAnalysisRequest(BaseModel):
    logs: str


class Incident(BaseModel):
    pattern: str
    root_cause: str
    severity: str
    recommended_fixes: list[str]
    cost_impact: str
    runbook: list[str]


class LogAnalysisResponse(BaseModel):
    total_lines: int
    representative_logs: list[str]
    incidents: list[Incident]
    summary: str
