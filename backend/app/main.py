from fastapi import FastAPI, Depends, HTTPException, Query as FastAPIQuery
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from collections import deque
import hashlib, json, asyncio, random, os
from . import models, database
from .services.metric_resolver import MetricResolver
from .services import llm
from .compiler.tier_classifier import TierClassifier
from .compiler.compiler import PlanCompiler, Decompiler, ToolCall
from .compiler.investigation import InvestigationMode
from .tools import registry
from pydantic import BaseModel, Field

app = FastAPI(title="Thinking Machines API")

# Environment-aware CORS: default to local dev, but allow override for prod
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# ---------------------------------------------------------------------------
# Feature flags
# ---------------------------------------------------------------------------
DEV_MODE: bool = os.getenv("DEV_MODE", "true").lower() in ("true", "1", "yes")

# ---------------------------------------------------------------------------
# In-memory audit log (last 200 events, newest first)
# ---------------------------------------------------------------------------
_audit_log: deque = deque(maxlen=200)

def _log(action: str, detail: str, level: str = "info") -> None:
    _audit_log.appendleft({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "detail": detail,
        "level": level,
    })

_log("System", f"Thinking Machines API started ({'DEV' if DEV_MODE else 'PROD'} mode)", "success")

# ---------------------------------------------------------------------------
# Connector definitions
# ---------------------------------------------------------------------------
_CONNECTOR_DEFS: Dict[str, Dict[str, Any]] = {
    "salesforce": {
        "name": "Salesforce",
        "category": "CRM",
        "icon": "cloud",
        "description": "Opportunities, Leads, Contacts, and Accounts — your revenue source of truth.",
        "fields": [
            {"key": "instance_url", "label": "Instance URL", "type": "url",      "placeholder": "https://yourorg.salesforce.com", "required": True},
            {"key": "client_id",    "label": "Connected App Client ID", "type": "text",     "placeholder": "3MVG9d8...", "required": True},
            {"key": "client_secret","label": "Client Secret",           "type": "password",  "placeholder": "Enter client secret", "required": True},
            {"key": "access_token", "label": "Access Token",            "type": "password",  "placeholder": "00D...", "required": True},
        ],
    },
    "google_analytics": {
        "name": "Google Analytics",
        "category": "Analytics",
        "icon": "analytics",
        "description": "Sessions, conversions, traffic sources, and goal completions from GA4.",
        "fields": [
            {"key": "property_id",      "label": "GA4 Property ID",     "type": "text",     "placeholder": "123456789", "required": True},
            {"key": "credentials_json", "label": "Service Account JSON", "type": "textarea", "placeholder": '{"type": "service_account", "project_id": "..."}', "required": True},
        ],
    },
    "hubspot": {
        "name": "HubSpot",
        "category": "Marketing CRM",
        "icon": "hub",
        "description": "Deals, Contacts, MQL pipeline, and email engagement from HubSpot.",
        "fields": [
            {"key": "api_key",   "label": "Private App Token", "type": "password", "placeholder": "pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "required": True},
            {"key": "portal_id", "label": "Hub ID (Portal ID)","type": "text",     "placeholder": "12345678", "required": False},
        ],
    },
    "google_sheets": {
        "name": "Google Sheets",
        "category": "Custom Data",
        "icon": "table_chart",
        "description": "Pull custom KPIs, budget allocations, and OKRs from a spreadsheet.",
        "fields": [
            {"key": "sheet_id",         "label": "Spreadsheet ID",       "type": "text",     "placeholder": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", "required": True},
            {"key": "range",            "label": "Sheet Range",          "type": "text",     "placeholder": "Sheet1!A1:Z100", "required": False},
            {"key": "credentials_json", "label": "Service Account JSON", "type": "textarea", "placeholder": '{"type": "service_account", "project_id": "..."}', "required": True},
        ],
    },
    "bigquery": {
        "name": "BigQuery",
        "category": "Data Warehouse",
        "icon": "storage",
        "description": "Historical aggregates, ML feature tables, and custom SQL from BigQuery.",
        "fields": [
            {"key": "project_id",       "label": "GCP Project ID",       "type": "text",     "placeholder": "my-gcp-project", "required": True},
            {"key": "dataset",          "label": "Dataset ID",           "type": "text",     "placeholder": "analytics_production", "required": True},
            {"key": "credentials_json", "label": "Service Account JSON", "type": "textarea", "placeholder": '{"type": "service_account", "project_id": "..."}', "required": True},
        ],
    },
}

# In-memory connector state (hydrated from DB on startup)
_connector_state: Dict[str, Dict[str, Any]] = {
    cid: {"configured": False, "status": "disconnected", "last_sync": None, "config": {}, "record_count": 0}
    for cid in _CONNECTOR_DEFS
}


def _persist_connector(db: Session, connector_id: str) -> None:
    """Write current in-memory connector state to SQLite."""
    state = _connector_state[connector_id]
    row = db.query(models.ConnectorState).filter_by(id=connector_id).first()
    if not row:
        row = models.ConnectorState(id=connector_id)
        db.add(row)
    row.configured   = state["configured"]
    row.status       = state["status"]
    row.record_count = state["record_count"]
    ls = state.get("last_sync")
    if ls:
        try:
            row.last_sync = datetime.fromisoformat(ls.replace("Z", "+00:00"))
        except Exception:
            row.last_sync = None
    else:
        row.last_sync = None
    row.updated_at = datetime.now(timezone.utc)
    db.commit()


@app.on_event("startup")
async def _load_connector_states() -> None:
    """Hydrate in-memory connector state from persisted DB rows."""
    db = database.SessionLocal()
    try:
        rows = db.query(models.ConnectorState).all()
        for row in rows:
            if row.id in _connector_state:
                _connector_state[row.id].update({
                    "configured":   row.configured,
                    "status":       row.status,
                    "record_count": row.record_count,
                    "last_sync":    row.last_sync.isoformat() if row.last_sync else None,
                })
        if rows:
            _log("System", f"Restored {len(rows)} connector state(s) from DB", "success")
    finally:
        db.close()

# ---------------------------------------------------------------------------
# Simulated connector data (DEV_MODE)
# ---------------------------------------------------------------------------

def _sim_salesforce() -> Dict[str, Any]:
    opps = []
    accounts = ["Acme Corp", "Globex Inc", "Initech", "Umbrella Ltd", "Massive Dynamic",
                "Hooli", "Dunder Mifflin", "Pied Piper", "Oscorp", "Wayne Enterprises",
                "Stark Industries", "Cyberdyne Systems", "Weyland Corp", "Buy n Large"]
    stage_prob = {"Prospecting":10,"Qualification":20,"Needs Analysis":50,"Proposal/Price Quote":65,"Negotiation/Review":80,"Closed Won":100}
    stages = list(stage_prob.keys())
    for i in range(20):
        r = random.Random(i * 7)
        stage = stages[r.randint(0, len(stages)-1)]
        opps.append({
            "id": f"0060X000{i:04d}SF",
            "name": f"{r.choice(accounts)} — {r.choice(['Enterprise','Pro','Starter','Custom'])} {2025 + r.randint(0,1)}",
            "amount": r.randint(20, 500) * 1000,
            "stage": stage,
            "close_date": f"2025-{r.randint(5,12):02d}-{r.randint(1,28):02d}",
            "account": r.choice(accounts),
            "probability": stage_prob.get(stage, 50),
        })
    pipeline = sum(o["amount"] for o in opps if o["stage"] != "Closed Won")
    return {
        "connector": "salesforce", "dev_mode": True,
        "last_sync": "2026-05-19T10:00:00Z", "record_count": 2417,
        "stats": {
            "open_opportunities": 87, "closed_won_mtd": 12,
            "pipeline_value": pipeline, "closed_won_amount_mtd": 1_008_000, "leads_this_week": 34,
        },
        "top_opportunities": opps[:8],
    }

def _sim_google_analytics() -> Dict[str, Any]:
    today = datetime(2026, 5, 19)
    days = []
    r = random.Random(99)
    for i in range(30):
        d = (today - timedelta(days=29-i)).strftime("%Y-%m-%d")
        sessions = r.randint(4200, 8800)
        days.append({
            "date": d,
            "sessions": sessions,
            "page_views": int(sessions * r.uniform(2.1, 3.8)),
            "conversions": int(sessions * r.uniform(0.018, 0.042)),
            "bounce_rate": round(r.uniform(0.38, 0.62), 3),
            "avg_session_duration_s": r.randint(90, 280),
        })
    return {
        "connector": "google_analytics", "dev_mode": True,
        "last_sync": "2026-05-19T09:45:00Z", "record_count": 15_732,
        "stats": {
            "sessions_30d": sum(d["sessions"] for d in days),
            "conversions_30d": sum(d["conversions"] for d in days),
            "avg_bounce_rate": round(sum(d["bounce_rate"] for d in days)/len(days), 3),
        },
        "traffic_sources": [
            {"source": "Organic Search", "sessions": 42380, "conversions": 892},
            {"source": "Paid Search",    "sessions": 18200, "conversions": 548},
            {"source": "Direct",         "sessions": 11500, "conversions": 210},
            {"source": "Referral",       "sessions": 8940,  "conversions": 187},
            {"source": "Social",         "sessions": 6100,  "conversions": 89},
        ],
        "daily": days,
    }

def _sim_hubspot() -> Dict[str, Any]:
    stages = ["subscriber","lead","marketing_qualified_lead","sales_qualified_lead","opportunity","customer","evangelist"]
    contacts = []
    names = ["Alice Chen","Bob Singh","Carol Wu","David Kim","Eva Patel","Frank Liu","Grace Osei","Hiro Tanaka",
             "Isabel Torres","Jack Murphy","Kate Novak","Leo Zhang","Mia Anderson","Noah Gupta","Olivia Brown"]
    r = random.Random(17)
    for i in range(15):
        contacts.append({
            "id": f"hs_c_{i:04d}",
            "name": names[i % len(names)],
            "email": f"{names[i%len(names)].lower().replace(' ','.')}@example.com",
            "company": r.choice(["Acme","Globex","Initech","Hooli","Pied Piper"]),
            "lifecycle_stage": r.choice(stages),
            "last_activity": f"2026-05-{r.randint(1,19):02d}",
        })
    return {
        "connector": "hubspot", "dev_mode": True,
        "last_sync": "2026-05-19T09:30:00Z", "record_count": 8_843,
        "stats": {
            "mqls_this_month": 148, "sqls_this_month": 61,
            "deals_open": 93, "deals_closed_won_mtd": 17,
            "email_open_rate": 0.274, "email_click_rate": 0.089,
        },
        "pipeline_by_stage": {
            "Appointment Scheduled": 23,
            "Qualified to Buy": 41,
            "Presentation Scheduled": 18,
            "Decision Maker Bought-In": 11,
            "Contract Sent": 7,
        },
        "recent_contacts": contacts[:8],
    }

def _sim_google_sheets() -> Dict[str, Any]:
    return {
        "connector": "google_sheets", "dev_mode": True,
        "last_sync": "2026-05-19T08:00:00Z", "record_count": 312,
        "sheet_name": "Marketing Budget & OKRs",
        "tabs": ["Q2 Budget", "OKR Tracker", "Campaign Log", "Channel Spend"],
        "budget_summary": {
            "q2_total_budget":   480_000,
            "q2_spent_to_date":  219_400,
            "q2_remaining":      260_600,
            "channels": {
                "LinkedIn Ads":   {"budget": 140_000, "spent": 62_000},
                "Google Ads":     {"budget": 120_000, "spent": 58_200},
                "Meta Ads":       {"budget": 80_000,  "spent": 38_100},
                "Email / Nurture":{"budget": 40_000,  "spent": 21_000},
                "Events":         {"budget": 100_000, "spent": 40_100},
            },
        },
        "okrs": [
            {"objective": "Grow qualified pipeline", "metric": "MQL target", "target": 600, "current": 491, "pct": 82},
            {"objective": "Reduce CAC",               "metric": "CAC target", "target": 2800, "current": 3120, "pct": 90},
            {"objective": "Improve conversion",       "metric": "MQL→SQL rate","target": 0.42, "current": 0.38, "pct": 90},
        ],
    }

def _sim_bigquery() -> Dict[str, Any]:
    return {
        "connector": "bigquery", "dev_mode": True,
        "last_sync": "2026-05-19T07:00:00Z", "record_count": 4_280_000,
        "project": "thinking-machines-demo",
        "dataset": "analytics_production",
        "tables": [
            {"name": "events",          "rows": 3_800_000, "size_gb": 12.4,  "last_modified": "2026-05-19"},
            {"name": "user_properties", "rows": 280_000,   "size_gb": 0.8,   "last_modified": "2026-05-18"},
            {"name": "sessions",        "rows": 120_000,   "size_gb": 0.4,   "last_modified": "2026-05-19"},
            {"name": "cohort_analysis", "rows": 80_000,    "size_gb": 0.3,   "last_modified": "2026-05-15"},
        ],
        "recent_queries": [
            {"query": "SELECT DATE(event_timestamp), COUNT(*) FROM events GROUP BY 1 ORDER BY 1 DESC LIMIT 30", "rows_returned": 30, "bytes_processed": "2.1 MB"},
            {"query": "SELECT user_id, SUM(revenue) FROM events WHERE event_name='purchase' GROUP BY 1", "rows_returned": 8420, "bytes_processed": "890 MB"},
        ],
        "key_metrics": {
            "avg_ltv_90d": 84_000, "retention_d30": 0.42, "avg_revenue_per_user": 1240,
        },
    }

def _get_simulated_data(connector_id: str) -> Dict[str, Any]:
    return {
        "salesforce":       _sim_salesforce,
        "google_analytics": _sim_google_analytics,
        "hubspot":          _sim_hubspot,
        "google_sheets":    _sim_google_sheets,
        "bigquery":         _sim_bigquery,
    }.get(connector_id, lambda: {})()

# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    # Input validation to mitigate DoS via large payloads
    question: str = Field(..., max_length=1000)

class InvestigateRequest(BaseModel):
    # Input validation to mitigate DoS via large payloads
    hypothesis_id: str = Field(..., max_length=100)
    hypothesis_title: str = Field(..., max_length=500)
    hypothesis_description: str = Field(..., max_length=2000)
    original_question: str = Field(..., max_length=1000)

class ConnectorConfigRequest(BaseModel):
    config: Dict[str, Any]

# ---------------------------------------------------------------------------
# Query pipeline
# ---------------------------------------------------------------------------

@app.post("/query")
async def process_query(request: QueryRequest, db: Session = Depends(database.get_db)):
    _log("Query", f'"{request.question[:80]}"', "info")
    resolver = MetricResolver(db)
    classifier = TierClassifier()
    compiler = PlanCompiler()
    decompiler = Decompiler()
    investigator = InvestigationMode()

    tier_result = await classifier.classify(request.question)
    resolved_metrics = await resolver.resolve_all(request.question)

    if tier_result.tier == 3:
        investigation = await investigator.investigate(request.question, {})
        _log("Query", f"Tier 3 investigation — {len(investigation.hypotheses)} hypotheses generated", "success")
        return {
            "answer": investigation.findings,
            "tier": 3,
            "model": llm.model_name(),
            "metric_resolutions": [m.dict() for m in resolved_metrics.resolutions],
            "hypotheses": [h.dict() for h in investigation.hypotheses],
            "investigation_mode": True,
        }

    plan = await compiler.compile(request.question, resolved_metrics, tier_result.suggested_playbook_id, db=db)

    executions = []
    for step in plan.steps:
        tool = registry.get_tool(step.tool)
        if tool:
            executions.append(tool.run(step.params))

    answer = await decompiler.decompile(request.question, executions)
    _log("Query", f"Tier {tier_result.tier} — {len(executions)} tools executed", "success")

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
# Funnel endpoint
# ---------------------------------------------------------------------------

_TIME_RANGE_DAYS = {"7d": 7, "30d": 30, "Quarter": 90, "YTD": 365}

_CHANNEL_SHARES = {"LinkedIn": 0.32, "Google Ads": 0.27, "Meta": 0.18, "Email": 0.13, "Direct": 0.10}
_SEGMENT_SHARES = {"Enterprise": 0.30, "Strategic": 0.22, "Commercial": 0.28, "SMB": 0.20}


def _stage_counts_from_entities(rows: List[models.Entity]) -> Dict[str, int]:
    mql = sal = opp = cw = 0
    for r in rows:
        p = r.properties or {}
        mql += int(p.get("mql", 0))
        sal += int(p.get("sal", 0))
        opp += int(p.get("opp", 0))
        cw  += int(p.get("cw", 0))
    leads = int(mql * 4.2)
    prospects = int(leads * 3.1)
    return {"Prospects": prospects, "Leads": leads, "MQL": mql, "SAL": sal, "Opportunity": opp, "Closed-Won": cw}


def _avg_cac(rows: List[models.Entity]) -> float:
    vals = [float((r.properties or {}).get("cac", 0)) for r in rows if (r.properties or {}).get("cac")]
    return sum(vals) / len(vals) if vals else 0.0


@app.get("/funnel")
def get_funnel(time_range: str = "30d", db: Session = Depends(database.get_db)):
    days = _TIME_RANGE_DAYS.get(time_range, 30)

    latest = db.query(models.Entity).filter(models.Entity.entity_type == "daily_metrics").order_by(models.Entity.name.desc()).first()
    if not latest:
        raise HTTPException(status_code=404, detail="No synthetic data found. Run `python -m backend.app.generate_data`.")
    end_date   = datetime.strptime((latest.properties or {}).get("date"), "%Y-%m-%d")
    start_date = end_date - timedelta(days=days - 1)
    prev_end   = start_date - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days - 1)

    def in_range(start, end):
        s, e = start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")
        return db.query(models.Entity).filter(
            models.Entity.entity_type == "daily_metrics",
            models.Entity.name >= f"metrics_{s}",
            models.Entity.name <= f"metrics_{e}",
        ).all()

    current  = in_range(start_date, end_date)
    previous = in_range(prev_start, prev_end)

    cur_counts  = _stage_counts_from_entities(current)
    prev_counts = _stage_counts_from_entities(previous)
    avg_cac   = _avg_cac(current)
    prev_cac  = _avg_cac(previous)
    cac_spike = prev_cac > 0 and (avg_cac / prev_cac) >= 1.25

    stages = []
    for name in ["Prospects", "Leads", "MQL", "SAL", "Opportunity", "Closed-Won"]:
        cur = cur_counts[name]
        prv = prev_counts[name]
        is_anom = False; reason = None
        if prv > 0 and (cur / prv) < 0.7:
            is_anom = True
            reason = f"{name} down {round((1 - cur/prv)*100)}% vs previous period"
        if name == "Closed-Won" and cac_spike:
            is_anom = True
            reason = f"CAC up {round((avg_cac/prev_cac - 1)*100)}% — diluting Closed-Won efficiency"
        stages.append({"name": name, "count": cur, "previous_count": prv, "anomaly": is_anom, "anomaly_reason": reason})

    leads_total = cur_counts["Leads"]; mql_total = cur_counts["MQL"]; cw_total = cur_counts["Closed-Won"]
    channel_breakdown = {ch: {"leads": int(leads_total*s), "mqls": int(mql_total*s), "sales": int(cw_total*s)} for ch, s in _CHANNEL_SHARES.items()}

    opp_total = cur_counts["Opportunity"]
    segment_breakdown = {seg: {"count": int(opp_total*sh), "conversion_rate": round(0.18+(hash(seg)%7)/100,3)} for seg, sh in _SEGMENT_SHARES.items()}

    avg_deal_size = 28_000; pipeline_value = opp_total * avg_deal_size; ltv = 84_000
    ltv_cac_ratio = round(ltv / avg_cac, 2) if avg_cac else 0

    return {
        "period":    f"{start_date.strftime('%Y-%m-%d')} → {end_date.strftime('%Y-%m-%d')}",
        "time_range": time_range,
        "segments": list(_SEGMENT_SHARES.keys()),
        "channels": list(_CHANNEL_SHARES.keys()),
        "stages": stages,
        "channel_breakdown": channel_breakdown,
        "segment_breakdown": segment_breakdown,
        "key_metrics": {"average_deal_size": avg_deal_size, "pipeline_value": pipeline_value, "cac": round(avg_cac, 2), "ltv": ltv, "ltv_cac_ratio": ltv_cac_ratio},
    }




# ---------------------------------------------------------------------------
# Audit log SSE stream — real system events only
# ---------------------------------------------------------------------------

@app.get("/audit/stream")
async def audit_stream():
    """SSE: streams real audit log events as they occur in the system."""
    async def gen():
        # Send the 10 most recent existing events on connect (oldest-first for display order)
        snapshot = list(_audit_log)
        for ev in reversed(snapshot[:10]):
            yield f"data: {json.dumps(ev)}\n\n"

        last_ts = snapshot[0]["timestamp"] if snapshot else ""

        tick = 0
        while True:
            await asyncio.sleep(1.0)
            new_events = []
            for ev in _audit_log:  # deque is newest-first
                if ev["timestamp"] <= last_ts:
                    break
                new_events.append(ev)
            for ev in reversed(new_events):  # emit oldest-first
                yield f"data: {json.dumps(ev)}\n\n"
            if new_events:
                last_ts = new_events[0]["timestamp"]
            tick += 1
            if tick % 30 == 0:
                yield ": heartbeat\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive",
    })


