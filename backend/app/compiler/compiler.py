from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from ..services.metric_resolver import ResolvedMetrics

class ToolCall(BaseModel):
    tool: str
    params: Dict[str, Any]

class ExecutionPlan(BaseModel):
    query_id: Optional[int] = None
    steps: List[ToolCall]

class PlanCompiler:
    async def compile(self, question: str, resolved_metrics: ResolvedMetrics, playbook_id: Optional[str] = None) -> ExecutionPlan:
        steps = []

        # Rule 1: Never invent tools. Only use from registry.
        # Rule 2: Never do analytical reasoning here. Only chain tools.

        if playbook_id == "metric_anomaly_diagnosis":
            # Deterministic chain for anomaly diagnosis
            steps.append(ToolCall(tool="decompose_seasonality", params={"data": [10, 11, 12, 11, 10, 25, 22], "period": 7}))
            steps.append(ToolCall(tool="detect_anomaly_zscore", params={"data": [10, 11, 12, 11, 10, 25, 22], "threshold": 2.0}))
            steps.append(ToolCall(tool="find_historical_analog", params={
                "current_vector": [25, 22],
                "historical_vectors": [[10, 12], [20, 21], [15, 14]],
                "historical_periods": ["Oct 2024", "Nov 2024", "Dec 2024"]
            }))
        elif playbook_id == "channel_comparison":
            steps.append(ToolCall(tool="compare_distributions_ks", params={
                "sample1": [10, 12, 11, 13, 12],
                "sample2": [8, 9, 10, 9, 8]
            }))
        else:
            # Tier 1 fallback
            steps.append(ToolCall(tool="detect_anomaly_zscore", params={"data": [10, 11, 12, 13]}))

        return ExecutionPlan(steps=steps)

class Decompiler:
    async def decompile(self, question: str, tool_results: List[Any]) -> str:
        # Rule: Never add information not in the result.
        # Synthesize the answer from the tool outputs.

        has_anomaly = False
        top_analog = "unknown"
        similarity = 0

        for res in tool_results:
            if res.tool_name == "detect_anomaly_zscore":
                if any(res.output.get("anomalies", [])):
                    has_anomaly = True
            if res.tool_name == "find_historical_analog":
                top_analog = res.output.get("top_analog_period")
                similarity = res.output.get("similarity_score", 0)

        if "why" in question.lower():
            if has_anomaly:
                return f"Diagnosis: A significant anomaly was detected. The data pattern matches {top_analog} (Similarity: {similarity:.2f}), suggesting the current variance is consistent with historical seasonal fatigue."
            else:
                return "The statistical analysis confirms that while there is variance, it does not cross the threshold of a significant anomaly relative to historical trends."

        return "Analysis complete. See the audit trail for detailed tool outputs and metric resolutions."
