import numpy as np
import time
from typing import Dict, Any
from .base import Tool, ToolMetadata, ToolResult, MetricDefinitionRef

class DetectAnomalyZScore(Tool):
    def __init__(self):
        self.metadata = ToolMetadata(
            name="detect_anomaly_zscore",
            version="1.0.0",
            category="Anomaly Detection",
            description="Detects anomalies in a time series using Z-score.",
            input_schema={
                "type": "object",
                "properties": {
                    "data": {"type": "array", "items": {"type": "number"}},
                    "threshold": {"type": "number", "default": 3.0}
                },
                "required": ["data"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "anomalies": {"type": "array", "items": {"type": "boolean"}},
                    "z_scores": {"type": "array", "items": {"type": "number"}}
                }
            },
            reproducibility="deterministic",
            classical_basis="Standard score (Z-score)",
            typical_runtime_ms=10
        )

    def run(self, inputs: Dict[str, Any]) -> ToolResult:
        start_time = time.time()
        data = np.array(inputs["data"])
        threshold = inputs.get("threshold", 3.0)

        mean = np.mean(data)
        std = np.std(data)

        if std == 0:
            z_scores = np.zeros_like(data)
        else:
            z_scores = (data - mean) / std

        anomalies = np.abs(z_scores) > threshold

        execution_time = int((time.time() - start_time) * 1000)

        return ToolResult(
            tool_name=self.metadata.name,
            tool_version=self.metadata.version,
            inputs=inputs,
            output={
                "anomalies": anomalies.tolist(),
                "z_scores": z_scores.tolist()
            },
            execution_time_ms=execution_time,
            provenance=["Calculated using numpy"]
        )
