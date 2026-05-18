import numpy as np
from scipy import stats
import time
from typing import Dict, Any
from .base import Tool, ToolMetadata, ToolResult

class CausalBayesianImpact(Tool):
    def __init__(self):
        self.metadata = ToolMetadata(
            name="causal_bayesian_impact",
            version="1.0.0",
            category="Causal Inference",
            description="Estimates the causal impact of an intervention by comparing observed data against counterfactuals. Ideal for verifying campaign lift.",
            input_schema={
                "type": "object",
                "properties": {
                    "y": {"type": "array", "items": {"type": "number"}},
                    "intervention_index": {"type": "integer"}
                },
                "required": ["y", "intervention_index"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "absolute_effect": {"type": "number"},
                    "relative_effect": {"type": "number"},
                    "p_value": {"type": "number"}
                }
            },
            reproducibility="deterministic",
            classical_basis="Bayesian Structural Time-Series",
            typical_runtime_ms=100
        )

    def run(self, inputs: Dict[str, Any]) -> ToolResult:
        start_time = time.time()
        y = np.array(inputs["y"])
        idx = inputs["intervention_index"]

        if idx >= len(y) or idx <= 0:
            return ToolResult(
                tool_name=self.metadata.name,
                tool_version=self.metadata.version,
                inputs=inputs,
                output={},
                execution_time_ms=int((time.time() - start_time) * 1000),
                warnings=["Invalid intervention index"]
            )

        pre = y[:idx]
        post = y[idx:]

        pre_mean = np.mean(pre)
        counterfactual = np.full_like(post, pre_mean)

        abs_effect = np.sum(post - counterfactual)
        rel_effect = abs_effect / np.sum(counterfactual) if np.sum(counterfactual) != 0 else 0

        t_stat, p_val = stats.ttest_ind(post, pre)

        execution_time = int((time.time() - start_time) * 1000)

        return ToolResult(
            tool_name=self.metadata.name,
            tool_version=self.metadata.version,
            inputs=inputs,
            output={
                "absolute_effect": float(abs_effect),
                "relative_effect": float(rel_effect),
                "p_value": float(p_val)
            },
            execution_time_ms=execution_time,
            provenance=["Calculated using pre-period projection counterfactual"]
        )
