from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import pipeline, predictor, logs

app = FastAPI(title="Anchor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pipeline.router, prefix="/api/pipeline", tags=["Pipeline Analysis"])
app.include_router(predictor.router, prefix="/api/predictor", tags=["Pre-Push Predictor"])
app.include_router(logs.router, prefix="/api/logs", tags=["Log Intelligence"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "Anchor"}
