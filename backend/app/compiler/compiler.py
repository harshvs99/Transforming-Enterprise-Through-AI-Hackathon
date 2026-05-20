from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
from ..services.metric_resolver import ResolvedMetrics
from ..services import llm

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
            steps.append(ToolCall(tool="decompose_seasonality", params={"data": [10, 11, 12, 11, 10, 25, 22], "period": 7}))
            steps.append(ToolCall(tool="detect_anomaly_zscore", params={"data": [10, 11, 12, 11, 10, 25, 22], "threshold": 1.5}))
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
            steps.append(ToolCall(tool="detect_anomaly_zscore", params={"data": [10, 11, 12, 13]}))

        return ExecutionPlan(steps=steps)


def _heuristic_answer(question: str, tool_results: List[Any]) -> str:
    # Collect findings from each tool
    has_anomaly = False
    anomaly_count = 0
    max_zscore = 0.0
    top_analog = None
    similarity = 0.0
    trend: list = []
    resid: list = []
    stl_insufficient = False
    ks_different = None
    ks_pvalue = None

    for res in tool_results:
        if res.tool_name == "detect_anomaly_zscore":
            anomalies = res.output.get("anomalies", [])
            z_scores = res.output.get("z_scores", [])
            anomaly_count = sum(1 for a in anomalies if a)
            has_anomaly = anomaly_count > 0
            if z_scores:
                max_zscore = max(abs(z) for z in z_scores)

        elif res.tool_name == "decompose_seasonality":
            trend = res.output.get("trend", [])
            resid = res.output.get("resid", [])
            stl_insufficient = bool(res.output.get("warnings"))

        elif res.tool_name == "find_historical_analog":
            top_analog = res.output.get("top_analog_period")
            similarity = res.output.get("similarity_score", 0.0) or 0.0

        elif res.tool_name == "compare_distributions_ks":
            ks_different = res.output.get("different")
            ks_pvalue = res.output.get("p_value")

    parts = []

    # Anomaly interpretation
    if has_anomaly:
        severity = "significant" if max_zscore > 3 else "moderate"
        parts.append(
            f"The analysis detected {anomaly_count} anomalous data point(s) with a peak Z-score of "
            f"{max_zscore:.1f} — a {severity} departure from the historical average."
        )
    elif "detect_anomaly_zscore" in [r.tool_name for r in tool_results]:
        parts.append(
            "No statistically significant anomalies were found — the values observed sit within "
            "the expected historical range."
        )

    # Seasonality / trend interpretation
    if trend and not stl_insufficient:
        delta = trend[-1] - trend[0]
        direction = "rising" if delta > 0.5 else "falling" if delta < -0.5 else "stable"
        parts.append(f"Seasonal decomposition shows the underlying trend is {direction} over the period examined.")
        if resid:
            max_resid = max(abs(r) for r in resid)
            if max_resid > 5:
                parts.append(
                    f"A residual spike of {max_resid:.1f} units was found that seasonality alone cannot explain, "
                    f"pointing to an irregular event in the data."
                )
    elif stl_insufficient:
        parts.append("There was not enough data to run seasonal decomposition — more historical periods are needed.")

    # Historical analog interpretation
    if top_analog is not None:
        if similarity > 0.95:
            match_quality = "very strong"
        elif similarity > 0.80:
            match_quality = "strong"
        elif similarity > 0.60:
            match_quality = "moderate"
        else:
            match_quality = "weak"
        parts.append(
            f"The current pattern most closely resembles {top_analog} "
            f"({similarity:.0%} similarity — a {match_quality} historical match), "
            f"suggesting this situation has occurred before."
        )

    # Distribution comparison interpretation
    if ks_different is not None:
        if ks_different:
            parts.append(
                f"The two groups are statistically distinct (p = {ks_pvalue:.3f}): "
                f"the difference in their distributions is unlikely to be random noise."
            )
        else:
            parts.append(
                f"The two groups are not statistically distinguishable (p = {ks_pvalue:.3f}), "
                f"so any visible gap may simply be normal variation."
            )

    if parts:
        return " ".join(parts)

    return (
        "The tools ran successfully but the outputs did not produce a clear signal. "
        "Check the audit trail for the raw numbers."
    )


class Decompiler:
    async def decompile(self, question: str, tool_results: List[Any]) -> str:
        # Rule: Never add information not in the tool result. Gemini is given ONLY
        # the structured tool outputs and is instructed not to invent facts.
        if llm.is_enabled():
            tool_payload = [
                {"tool": r.tool_name, "inputs": r.inputs, "output": r.output}
                for r in tool_results
            ]
            prompt = (
                "You are the Decompiler in a deterministic analytics kernel. Synthesize a concise, "
                "executive-friendly answer using ONLY the tool outputs below. Do not invent numbers, "
                "causes, or entities. If the outputs are insufficient, say so.\n\n"
                f"Question: {question}\n\n"
                f"Tool outputs (JSON):\n{json.dumps(tool_payload, default=str)}\n\n"
                "Respond in 2-4 sentences."
            )
            text = llm.generate(prompt)
            if text:
                return text
        return _heuristic_answer(question, tool_results)
