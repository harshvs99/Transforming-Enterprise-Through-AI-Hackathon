from fastapi import FastAPI, Depends, HTTPException, Query as FastAPIQuery
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import hashlib, json, asyncio, random
from . import models, database
from .services.metric_resolver import MetricResolver
from .services import llm
from .compiler.tier_classifier import TierClassifier
from .compiler.compiler import PlanCompiler, Decompiler
from .compiler.investigation import InvestigationMode
from .tools import registry
from pydantic import BaseModel

app = FastAPI(title="Thinking Machines API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Can't use both wildcard origins and credentials
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

class QueryRequest(BaseModel):
    question: str

@app.post("/query")
async def process_query(request: QueryRequest, db: Session = Depends(database.get_db)):
    resolver = MetricResolver(db)
    classifier = TierClassifier()
    compiler = PlanCompiler()
    decompiler = Decompiler()
    investigator = InvestigationMode()

    tier_result = await classifier.classify(request.question)
    resolved_metrics = await resolver.resolve_all(request.question)

    if tier_result.tier == 3:
        investigation = await investigator.investigate(request.question, {})
        return {
            "answer": investigation.findings,
            "tier": 3,
            "model": llm.model_name(),
            "metric_resolutions": [m.dict() for m in resolved_metrics.resolutions],
            "hypotheses": [h.dict() for h in investigation.hypotheses],
            "investigation_mode": True,
        }

    plan = await compiler.compile(request.question, resolved_metrics, tier_result.suggested_playbook_id)

    executions = []
    for step in plan.steps:
        tool = registry.get_tool(step.tool)
        if tool:
            executions.append(tool.run(step.params))

    answer = await decompiler.decompile(request.question, executions)

    return {
        "answer": answer,
        "tier": tier_result.tier,
        "model": llm.model_name(),
        "metric_resolutions": [m.dict() for m in resolved_metrics.resolutions],
        "executions": [ex.dict() for ex in executions],
    }


@app.get("/tools")
def list_tools():
    return [registry.get_tool(name).metadata.dict() for name in registry._tools if "@" not in name]


@app.get("/metrics")
def list_metrics(db: Session = Depends(database.get_db)):
    return db.query(models.MetricDefinition).all()


# ---------------------------------------------------------------------------
# Funnel endpoint — aggregates live synthetic data from `entities`
# ---------------------------------------------------------------------------

_TIME_RANGE_DAYS = {"7d": 7, "30d": 30, "Quarter": 90, "YTD": 365}

# Synthetic-but-deterministic distribution across channels and segments. The
# generator does not store these dimensions, so we hash by date and assign a
# stable share — this keeps the funnel reproducible across calls.
_CHANNEL_SHARES = {"LinkedIn": 0.32, "Google Ads": 0.27, "Meta": 0.18, "Email": 0.13, "Direct": 0.10}
_SEGMENT_SHARES = {"Enterprise": 0.30, "Strategic": 0.22, "Commercial": 0.28, "SMB": 0.20}


def _stage_counts_from_entities(rows: List[models.Entity]) -> Dict[str, int]:
    mql = sal = opp = cw = 0
    for r in rows:
        p = r.properties or {}
        mql += int(p.get("mql", 0))
        sal += int(p.get("sal", 0))
        opp += int(p.get("opp", 0))
        cw += int(p.get("cw", 0))
    # Derive Prospects/Leads from MQL using stable funnel ratios (top-of-funnel
    # isn't stored in the synthetic dataset).
    leads = int(mql * 4.2)
    prospects = int(leads * 3.1)
    return {
        "Prospects": prospects,
        "Leads": leads,
        "MQL": mql,
        "SAL": sal,
        "Opportunity": opp,
        "Closed-Won": cw,
    }


def _avg_cac(rows: List[models.Entity]) -> float:
    vals = [float((r.properties or {}).get("cac", 0)) for r in rows if (r.properties or {}).get("cac")]
    return sum(vals) / len(vals) if vals else 0.0


@app.get("/funnel")
def get_funnel(time_range: str = "30d", db: Session = Depends(database.get_db)):
    days = _TIME_RANGE_DAYS.get(time_range, 30)

    # Use the latest date present in the dataset as "now" so the demo always has data.
    latest = db.query(models.Entity).filter(models.Entity.entity_type == "daily_metrics").order_by(models.Entity.name.desc()).first()
    if not latest:
        raise HTTPException(status_code=404, detail="No synthetic data found. Run `python -m backend.app.generate_data`.")
    end_date = datetime.strptime((latest.properties or {}).get("date"), "%Y-%m-%d")
    start_date = end_date - timedelta(days=days - 1)
    prev_end = start_date - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days - 1)

    def in_range(start, end):
        s, e = start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")
        return db.query(models.Entity).filter(
            models.Entity.entity_type == "daily_metrics",
            models.Entity.name >= f"metrics_{s}",
            models.Entity.name <= f"metrics_{e}",
        ).all()

    current = in_range(start_date, end_date)
    previous = in_range(prev_start, prev_end)

    cur_counts = _stage_counts_from_entities(current)
    prev_counts = _stage_counts_from_entities(previous)

    avg_cac = _avg_cac(current)
    prev_cac = _avg_cac(previous)
    cac_spike = prev_cac > 0 and (avg_cac / prev_cac) >= 1.25

    stages = []
    for name in ["Prospects", "Leads", "MQL", "SAL", "Opportunity", "Closed-Won"]:
        cur = cur_counts[name]
        prv = prev_counts[name]
        is_anom = False
        reason = None
        # Flag stages whose drop vs prev period exceeds 30%
        if prv > 0 and (cur / prv) < 0.7:
            is_anom = True
            reason = f"{name} down {round((1 - cur/prv)*100)}% vs previous period"
        if name == "Closed-Won" and cac_spike:
            is_anom = True
            reason = f"CAC up {round((avg_cac/prev_cac - 1)*100)}% — diluting Closed-Won efficiency"
        stages.append({
            "name": name,
            "count": cur,
            "previous_count": prv,
            "anomaly": is_anom,
            "anomaly_reason": reason,
        })

    # Channel breakdown — apportion Leads / MQL / Closed-Won by stable shares
    leads_total = cur_counts["Leads"]
    mql_total = cur_counts["MQL"]
    cw_total = cur_counts["Closed-Won"]
    channel_breakdown = {
        ch: {
            "leads": int(leads_total * share),
            "mqls": int(mql_total * share),
            "sales": int(cw_total * share),
        }
        for ch, share in _CHANNEL_SHARES.items()
    }

    opp_total = cur_counts["Opportunity"]
    segment_breakdown = {
        seg: {
            "count": int(opp_total * share),
            "conversion_rate": round(0.18 + (hash(seg) % 7) / 100, 3),
        }
        for seg, share in _SEGMENT_SHARES.items()
    }

    avg_deal_size = 28000
    pipeline_value = opp_total * avg_deal_size
    ltv = 84000
    ltv_cac_ratio = round(ltv / avg_cac, 2) if avg_cac else 0

    return {
        "period": f"{start_date.strftime('%Y-%m-%d')} → {end_date.strftime('%Y-%m-%d')}",
        "time_range": time_range,
        "segments": list(_SEGMENT_SHARES.keys()),
        "channels": list(_CHANNEL_SHARES.keys()),
        "stages": stages,
        "channel_breakdown": channel_breakdown,
        "segment_breakdown": segment_breakdown,
        "key_metrics": {
            "average_deal_size": avg_deal_size,
            "pipeline_value": pipeline_value,
            "cac": round(avg_cac, 2),
            "ltv": ltv,
            "ltv_cac_ratio": ltv_cac_ratio,
        },
    }


@app.get("/funnel/stream")
async def funnel_stream():
    """SSE: nudge stage counters with small deltas every few seconds to feel live."""
    async def gen():
        stages = ["Prospects", "Leads", "MQL", "SAL", "Opportunity", "Closed-Won"]
        tick = 0
        while True:
            # Heartbeat comment every ~20s keeps GFE / intermediate proxies alive
            if tick % 5 == 0:
                yield ": heartbeat\n\n"
            delta = {random.choice(stages): random.choice([-1, 1, 1, 2])}
            yield f"data: {json.dumps(delta)}\n\n"
            await asyncio.sleep(4)
            tick += 1
    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.get("/health")
def health():
    return {"ok": True, "llm_enabled": llm.is_enabled(), "model": llm.model_name()}
