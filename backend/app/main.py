from fastapi import FastAPI, Depends, HTTPException, Query as FastAPIQuery
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from . import models, database
from .services.metric_resolver import MetricResolver
from .compiler.tier_classifier import TierClassifier
from .compiler.compiler import PlanCompiler, Decompiler
from .compiler.investigation import InvestigationMode
from .tools import registry
from .seed_metrics import seed_metrics
from .generate_data import generate_data
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Thinking Machines API")

# Enable CORS - Restricting wildcard with credentials for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://thinking-machines.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Add Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        return response

app.add_middleware(SecurityHeadersMiddleware)

@app.on_event("startup")
def on_startup():
    db = database.SessionLocal()
    # Seed metrics if none exist
    if db.query(models.MetricDefinition).count() == 0:
        seed_metrics()
        print("Metrics seeded on startup.")
    # Generate some data if none exist
    if db.query(models.Entity).count() == 0:
        generate_data()
        print("Data generated on startup.")
    db.close()

class QueryRequest(BaseModel):
    question: str = Field(..., max_length=1000)

@app.post("/query")
async def process_query(request: QueryRequest, db: Session = Depends(database.get_db)):
    resolver = MetricResolver(db)
    classifier = TierClassifier()
    compiler = PlanCompiler()
    decompiler = Decompiler()
    investigator = InvestigationMode()

    # 1. Tier Classification
    tier_result = await classifier.classify(request.question)

    # 2. Metric Resolution
    resolved_metrics = await resolver.resolve_all(request.question)

    # 3. Decision: Normal or Investigation
    if tier_result.tier == 3:
        investigation = await investigator.investigate(request.question, {})
        return {
            "answer": investigation.findings,
            "tier": 3,
            "model": "gemini-2.0-pro",
            "metric_resolutions": [m.dict() for m in resolved_metrics.resolutions],
            "hypotheses": [h.dict() for h in investigation.hypotheses],
            "investigation_mode": True
        }

    # 4. Plan Compilation
    plan = await compiler.compile(request.question, resolved_metrics, tier_result.suggested_playbook_id)

    # 5. Execution
    executions = []
    for step in plan.steps:
        tool = registry.get_tool(step.tool)
        if tool:
            res = tool.run(step.params)
            executions.append(res)

    # 6. Decompilation
    answer = await decompiler.decompile(request.question, executions)

    return {
        "answer": answer,
        "tier": tier_result.tier,
        "model": "gemini-2.0-flash",
        "metric_resolutions": [m.dict() for m in resolved_metrics.resolutions],
        "executions": [ex.dict() for ex in executions]
    }

@app.get("/tools")
def list_tools():
    return [registry.get_tool(name).metadata.dict() for name in registry._tools if "@" not in name]

@app.get("/metrics")
def list_metrics(db: Session = Depends(database.get_db)):
    return db.query(models.MetricDefinition).all()
