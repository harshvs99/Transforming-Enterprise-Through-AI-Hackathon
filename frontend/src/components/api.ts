export interface MetricDefinition {
  id: number;
  canonical_name: string;
  display_name: string;
  version: string;
  owner: string;
}

export interface ToolMetadata {
  name: string;
  version: string;
  category: string;
  description: string;
  reproducibility: string;
  classical_basis: string;
}

export interface ToolResult {
  tool_name: string;
  tool_version: string;
  inputs: any;
  output: any;
  execution_time_ms: number;
}

export interface QueryResponse {
  answer: string;
  tier: number;
  model: string;
  metric_resolutions: any[];
  executions: ToolResult[];
}
