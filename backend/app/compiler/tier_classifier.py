from pydantic import BaseModel
from typing import Optional, List
import hashlib

class TierResult(BaseModel):
    tier: int
    confidence: float
    suggested_playbook_id: Optional[str] = None
    reasoning: str

class TierClassifier:
    async def classify(self, question: str) -> TierResult:
        # Simulate a more sophisticated classifier using keyword and structural analysis
        q = question.lower().strip()

        # Tier 1 (Lookup): Direct questions, single metric
        if any(word in q for word in ["what is", "how many", "count", "current"]) and not any(word in q for word in ["why", "compare", "vs", "effect", "impact"]):
            return TierResult(
                tier=1,
                confidence=0.98,
                reasoning="Identified as a direct lookup query with a single metric reference."
            )

        # Tier 2 (Analysis): "Why", Comparisons, Root cause
        _anomaly_words = ["why", "drop", "dropping", "dropped", "spike", "spiking", "spiked",
                          "increase", "increased", "increasing", "decrease", "decreased", "decreasing",
                          "rise", "rising", "rose", "fell", "fall", "falling", "decline", "declining"]
        _analysis_words = _anomaly_words + ["compare", "vs", "difference", "change", "changed",
                                             "where", "which", "segment", "channel", "breakdown"]
        if any(word in q for word in _analysis_words):
            playbook = "metric_anomaly_diagnosis" if any(word in q for word in _anomaly_words) else "channel_comparison"
            return TierResult(
                tier=2,
                confidence=0.92,
                suggested_playbook_id=playbook,
                reasoning=f"Requires multi-step analytical chain. Routing to {playbook} playbook."
            )

        # Tier 3 (Novel): Abstract, strategy, or unknown patterns
        return TierResult(
            tier=3,
            confidence=0.85,
            reasoning="Complex strategic question requiring novel tool chaining and reasoning."
        )
