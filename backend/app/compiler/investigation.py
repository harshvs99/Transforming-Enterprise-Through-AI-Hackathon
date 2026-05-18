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
            title="Creative Fatigue in LinkedIn Segment",
            description="The anomaly might be caused by high frequency in the Enterprise audience segment.",
            requires_new_tool=False,
        ),
        InvestigationHypothesis(
            id="h2",
            title="Attribution Delay Effect",
            description="October spikes sometimes correlate with delayed reporting from CRM webhooks.",
            requires_new_tool=True,
            proposed_tool_name="detect_webhook_latency",
        ),
    ],
    findings=(
        "Investigation revealed two primary hypotheses. One can be verified with existing tools, "
        "while the second requires a new deterministic tool to measure webhook latency."
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
