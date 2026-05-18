from typing import Protocol, runtime_checkable, Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime

class ToolMetadata(BaseModel):
    name: str
    version: str
    category: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    reproducibility: str # 'deterministic', 'seeded_random'
    classical_basis: str
    typical_runtime_ms: int

class MetricDefinitionRef(BaseModel):
    metric_definition_id: int
    canonical_name: str
    version: str

class ToolResult(BaseModel):
    tool_name: str
    tool_version: str
    inputs: Dict[str, Any]
    output: Dict[str, Any]
    execution_time_ms: int
    confidence: Optional[float] = 1.0
    warnings: List[str] = []
    provenance: List[str] = []
    metric_definitions_used: List[MetricDefinitionRef] = []

@runtime_checkable
class Tool(Protocol):
    metadata: ToolMetadata
    def run(self, inputs: Dict[str, Any]) -> ToolResult: ...

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Tool] = {}

    def register(self, tool: Tool):
        key = f"{tool.metadata.name}@{tool.metadata.version}"
        self._tools[key] = tool
        # Also register as latest if not exists or higher version (simple semver check could be added)
        self._tools[tool.metadata.name] = tool

    def get_tool(self, name: str, version: Optional[str] = None) -> Optional[Tool]:
        if version:
            return self._tools.get(f"{name}@{version}")
        return self._tools.get(name)

    def list_tools(self) -> List[ToolMetadata]:
        return [t.metadata for t in self._tools.values() if "@" in t.metadata.name or True] # Simplified

registry = ToolRegistry()
