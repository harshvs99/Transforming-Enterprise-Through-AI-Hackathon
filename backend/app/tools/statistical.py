import numpy as np
from scipy import stats
import time
from typing import Dict, Any
from .base import Tool, ToolMetadata, ToolResult

class CompareDistributionsKS(Tool):
    def __init__(self):
        self.metadata = ToolMetadata(
            name="compare_distributions_ks",
            version="1.0.0",
            category="Statistical Comparison",
            description="Compares two distributions using the Kolmogorov-Smirnov test.",
            input_schema={
                "type": "object",
                "properties": {
                    "sample1": {"type": "array", "items": {"type": "number"}},
                    "sample2": {"type": "array", "items": {"type": "number"}}
                },
                "required": ["sample1", "sample2"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "statistic": {"type": "number"},
                    "p_value": {"type": "number"},
                    "different": {"type": "boolean"}
                }
            },
            reproducibility="deterministic",
            classical_basis="Kolmogorov-Smirnov test",
            typical_runtime_ms=10
        )

    def run(self, inputs: Dict[str, Any]) -> ToolResult:
        start_time = time.time()
        s1 = np.array(inputs["sample1"])
        s2 = np.array(inputs["sample2"])

        stat, p = stats.ks_2samp(s1, s2)

        execution_time = int((time.time() - start_time) * 1000)

        return ToolResult(
            tool_name=self.metadata.name,
            tool_version=self.metadata.version,
            inputs=inputs,
            output={
                "statistic": float(stat),
                "p_value": float(p),
                "different": bool(p < 0.05)
            },
            execution_time_ms=execution_time,
            provenance=["Calculated using scipy.stats"]
        )
