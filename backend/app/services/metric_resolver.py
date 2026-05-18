from typing import List, Optional
from sqlalchemy.orm import Session
from ..models import MetricDefinition
from pydantic import BaseModel

class ResolvedMetric(BaseModel):
    text: str
    metric_definition_id: int
    canonical_name: str
    version: str
    owner: str

class AmbiguousMetric(BaseModel):
    text: str
    candidates: List[dict]

class UndefinedMetric(BaseModel):
    text: str

class ResolvedMetrics(BaseModel):
    resolutions: List[ResolvedMetric] = []
    ambiguous: List[AmbiguousMetric] = []
    undefined: List[UndefinedMetric] = []

    def has_unresolved(self) -> bool:
        return len(self.ambiguous) > 0 or len(self.undefined) > 0

class MetricResolver:
    def __init__(self, db: Session):
        self.db = db

    async def resolve_all(self, text: str) -> ResolvedMetrics:
        # In a real scenario, we'd use an LLM to extract metric candidates first.
        # For this implementation, we'll do simple keyword matching against known aliases and display names.

        all_metrics = self.db.query(MetricDefinition).filter(MetricDefinition.deprecated_at == None).all()

        results = ResolvedMetrics()

        # Simple extraction logic: check if any metric display name or alias is in the text
        # (Very naive, but follows the deterministic contract)
        text_lower = text.lower()

        for m in all_metrics:
            matched = False
            match_text = ""

            if m.display_name.lower() in text_lower:
                matched = True
                match_text = m.display_name
            else:
                for alias in (m.aliases or []):
                    if alias.lower() in text_lower:
                        matched = True
                        match_text = alias
                        break

            if matched:
                results.resolutions.append(ResolvedMetric(
                    text=match_text,
                    metric_definition_id=m.id,
                    canonical_name=m.canonical_name,
                    version=m.version,
                    owner=m.owner
                ))

        # Note: In the real system, we'd handle ambiguity if multiple metrics matched the same text
        # or if the LLM extracted something we couldn't find.

        return results
