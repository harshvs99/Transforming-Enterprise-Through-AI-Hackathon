import pandas as pd
from prophet import Prophet
import time
from typing import Dict, Any
from .base import Tool, ToolMetadata, ToolResult

class ForecastPipelineQuarterly(Tool):
    def __init__(self):
        self.metadata = ToolMetadata(
            name="forecast_pipeline_quarterly",
            version="1.0.0",
            category="Time-Series Forecasting",
            description="Forecasts pipeline growth for the next quarter using Facebook Prophet. Handles seasonality and holiday effects.",
            input_schema={
                "type": "object",
                "properties": {
                    "ds": {"type": "array", "items": {"type": "string"}},
                    "y": {"type": "array", "items": {"type": "number"}},
                    "periods": {"type": "integer", "default": 90}
                },
                "required": ["ds", "y"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "forecast": {"type": "array"}
                }
            },
            reproducibility="deterministic",
            classical_basis="Facebook Prophet (Additive Regressive Model)",
            typical_runtime_ms=500
        )

    def run(self, inputs: Dict[str, Any]) -> ToolResult:
        start_time = time.time()
        df = pd.DataFrame({
            "ds": pd.to_datetime(inputs["ds"]),
            "y": inputs["y"]
        })

        m = Prophet()
        m.fit(df)

        future = m.make_future_dataframe(periods=inputs.get("periods", 90))
        forecast = m.predict(future)

        execution_time = int((time.time() - start_time) * 1000)

        return ToolResult(
            tool_name=self.metadata.name,
            tool_version=self.metadata.version,
            inputs=inputs,
            output={
                "forecast": forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(30).to_dict(orient="records")
            },
            execution_time_ms=execution_time,
            provenance=["Calculated using prophet library"]
        )