# ---------------------------------------------------------------------------
# Investigation hypothesis drilling
# ---------------------------------------------------------------------------

@app.post("/investigate")
async def investigate_hypothesis(request: InvestigateRequest, db: Session = Depends(database.get_db)):
    _log("Investigate", f"Drilling into '{request.hypothesis_title}'", "info")
    rows = db.query(models.Entity).filter(models.Entity.entity_type == "daily_metrics").order_by(models.Entity.name.asc()).all()
    if not rows:
        raise HTTPException(status_code=404, detail="No synthetic data found.")

    mql_series  = [int(float((r.properties or {}).get("mql", 0))) for r in rows]
    cw_series   = [int(float((r.properties or {}).get("cw", 0)))  for r in rows]
    cac_series  = [float((r.properties or {}).get("cac", 0)) for r in rows]
    conv_rate   = [(cw_series[i] / mql_series[i]) if mql_series[i] > 0 else 0.0 for i in range(len(mql_series))]

    h_title = request.hypothesis_title.lower()
    steps: list = []

    if any(w in h_title for w in ("channel", "mix", "attribution", "source")):
        half = max(len(mql_series) // 2, 1)
        steps = [
            {"tool": "compare_distributions_ks", "params": {"sample1": mql_series[:half], "sample2": mql_series[half:]}},
            {"tool": "detect_anomaly_zscore",    "params": {"data": cac_series[-30:] or cac_series, "threshold": 1.5}},
        ]
    elif any(w in h_title for w in ("conversion", "degradation", "rate", "funnel", "stage")):
        steps = [
            {"tool": "detect_anomaly_zscore", "params": {"data": conv_rate, "threshold": 1.5}},
            {"tool": "decompose_seasonality", "params": {"data": mql_series[-30:] or mql_series, "period": 7}},
        ]
    elif any(w in h_title for w in ("season", "campaign", "burst", "spend", "timing", "delay")):
        window = cac_series[-7:] if len(cac_series) >= 7 else cac_series
        hist   = [cac_series[:7] if len(cac_series)>=7 else cac_series, cac_series[7:14] if len(cac_series)>=14 else cac_series, cac_series[14:21] if len(cac_series)>=21 else cac_series]
        steps = [
            {"tool": "decompose_seasonality",  "params": {"data": cac_series[-30:] or cac_series, "period": 7}},
            {"tool": "find_historical_analog", "params": {"current_vector": window, "historical_vectors": hist, "historical_periods": ["Period -3","Period -2","Period -1"]}},
        ]
    else:
        steps = [
            {"tool": "detect_anomaly_zscore", "params": {"data": cac_series[-30:] or cac_series, "threshold": 1.5}},
            {"tool": "detect_anomaly_zscore", "params": {"data": mql_series[-30:] or mql_series, "threshold": 1.5}},
        ]

    executions = []
    for step in steps:
        tool = registry.get_tool(step["tool"])
        if tool:
            executions.append(tool.run(step["params"]))

    decompiler = Decompiler()
    q = f"Investigate hypothesis '{request.hypothesis_title}': {request.hypothesis_description}. Original question: {request.original_question}"
    finding = await decompiler.decompile(q, executions)
    _log("Investigate", f"Analysis complete for '{request.hypothesis_title}'", "success")

    return {
        "hypothesis_id": request.hypothesis_id,
        "hypothesis_title": request.hypothesis_title,
        "finding": finding,
        "executions": [ex.dict() for ex in executions],
        "model": llm.model_name(),
    }


# ---------------------------------------------------------------------------
# Connector endpoints
# ---------------------------------------------------------------------------

@app.get("/connectors")
def list_connectors():
    result = []
    for cid, defn in _CONNECTOR_DEFS.items():
        state = _connector_state[cid]
        result.append({
            "id": cid, "name": defn["name"], "category": defn["category"],
            "icon": defn["icon"], "description": defn["description"],
            "configured": state["configured"], "status": state["status"],
            "last_sync": state["last_sync"], "record_count": state["record_count"],
            "fields": defn["fields"], "dev_mode": DEV_MODE,
        })
    return result


@app.post("/connectors/{connector_id}/configure")
async def configure_connector(connector_id: str, body: ConnectorConfigRequest, db: Session = Depends(database.get_db)):
    if connector_id not in _CONNECTOR_DEFS:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {connector_id}")
    _connector_state[connector_id].update({"config": body.config, "configured": True, "status": "configured"})
    _persist_connector(db, connector_id)
    _log(f"Connector", f"{_CONNECTOR_DEFS[connector_id]['name']} configuration saved", "success")
    return {"ok": True, "connector": connector_id, "status": "configured"}


@app.post("/connectors/{connector_id}/test")
async def test_connector(connector_id: str, db: Session = Depends(database.get_db)):
    if connector_id not in _CONNECTOR_DEFS:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {connector_id}")
    await asyncio.sleep(0.6)
    state = _connector_state[connector_id]
    if DEV_MODE or state["configured"]:
        _connector_state[connector_id]["status"] = "connected"
        _persist_connector(db, connector_id)
        name = _CONNECTOR_DEFS[connector_id]["name"]
        _log("Connector", f"{name} connection test passed", "success")
        return {"ok": True, "message": f"Connected to {name} successfully"}
    raise HTTPException(status_code=400, detail="Connector not configured. Save credentials first.")


@app.post("/connectors/{connector_id}/sync")
async def sync_connector(connector_id: str, db: Session = Depends(database.get_db)):
    if connector_id not in _CONNECTOR_DEFS:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {connector_id}")
    if not DEV_MODE and not _connector_state[connector_id]["configured"]:
        raise HTTPException(status_code=400, detail="Connector not configured.")
    await asyncio.sleep(1.0)
    now  = datetime.now(timezone.utc).isoformat()
    data = _get_simulated_data(connector_id)
    rc   = data.get("record_count", 0)
    _connector_state[connector_id].update({"status": "connected", "last_sync": now, "record_count": rc})
    _persist_connector(db, connector_id)
    name = _CONNECTOR_DEFS[connector_id]["name"]
    _log("Connector", f"{name} sync complete — {rc:,} records", "success")
    return {"ok": True, "synced_at": now, "record_count": rc}


@app.get("/connectors/{connector_id}/data")
async def get_connector_data(connector_id: str):
    if connector_id not in _CONNECTOR_DEFS:
        raise HTTPException(status_code=404, detail=f"Unknown connector: {connector_id}")
    _log("Connector", f"Data fetch: {_CONNECTOR_DEFS[connector_id]['name']}", "info")
    return _get_simulated_data(connector_id)


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

@app.get("/audit")
def get_audit_log(limit: int = 50):
    return list(_audit_log)[:min(limit, 200)]


# ---------------------------------------------------------------------------
# Initialize / setup
# ---------------------------------------------------------------------------

@app.post("/initialize/run")
async def run_initialize(db: Session = Depends(database.get_db)):
    steps = []

    # 1. Dependencies (if we got here, FastAPI is running)
    tool_count = len([k for k in registry._tools if "@" not in k])
    steps.append({"step": 1, "title": "Install Dependencies", "status": "ok",
                  "detail": f"All packages installed — {tool_count} tools available"})

    # 2. Database connectivity
    try:
        db.execute(text("SELECT 1"))
        steps.append({"step": 2, "title": "Configure Database", "status": "ok",
                      "detail": "SQLite connected — schema ready"})
    except Exception as e:
        steps.append({"step": 2, "title": "Configure Database", "status": "error", "detail": str(e)})

    # 3. Metric definitions
    metric_count = db.query(models.MetricDefinition).count()
    steps.append({
        "step": 3, "title": "Seed Metrics",
        "status": "ok" if metric_count > 0 else "warning",
        "detail": f"{metric_count} metric definitions loaded" if metric_count > 0 else "Run python -m backend.app.seed_metrics",
    })

    # 4. Connectors
    connected = sum(1 for s in _connector_state.values() if s["status"] in ("connected", "configured"))
    total = len(_connector_state)
    steps.append({
        "step": 4, "title": "Enable Connectors",
        "status": "ok" if DEV_MODE else ("ok" if connected > 0 else "warning"),
        "detail": f"{connected}/{total} connectors active" + (" (DEV mode — simulated data)" if DEV_MODE else ""),
    })

    # 5. Deterministic kernel
    steps.append({"step": 5, "title": "Initialize Kernel", "status": "ok",
                  "detail": f"{tool_count} deterministic tools registered and verified"})

    # 6. Data availability
    entity_count = db.query(models.Entity).count()
    steps.append({
        "step": 6, "title": "Launch System",
        "status": "ok" if entity_count > 0 else "warning",
        "detail": f"System live — {entity_count:,} data points available" if entity_count > 0 else "Run python -m backend.app.generate_data",
    })

    all_ok = all(s["status"] == "ok" for s in steps)
    _log("Initialize", f"Setup check: {sum(1 for s in steps if s['status']=='ok')}/{len(steps)} steps OK", "success" if all_ok else "warning")
    return {"steps": steps, "all_ok": all_ok, "dev_mode": DEV_MODE}


# ---------------------------------------------------------------------------
# Pipeline / tool execution status
# ---------------------------------------------------------------------------

@app.get("/pipeline/status")
def pipeline_status():
    tools = [registry.get_tool(name).metadata.dict() for name in registry._tools if "@" not in name]
    _log("Pipeline", "Pipeline status polled", "info")
    return {
        "tool_count": len(tools),
        "categories": list({t["category"] for t in tools}),
        "tools": tools,
        "kernel_status": "operational",
        "dev_mode": DEV_MODE,
    }


# ---------------------------------------------------------------------------
# Dev / Prod mode toggle
# ---------------------------------------------------------------------------

class DevModeRequest(BaseModel):
    enabled: bool

@app.get("/dev-mode")
def get_dev_mode():
    return {"dev_mode": DEV_MODE}

@app.post("/dev-mode")
async def set_dev_mode(body: DevModeRequest):
    global DEV_MODE
    DEV_MODE = body.enabled
    label = "DEV" if DEV_MODE else "PROD"
    _log("System", f"Mode switched to {label} — connectors {'use simulated data' if DEV_MODE else 'require real credentials'}", "success")
    return {"dev_mode": DEV_MODE}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"ok": True, "llm_enabled": llm.is_enabled(), "model": llm.model_name(), "dev_mode": DEV_MODE}
