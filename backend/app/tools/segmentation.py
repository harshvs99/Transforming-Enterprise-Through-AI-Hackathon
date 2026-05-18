import pandas as pd
import time
from typing import Dict, Any
from .base import Tool, ToolMetadata, ToolResult

class RFMAnalysis(Tool):
    def __init__(self):
        self.metadata = ToolMetadata(
            name="rfm_analysis",
            version="1.0.0",
            category="Segmentation",
            description="Performs Recency, Frequency, Monetary (RFM) analysis on customer data.",
            input_schema={
                "type": "object",
                "properties": {
                    "customer_id": {"type": "array", "items": {"type": "string"}},
                    "last_purchase_date": {"type": "array", "items": {"type": "string"}},
                    "purchase_count": {"type": "array", "items": {"type": "integer"}},
                    "total_spend": {"type": "array", "items": {"type": "number"}}
                },
                "required": ["customer_id", "last_purchase_date", "purchase_count", "total_spend"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "rfm_scores": {"type": "object"}
                }
            },
            reproducibility="deterministic",
            classical_basis="RFM Analysis",
            typical_runtime_ms=30
        )

    def run(self, inputs: Dict[str, Any]) -> ToolResult:
        start_time = time.time()
        df = pd.DataFrame({
            "customer_id": inputs["customer_id"],
            "last_purchase_date": pd.to_datetime(inputs["last_purchase_date"]),
            "frequency": inputs["purchase_count"],
            "monetary": inputs["total_spend"]
        })

        now = df["last_purchase_date"].max()
        df["recency"] = (now - df["last_purchase_date"]).dt.days

        # Scoring (1-5 quintiles)
        df["R"] = pd.qcut(df["recency"], 5, labels=[5, 4, 3, 2, 1], duplicates='drop')
        df["F"] = pd.qcut(df["frequency"].rank(method='first'), 5, labels=[1, 2, 3, 4, 5])
        df["M"] = pd.qcut(df["monetary"], 5, labels=[1, 2, 3, 4, 5])

        df["rfm_score"] = df["R"].astype(str) + df["F"].astype(str) + df["M"].astype(str)

        execution_time = int((time.time() - start_time) * 1000)

        return ToolResult(
            tool_name=self.metadata.name,
            tool_version=self.metadata.version,
            inputs=inputs,
            output={
                "rfm_table": df.to_dict(orient="records")
            },
            execution_time_ms=execution_time,
            provenance=["Calculated using pandas quintiles"]
        )
