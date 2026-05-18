import numpy as np
import time
from typing import Dict, Any
from .base import Tool, ToolMetadata, ToolResult

class FindHistoricalAnalog(Tool):
    def __init__(self):
        self.metadata = ToolMetadata(
            name="find_historical_analog",
            version="1.0.0",
            category="Analysis",
            description="Finds the most similar historical period using cosine similarity.",
            input_schema={
                "type": "object",
                "properties": {
                    "current_vector": {"type": "array", "items": {"type": "number"}},
                    "historical_vectors": {"type": "array", "items": {"type": "array", "items": {"type": "number"}}},
                    "historical_periods": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["current_vector", "historical_vectors", "historical_periods"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "top_analog_period": {"type": "string"},
                    "similarity_score": {"type": "number"}
                }
            },
            reproducibility="deterministic",
            classical_basis="Cosine Similarity",
            typical_runtime_ms=20
        )

    def run(self, inputs: Dict[str, Any]) -> ToolResult:
        start_time = time.time()
        current = np.array(inputs["current_vector"])
        historical = np.array(inputs["historical_vectors"])
        periods = inputs["historical_periods"]

        # Simple cosine similarity
        norm_c = np.linalg.norm(current)
        if norm_c == 0:
            similarities = np.zeros(len(historical))
        else:
            norms_h = np.linalg.norm(historical, axis=1)
            dot_products = np.dot(historical, current)
            similarities = dot_products / (norms_h * norm_c + 1e-9)

        best_idx = np.argmax(similarities)

        execution_time = int((time.time() - start_time) * 1000)

        return ToolResult(
            tool_name=self.metadata.name,
            tool_version=self.metadata.version,
            inputs=inputs,
            output={
                "top_analog_period": periods[best_idx],
                "similarity_score": float(similarities[best_idx])
            },
            execution_time_ms=execution_time,
            provenance=["Calculated using numpy"]
        )
