import pandas as pd
from statsmodels.tsa.seasonal import STL
import time
from typing import Dict, Any
from .base import Tool, ToolMetadata, ToolResult

class DecomposeSeasonality(Tool):
    def __init__(self):
        self.metadata = ToolMetadata(
            name="decompose_seasonality",
            version="1.0.0",
            category="Time-Series Forecasting",
            description="Performs STL decomposition on a time series to separate trend, seasonality, and residual.",
            input_schema={
                "type": "object",
                "properties": {
                    "data": {"type": "array", "items": {"type": "number"}},
                    "period": {"type": "integer", "default": 7}
                },
                "required": ["data"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "trend": {"type": "array", "items": {"type": "number"}},
                    "seasonal": {"type": "array", "items": {"type": "number"}},
                    "resid": {"type": "array", "items": {"type": "number"}}
                }
            },
            reproducibility="deterministic",
            classical_basis="STL Decomposition (Cleveland et al. 1990)",
            typical_runtime_ms=50
        )

    def run(self, inputs: Dict[str, Any]) -> ToolResult:
        start_time = time.time()
        data = pd.Series(inputs["data"])
        period = inputs.get("period", 7)

        if len(data) < period * 2:
            return ToolResult(
                tool_name=self.metadata.name,
                tool_version=self.metadata.version,
                inputs=inputs,
                output={},
                execution_time_ms=int((time.time() - start_time) * 1000),
                warnings=["Insufficient data for STL decomposition"]
            )

        stl = STL(data, period=period)
        res = stl.fit()

        execution_time = int((time.time() - start_time) * 1000)

        return ToolResult(
            tool_name=self.metadata.name,
            tool_version=self.metadata.version,
            inputs=inputs,
            output={
                "trend": res.trend.tolist(),
                "seasonal": res.seasonal.tolist(),
                "resid": res.resid.tolist()
            },
            execution_time_ms=execution_time,
            provenance=["Calculated using statsmodels STL"]
        )
