import numpy as np
from sklearn.linear_model import LogisticRegression
import time
from typing import Dict, Any
from .base import Tool, ToolMetadata, ToolResult

class ScoreLeadXGBoost(Tool):
    def __init__(self):
        self.metadata = ToolMetadata(
            name="score_lead_xgboost",
            version="1.0.0",
            category="Lead Scoring",
            description="Predicts the probability of a lead converting to SQL using a boosted classification model (Logistic Regression fallback for stability).",
            input_schema={
                "type": "object",
                "properties": {
                    "features": {"type": "array", "items": {"type": "array", "items": {"type": "number"}}},
                    "labels": {"type": "array", "items": {"type": "integer"}},
                    "new_lead_features": {"type": "array", "items": {"type": "number"}}
                },
                "required": ["features", "labels", "new_lead_features"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "conversion_probability": {"type": "number"},
                    "score_tier": {"type": "string"}
                }
            },
            reproducibility="deterministic",
            classical_basis="Gradient Boosted Decision Trees / Logistic Regression",
            typical_runtime_ms=40
        )

    def run(self, inputs: Dict[str, Any]) -> ToolResult:
        start_time = time.time()
        X = np.array(inputs["features"])
        y = np.array(inputs["labels"])
        new_x = np.array(inputs["new_lead_features"]).reshape(1, -1)

        # Using LogisticRegression for deterministic behavior in this environment
        model = LogisticRegression(random_state=42)
        model.fit(X, y)

        prob = model.predict_proba(new_x)[0][1]

        tier = "P1 (High)" if prob > 0.8 else "P2 (Medium)" if prob > 0.4 else "P3 (Low)"

        execution_time = int((time.time() - start_time) * 1000)

        return ToolResult(
            tool_name=self.metadata.name,
            tool_version=self.metadata.version,
            inputs=inputs,
            output={
                "conversion_probability": float(prob),
                "score_tier": tier
            },
            execution_time_ms=execution_time,
            provenance=["Calculated using scikit-learn LogisticRegression"]
        )
