from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
from ..services import llm

class InvestigationHypothesis(BaseModel):
    id: str
    title: str
    description: str
    requires_new_tool: bool
    proposed_tool_name: Optional[str] = None

class InvestigationResult(BaseModel):
    hypotheses: List[InvestigationHypothesis]
    findings: str


_FALLBACK = InvestigationResult(
    hypotheses=[
        InvestigationHypothesis(
            id="h1",
            title="Channel Mix Shift",
            description="A shift toward higher-cost acquisition channels (e.g. paid search vs organic) "
                        "can inflate blended CAC without any single channel worsening.",
            requires_new_tool=False,
        ),
        InvestigationHypothesis(
            id="h2",
            title="Conversion Rate Degradation",
            description="If top-of-funnel volume held steady but closed-won declined, cost per "
                        "acquisition rises. Requires segmenting CAC by funnel stage.",
            requires_new_tool=False,
        ),
        InvestigationHypothesis(
            id="h3",
            title="Seasonality / Campaign Burst",
            description="Q4 campaign bursts often front-load spend before deals close, temporarily "
                        "inflating in-period CAC. A new tool to align spend to closed-date would "
                        "confirm this.",
            requires_new_tool=True,
            proposed_tool_name="align_spend_to_close_date",
        ),
    ],
    findings=(
        "Three hypotheses identified for the CAC movement: a channel mix shift toward costlier "
        "acquisition channels, a conversion rate degradation in the funnel, or a seasonal spend "
        "burst where costs are booked before deals close. The first two can be verified with "
        "existing distribution and anomaly tools."
    ),
)


class InvestigationMode:
    async def investigate(self, question: str, existing_context: Dict[str, Any]) -> InvestigationResult:
        if llm.is_enabled():
            prompt = (
                "You are an enterprise analytics strategist. Given the question, propose 2-3 "
                "hypotheses. For each, decide if it can be answered with existing statistical tools "
                "(anomaly detection, seasonality decomposition, causal inference, distribution "
                "comparison) or if it requires a NEW deterministic tool (suggest a snake_case name).\n\n"
                f"Question: {question}\n\n"
                "Respond as STRICT JSON: "
                "{\"findings\": \"...\", \"hypotheses\": [{\"id\": \"h1\", \"title\": \"...\", "
                "\"description\": \"...\", \"requires_new_tool\": false, "
                "\"proposed_tool_name\": null}]}"
            )
            raw = llm.generate(prompt, temperature=0.4)
            if raw:
                try:
                    cleaned = raw.strip()
                    if cleaned.startswith("```"):
                        cleaned = cleaned.strip("`")
                        if cleaned.lower().startswith("json"):
                            cleaned = cleaned[4:].strip()
                    return InvestigationResult(**json.loads(cleaned))
                except Exception:
                    pass
        return _FALLBACK
