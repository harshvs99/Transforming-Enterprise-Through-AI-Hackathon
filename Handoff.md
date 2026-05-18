# Thinking Machines — Build Handoff (Final)

**Project:** Thinking Machines — a B2B SaaS marketing intelligence platform
**Codename / team name:** Thinking Machines
**Reference fictional client in demos:** TestPilot Inc.
**Hackathon track:** Track 4 — Data & Intelligence
**Build window:** 7 days
**Team:** 1 data engineer (EE degree, NLP background, marketing domain experience at a B2B SaaS dev tool company) + 1 MBB consultant
**Target judges:** Global enterprise/SaaS audience

---

## 0. How to Use This Document

This is the complete, executable build plan. Read it top-to-bottom before writing a line of code. Every architectural choice is intentional and the rationale is included where it matters.

The thesis is one sentence and it is unviolable: **LLMs as compilers, statistics as the workhorse. Same question, same answer, always.**

Every feature, every tool, every UI element either serves that thesis or it does not exist. If during the build you find yourself adding something that doesn't deepen that line, stop and reread Section 13 (Decision Tree) before continuing.

---

## 1. The One-Sentence Pitch

> **"A marketing intelligence platform that uses LLMs only as compilers — natural language goes in, deterministic statistical analysis comes out, the same way every time."**

Alternative framing for non-technical judges:

> **"A one-person marketing team operating like a ten-person one — by giving every marketing question access to 30 years of battle-tested statistics, translated through natural language."**

---

## 2. Strategic Thesis — Why This Wins

### The narrative hook
Anthropic ran its entire growth marketing operation with one person for 10 months while scaling from $1B to $7B annualized revenue — using Claude Code as a force multiplier. Most marketers can't write code. Most AI marketing tools that *claim* to fix that produce different answers to the same question, can't show their work, and can't be deployed in a regulated environment.

We took the contrarian path: LLMs do as little as possible. Statistics does the work. The marketer gets the leverage without the unreliability.

### The market gap
Every "AI marketing analytics" startup in 2026 has the same architecture: dump data into a vector DB, let the LLM reason over it, hope for the best. Then they explain away the unreliability with "human-in-the-loop." We invert this: the analysis is deterministic and human-trusted. The LLM is in the loop, but only as a translator, never as the analyst.

### Three reasons judges will remember this submission

1. **Reproducibility as a feature.** Every output traces back to specific tool calls with specific parameters, against versioned metric definitions. Same input, same output, always. This is the only deployable architecture in regulated environments.

2. **Classical ML is the engine.** Prophet, Markov chains, Isolation Forest, Bayesian bandits, LDA, survival analysis, Bayesian structural time-series. Decades of validated methods doing the real work. The LLM is the polite translator at the front desk.

3. **The system learns its own kernel.** When a truly novel question arrives, Investigation Mode lets a SOTA model write a *new* deterministic tool (with full type signatures, schema validation, test cases), the human approves it, and from that point forward the new case is also deterministic. The library grows. Trust compounds.

### Track 4 alignment (5 of 5 focus areas)

- ✅ RAG over proprietary multi-source data (structured tool registry + knowledge base)
- ✅ AI-powered data pipelines AND **validation** (validation is the moat)
- ✅ Analytics agents for natural-language querying (compiler pattern)
- ✅ Anomaly detection and forecasting (Prophet, Isolation Forest, STL — battle-tested)
- ✅ Knowledge graph extraction (for unstructured sources like Confluence)

---

## 3. The Compiler Architecture

### High-level flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER (marketer at TestPilot Inc.)                                  │
│  "Why did our DACH mid-market CAC spike in October?"                │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 1 — TIER CLASSIFIER (Gemini Flash, ~80-100ms)                │
│  Classify into Tier 1 (Lookup), Tier 2 (Analysis), Tier 3 (Novel).  │
│  Output: {tier, confidence, suggested_playbook_id}                  │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│  METRIC RESOLUTION (deterministic, no LLM judgment)                 │
│  Resolve every metric reference against metric_definitions table.   │
│  "CAC" → metric_definition_id=12, version=2.1                       │
│  If ambiguous or undefined: raise ClarificationRequest, halt.       │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 2 — PLAN COMPILER                                            │
│  Tier 1 / Tier 2: stays on Gemini Flash                             │
│  Tier 3: escalates to Gemini Pro                                    │
│  Output: structured execution plan (JSON) with resolved metric IDs  │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│  EXECUTION PLAN (structured JSON, fully auditable)                  │
│  [                                                                  │
│    {tool: "detect_anomaly_stl_residual",                            │
│     params: {metric_def_id: 12, segment: 4, window: "30d"}},        │
│    {tool: "decompose_metric", ...},                                 │
│    {tool: "compare_cohorts", ...},                                  │
│    {tool: "causal_bayesian_impact", ...},                           │
│    {tool: "attribution_markov_chain", ...},                         │
│    {tool: "find_historical_analog",                                 │
│     params: {window: "30d", metric_def_ids: [12, 7, 9, 18, 22]}}    │
│  ]                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│  DETERMINISTIC TOOL LAYER                                           │
│  Python functions with type signatures, schema validation,          │
│  reproducibility guarantees. Mostly classical ML wrappers.          │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STRUCTURED RESULT (with provenance + metric definition IDs)        │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│  DECOMPILER (Gemini Flash, low temperature)                         │
│  Translate structured result → natural language.                    │
│  Select visualization template. Cite tools + metric defs.           │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│  USER SEES                                                          │
│  - Plain-language answer                                            │
│  - Charts/diagrams from the tool outputs                            │
│  - Expandable "show me how" Audit Drawer with full trail            │
└─────────────────────────────────────────────────────────────────────┘
```

### Five layers, five rules

| Layer | Job | Rule |
|-------|-----|------|
| Tier Classifier (Flash) | Classify query complexity | NEVER executes; only routes |
| Metric Resolver (deterministic) | Map names → versioned definitions | NEVER infers; raises clarification if undefined |
| Compiler (Flash or Pro) | Translate NL → structured tool plan | NEVER invents tools or analytical logic |
| Tool Registry | Execute analysis | EVERY tool is deterministic and versioned |
| Decompiler (Flash) | Translate result → NL | NEVER adds information not in the result |

These five NEVERs define the system. Memorize them. They answer every "what if the LLM hallucinates" question a judge asks.

### 3.1 Two-Stage Routing — Specification

The tier classifier prompt (Gemini Flash, structured output):

```python
TIER_CLASSIFIER_PROMPT = """
Classify this marketing analytics question into one of three tiers.

Tier 1 (Lookup):
  - Single tool call needed
  - Direct match to a known playbook with confidence >= 0.90
  - Examples: "what was MQL count last week?", "current CAC by channel"

Tier 2 (Analysis):
  - 2-5 tool chain needed
  - Playbook match exists; parameter inference required
  - Examples: "why did MQL→SQL drop in October?", "compare DACH vs US"

Tier 3 (Novel):
  - No confident playbook match
  - Requires multi-step reasoning, novel tool chaining, or Investigation Mode
  - Examples: "is our content strategy paying off long-term?",
              "what's the second-order effect of cutting LinkedIn spend?"

Output strict JSON:
{
  "tier": 1 | 2 | 3,
  "confidence": float in [0, 1],
  "suggested_playbook_id": str | null,
  "reasoning": str (one sentence)
}

Question: {question}
Available playbooks: {playbook_index}
"""
```

Escalation logic:

```python
async def compile_query(question: str) -> ExecutionPlan:
    # Stage 1: always Flash
    tier_result = await gemini_flash.classify(question)

    # Stage 2: model selection based on tier
    if tier_result.tier in (1, 2):
        compiler_model = "gemini-2.0-flash"
        compiler = flash_compiler
    elif tier_result.tier == 3:
        compiler_model = "gemini-2.0-pro"
        compiler = pro_compiler
    else:
        raise ValueError(f"Invalid tier: {tier_result.tier}")

    # Metric resolution happens before plan compilation
    resolved_metrics = await metric_resolver.resolve_all(question)
    if resolved_metrics.has_unresolved():
        raise ClarificationRequest(resolved_metrics.unresolved)

    # Plan compilation with resolved metrics
    plan = await compiler.compile(question, resolved_metrics,
                                   tier_result.suggested_playbook_id)

    # Stamp the query record
    await db.update_query(
        query_id=plan.query_id,
        compiler_tier=tier_result.tier,
        compiler_model_used=compiler_model,
        metric_resolutions=resolved_metrics.to_json()
    )

    return plan
```

Cost/latency math (back-of-envelope for the pitch):
- ~80-85% of marketing questions are Tier 1 or 2
- Flash costs ~10× less than Pro per token
- Median Tier 1 query: ~200ms end-to-end vs ~800ms if everything went through Pro
- Net: ~60-70% cost reduction on common queries, ~3-4× faster median response

This belongs on a deck slide.

### 3.2 Semantic Metric Resolution — Specification

**The contract:** No metric name is ever resolved by LLM inference. Every reference to "CAC", "MQL", "pipeline", "revenue", "conversion rate" — any quantitative concept — is resolved against the `metric_definitions` table.

Resolver behavior:

```python
class MetricResolver:
    async def resolve_all(self, question: str) -> ResolvedMetrics:
        # Step 1: extract metric references from question (Flash, structured output)
        # NOTE: this is constrained extraction, NOT inference of meaning
        candidates = await self._extract_candidates(question)

        # Step 2: deterministic lookup against metric_definitions
        resolutions = []
        unresolved = []

        for candidate in candidates:
            matches = await db.fetch_metric_definitions(
                display_name_or_alias=candidate.text,
                effective_date=NOW(),
                not_deprecated=True
            )

            if len(matches) == 1:
                resolutions.append(ResolvedMetric(
                    text=candidate.text,
                    metric_definition_id=matches[0].id,
                    version=matches[0].version,
                    owner=matches[0].owner
                ))
            elif len(matches) > 1:
                unresolved.append(AmbiguousMetric(
                    text=candidate.text,
                    candidates=matches
                ))
            else:
                unresolved.append(UndefinedMetric(text=candidate.text))

        return ResolvedMetrics(resolutions=resolutions, unresolved=unresolved)
```

Clarification flow:

If a question references an undefined or ambiguous metric, the compiler does NOT proceed. It raises a `ClarificationRequest` which the frontend renders as a question back to the user:

> *"You asked about 'lead quality.' We have three approved metric definitions that could match: `lead_quality_score_v1`, `mql_conversion_rate`, `lead_engagement_index`. Which do you mean? (Or define a new one in Metric Studio.)"*

This is the enterprise trust mechanism: the system would rather ask than guess.

### 3.3 Why Medium-Loose Determinism

There's a determinism spectrum:
- **Strict:** LLM only fills params in pre-written SQL templates. Too rigid for the long tail.
- **Medium-Loose:** LLM picks AND chains tools; novel chaining encouraged; SOTA model can WRITE new tools in Investigation Mode. (Our choice.)
- **Loose:** LLM writes SQL freely. Defeats the purpose.

Medium-Loose differentiates us from both rigid RPA tools AND fragile "AI agent" tools.

---

## 4. Stack Decisions (Locked)

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Database | Postgres 16 + pgvector | Single DB for relational + vector + JSONB. Production-realistic. |
| LLM (tier classifier, compiler tiers 1-2, decompiler) | Gemini 2.0 Flash | Cheap, fast, structured output, ~10× cost saving vs Pro |
| LLM (compiler Tier 3) | Gemini 2.0 Pro | Reasoning depth for novel queries |
| LLM (Investigation Mode tool synthesis) | Claude Opus 4.7 or Gemini 2.5 Pro | Best coding model for new tool generation |
| Embeddings | Gemini text-embedding-004 | Consistent ecosystem |
| Classical ML | scikit-learn, statsmodels, Prophet, lifelines, causalimpact, pymc, ruptures, hdbscan | Battle-tested, reproducible |
| Backend | FastAPI (Python) | Async I/O, fast prototyping, ML-friendly |
| Frontend | Next.js 14 (App Router) + Tailwind + shadcn/ui | Standard premium B2B SaaS aesthetic |
| Visualization | Recharts (standard), Visx/D3 (custom), React Flow (graphs), Framer Motion (animation) | See Section 8 |
| Streaming | Server-Sent Events (SSE) | Simpler than WebSocket for one-way streams |
| State management | Zustand (client) + TanStack Query (server) | Lean, modern |
| Deployment | Vercel (frontend) + Railway (API + Postgres) | Demo-grade, no DevOps time sink |

---

## 5. The Tool Registry — Classical ML Inventory

The tool registry is the heart of the system. Build it with care.

### 5.1 The Tool contract

```python
from typing import Protocol, runtime_checkable
from datetime import datetime
from pydantic import BaseModel

class ToolMetadata(BaseModel):
    name: str
    version: str  # semver
    category: str
    description: str
    input_schema: dict  # JSON Schema
    output_schema: dict
    reproducibility: str  # 'deterministic', 'seeded_random', 'bayesian'
    classical_basis: str  # citation: "Box & Jenkins 1970", etc.
    typical_runtime_ms: int

class MetricDefinitionRef(BaseModel):
    metric_definition_id: int
    canonical_name: str
    version: str

class ToolResult(BaseModel):
    tool_name: str
    tool_version: str
    inputs: dict
    output: dict
    execution_time_ms: int
    confidence: float | None
    warnings: list[str]
    provenance: list[str]
    metric_definitions_used: list[MetricDefinitionRef]

@runtime_checkable
class Tool(Protocol):
    metadata: ToolMetadata
    def run(self, inputs: dict) -> ToolResult: ...
```

Every tool implements this contract. Every result includes `metric_definitions_used`. No exceptions.

### 5.2 Tool inventory by category

Build 29 tools for the hackathon. Each takes 30-90 minutes (most are wrappers around battle-tested libraries). Each tool needs a deterministic test case the moment you write it.

#### A. Time-Series Forecasting

| Tool | Method | Library | When to use |
|------|--------|---------|-------------|
| `forecast_pipeline_quarterly` | SARIMA / Prophet | `prophet`, `statsmodels` | "What will pipe look like next quarter?" |
| `decompose_seasonality` | STL decomposition | `statsmodels` | Separate trend/seasonal/residual |
| `forecast_with_uncertainty` | Prophet with MCMC sampling | `prophet` | Need confidence intervals |

#### B. Anomaly Detection

| Tool | Method | Library | When to use |
|------|--------|---------|-------------|
| `detect_anomaly_zscore` | Z-score / Modified Z-score | `numpy` + `scipy` | Single-metric outliers |
| `detect_anomaly_stl_residual` | STL residual z-score | `statsmodels` | Anomalies adjusted for seasonality |
| `detect_changepoint` | PELT / Bayesian online | `ruptures` | Find when behavior changed |
| `find_historical_analog` | Cosine similarity on metric vectors | `numpy` + `pgvector` | Ground current anomaly in past patterns |

#### C. Causal Inference (this is where you stand out)

| Tool | Method | Library | When to use |
|------|--------|---------|-------------|
| `causal_did` | Difference-in-differences | `linearmodels` | "Did the campaign cause the lift?" |
| `causal_bayesian_impact` | Bayesian structural time-series | `causalimpact` | Pre/post intervention analysis |

Almost no AI marketing tool does proper causal inference. Having `causal_bayesian_impact` in the registry is a *judge's-attention-grabbing* differentiator.

#### D. Attribution

| Tool | Method | Library | When to use |
|------|--------|---------|-------------|
| `attribution_markov_chain` | Markov chain attribution | port of R `ChannelAttribution` | Multi-touch with removal effect |
| `attribution_shapley` | Shapley value | `shap` | Game-theoretic fair attribution |

#### E. Segmentation / Clustering

| Tool | Method | Library | When to use |
|------|--------|---------|-------------|
| `cluster_kmeans` | K-means++ | `scikit-learn` | Standard clustering |
| `rfm_analysis` | Recency-Frequency-Monetary | custom | Classic customer segmentation |
| `cohort_analysis` | Cohort retention curves | `pandas` + custom | Retention/conversion over time |
| `icp_drift_detection` | Population Stability Index | custom | Has our ICP profile shifted? |

#### F. Lead Scoring / Conversion Prediction

| Tool | Method | Library | When to use |
|------|--------|---------|-------------|
| `score_lead_xgboost` | XGBoost classifier | `xgboost` | Predict MQL→SQL probability |
| `predict_churn_cox` | Cox proportional hazards | `lifelines` | Time-to-churn modeling |
| `feature_importance_shap` | SHAP values | `shap` | Explain why a lead scored high |

#### G. Experiment Design / Bayesian Methods

| Tool | Method | Library | When to use |
|------|--------|---------|-------------|
| `ab_test_bayesian` | Beta-binomial posterior | `pymc` | Probability one variant beats another |
| `multi_armed_bandit_thompson` | Thompson sampling | custom | Adaptive allocation across variants |
| `sample_size_calculator` | Power analysis | `statsmodels` | How many users needed? |

#### H. Content / NLP (pre-LLM)

| Tool | Method | Library | When to use |
|------|--------|---------|-------------|
| `topic_model_lda` | Latent Dirichlet Allocation | `gensim` | Discover content topics |
| `extract_keywords_tfidf` | TF-IDF | `scikit-learn` | Distinctive keywords per segment |
| `sentence_similarity_sbert` | Sentence-BERT embeddings | `sentence-transformers` | Compare two pieces of content |

#### I. Statistical Comparison

| Tool | Method | Library | When to use |
|------|--------|---------|-------------|
| `compare_distributions_ks` | Kolmogorov-Smirnov | `scipy.stats` | Are two distributions different? |
| `compare_means_welch` | Welch's t-test | `scipy.stats` | Different means, unequal variance |
| `bootstrap_confidence_interval` | Bootstrap CI | custom | Robust CIs without assumptions |

#### J. Funnel & Flow Analysis (domain-specific)

| Tool | Method | Library | When to use |
|------|--------|---------|-------------|
| `funnel_conversion_rates` | Stage-to-stage rates | custom | Standard funnel report |
| `funnel_drop_off_analysis` | Per-stage cohort analysis | custom | Where are leads getting stuck? |
| `pipe_decomposition` | Decompose pipe by channel/segment | custom | Sourced vs Influenced split |

**Total: 29 tools.** Cover ~80% of marketing questions deterministically; Investigation Mode handles the rest.

### 5.3 `find_historical_analog` — Detailed Specification

This tool deserves dedicated specification because it's a competitive differentiator.

**One-line description:** Given a current time window, find the most structurally similar historical period and report what happened next.

**Why it exists:** Pure statistics tell you *that* an anomaly is real. Historical analogs tell you *whether you've seen this before and how it played out*. That second answer is what a senior marketer actually wants.

```python
class FindHistoricalAnalogInput(BaseModel):
    period_start: date
    period_end: date
    segment_id: int | None  # None = whole company
    metric_def_ids: list[int]  # which metrics define the "shape" being matched
    k: int = 3
    min_similarity: float = 0.65
    exclude_window_days: int = 60

class HistoricalAnalog(BaseModel):
    period_start: date
    period_end: date
    similarity: float
    segment_id: int | None
    what_happened_after: dict
    # e.g. {"cac": {"delta_pct": -0.18,
    #               "narrative": "normalized after LinkedIn audience refresh"}}

class FindHistoricalAnalogOutput(BaseModel):
    query_period: tuple[date, date]
    analogs: list[HistoricalAnalog]
    diagnostic_notes: list[str]

async def find_historical_analog(
    inputs: FindHistoricalAnalogInput
) -> FindHistoricalAnalogOutput:
    # 1. Compute current period vector (z-normalized across each metric)
    current_vec = await _compute_period_vector(
        inputs.period_start, inputs.period_end,
        inputs.segment_id, inputs.metric_def_ids
    )

    # 2. Retrieve all historical snapshots from metric_snapshots
    historical_vecs = await db.fetch_snapshots(
        segment_id=inputs.segment_id,
        metric_def_ids=inputs.metric_def_ids,
        exclude_overlap_with=(inputs.period_start, inputs.period_end),
        exclude_window_days=inputs.exclude_window_days
    )

    # 3. Cosine similarity (pgvector handles this server-side)
    similarities = cosine_similarities(current_vec, historical_vecs)

    # 4. Top-k filtering
    top_k = top_k_by_similarity(similarities, k=inputs.k,
                                 threshold=inputs.min_similarity)

    # 5. For each analog, compute what happened in 60 days after
    analogs = [await _compute_followup(s, days=60) for s in top_k]

    return FindHistoricalAnalogOutput(
        query_period=(inputs.period_start, inputs.period_end),
        analogs=analogs,
        diagnostic_notes=_diagnostic_notes(historical_vecs)
    )
```

Decompiler output example:

> *"The current pipeline state most closely resembles **October 2024** (similarity: 0.87). In the 60 days following that period, CAC normalised by 18% after a LinkedIn audience refresh. Two weaker analogs found: April 2025 (0.74) where the anomaly persisted for 9 weeks, and August 2024 (0.71) where it resolved through seasonal change. The current case is most likely a repeat of the October 2024 pattern."*

This is the kind of answer that lands with judges.

### 5.4 Tool versioning and the audit trail

Every tool result includes `tool_name` + `tool_version` + `metric_definitions_used`. Bumping a tool version requires keeping old + new for reproducibility. The audit panel in the UI shows the full trace (see Section 8).

---

## 6. Investigation Mode

This is the answer to the question: *what if we encounter something that's truly novel?*

### When it triggers

Three signals activate Investigation Mode:
1. Tier classifier returns Tier 3 with no confident playbook match
2. The compiler tries to chain tools and the chain produces inconsistent/low-confidence outputs
3. The user explicitly invokes it ("This isn't matching what I'm seeing, dig deeper")

### The workflow

```
1. INVESTIGATION FRAMING
   The user describes what they're seeing in plain language.
   The system summarizes the existing data picture (which deterministic
   tools have already been run, what they returned).

2. HYPOTHESIS BRAINSTORM
   The SOTA model (Claude Opus 4.7 or Gemini 2.5 Pro) proposes
   3-5 potential explanations. Each is tagged with:
     - Can this be checked with existing tools? (yes/no)
     - If yes, which tools and what params?
     - If no, what new tool would need to exist?
   The user picks which hypotheses to investigate.

3. NEW TOOL SYNTHESIS (when needed)
   For hypotheses that need a new tool:
     - The SOTA model writes a candidate tool function:
       * Python with type signatures
       * Pydantic input/output schemas
       * Citation of the classical method it implements
       * Test cases with expected outputs
     - Static analysis runs (ruff, mypy)
     - Schema validation runs against the database
     - The tool runs on a small validation sample
     - The HUMAN REVIEWS and approves (mandatory)
   On approval, the tool is added to the registry permanently
   (versioned, audited, available to all future queries).

4. INVESTIGATION OUTPUT
   - Natural language answer
   - List of (existing + newly-created) tools used
   - Full audit trail
   - Flag in the registry: "These N tools were created during
     investigation X on date Y by user Z"

5. SYSTEM LEARNS
   Next time a similar question arrives, the compiler can route
   to the new tools directly. The investigation graduates to a
   normal deterministic case.
```

### Why this matters strategically

Two problems no other AI marketing tool solves cleanly:
1. **Coverage of the long tail:** No predefined library covers every question. Investigation Mode handles the rest.
2. **Trust growth over time:** Every novel investigation produces auditable new tools, not new ad-hoc LLM judgments. The kernel grows; trust compounds.

This is **also where the ecosystem story lives**: tools created in one tenant's investigations can (with permission) become available to all tenants. The library is communal. This is the strategy-school "ecosystem strategy" expressed in concrete software architecture.

### Demo angle

In the demo, deliberately ask a question that's NOT in the tool registry. Show Investigation Mode kicking in. Show the SOTA model proposing a new tool. Show the human approving. Show the next similar question now being deterministic. A 60-second sequence that demonstrates the entire philosophy.

---

## 7. The Modules

### 7.1 Analytics Module (the showcase)

**Role:** Natural-language querying with full audit trail.

**Per-question pipeline:**

```
1. Compile (Stage 1 + Metric Resolution + Stage 2)
   → execution plan with N tool calls
2. Execute (parallel where possible)
   → ToolResults with provenance
3. Synthesize (deterministic logic)
   → ranked findings, confidence scores
4. Decompile (Flash, low temperature)
   → natural language answer + visualization template selection
5. Present (frontend)
   → answer + chart + expandable audit panel
```

**The MBB consultant's contribution:** Designs the **playbook library** — the mapping from question types to tool chains.

### Playbooks (build 6, not 8)

**Build these 6 on Day 3:**

```yaml
playbook_id: metric_anomaly_diagnosis
when: question matches "why did METRIC change in PERIOD?"
chain:
  1. detect_anomaly_stl_residual     → confirm anomaly is real
  2. decompose_metric                → break into contributing factors
  3. compare_cohorts (KS test)       → find which subsegment moved
  4. causal_bayesian_impact          → isolate causal driver
  5. attribution_markov_chain        → which channels participated
  6. find_historical_analog          → ground in past patterns
output_template: executive_diagnosis_with_analog

playbook_id: channel_comparison
when: question matches "which channel is best for X?"
chain:
  1. pipe_decomposition              → channel-level pipe contribution
  2. attribution_shapley             → fair credit allocation
  3. cohort_analysis                 → conversion rates per channel
  4. funnel_velocity                 → speed through funnel by channel
output_template: channel_scorecard

playbook_id: funnel_diagnosis
when: question matches "why is funnel stage X dropping?"
chain:
  1. funnel_drop_off_analysis        → identify worst stage
  2. compare_distributions_ks        → vs historical baseline
  3. cohort_analysis                 → which cohorts are affected
  4. icp_drift_detection             → is ICP shifting?
output_template: funnel_diagnostic

playbook_id: segment_deep_dive
when: question matches "tell me about segment X"
chain:
  1. rfm_analysis                    → segment composition
  2. funnel_conversion_rates         → segment funnel
  3. pipe_decomposition              → segment channel mix
  4. score_lead_xgboost              → segment lead quality
output_template: segment_profile

playbook_id: attribution_analysis
when: question matches "how should we credit channel X for Y?"
chain:
  1. attribution_markov_chain        → removal effects
  2. attribution_shapley             → game-theoretic credit
  3. causal_bayesian_impact          → incremental lift
output_template: attribution_report

playbook_id: experiment_design
when: user wants to test a hypothesis
chain:
  1. sample_size_calculator          → how big does the test need to be
  2. multi_armed_bandit_thompson     → optimal allocation strategy
  3. ab_test_bayesian                → expected probability of winning
output_template: experiment_brief
```

**Two playbooks deliberately NOT built upfront** (let Investigation Mode handle them on first ask — natural demo material):
- `content_analysis`
- `forecast_request`

### 7.2 Hypothesis Engine

**Role:** Generate, prioritize, and design marketing experiments.

Three deterministic components and one LLM translation layer:

**Component 1: Gap Detector (deterministic)** — continuously scans:
- `icp_drift_detection` → has the ICP profile shifted?
- `detect_changepoint` on key metrics → has something changed?
- `funnel_drop_off_analysis` per segment → where are we losing leads?
- `compare_distributions_ks` vs benchmarks → which segments underperform?

**Component 2: Hypothesis Template Library** (structured, not LLM-generated):

```yaml
- template_id: channel_underperformance
  trigger: gap_detector returns channel X underperforming by >15%
  hypothesis_form: "Channel {channel} for segment {segment} is underperforming
                   benchmark by {gap}%. Hypothesis: {failure_mode}"
  failure_modes: [creative_fatigue, audience_saturation, attribution_loss,
                  competitive_pressure, seasonality_misread]
  test_design_tool: design_channel_test

- template_id: icp_drift
  trigger: PSI > 0.25 on ICP feature distribution
  hypothesis_form: "Our ICP profile has drifted on dimension {feature}.
                   Hypothesis: {targeting | qualification | content} needs adjustment"
  test_design_tool: design_icp_realignment_test

- template_id: funnel_friction
  trigger: stage-to-stage rate drop > 1.5 sigma below historical
  hypothesis_form: "Lead drop-off at stage {stage} has increased.
                   Hypothesis: {ux_friction | qualification_too_strict |
                                content_mismatch | sales_capacity}"
  test_design_tool: design_funnel_unblock_test
```

Aim for 10 templates total.

**Component 3: Prioritization (deterministic scoring function):**

```python
def score_hypothesis(h: Hypothesis) -> float:
    return (
        h.predicted_lift            # from causal_bayesian_impact estimate
        * h.addressable_audience    # from segment size
        * h.confidence              # from gap detector signal strength
    ) / (
        h.estimated_cost            # from playbook
        + h.time_to_signal_days     # from sample_size_calculator
    )
```

**Component 4: LLM as translation layer** — takes the top-3 scored hypotheses and renders them as natural-language experiment briefs. The LLM does NOT invent hypotheses; it presents them.

**The simulator** (for demo):
- Simulated B2B SaaS funnel with planted ground truths
- Hypotheses get tested in the simulator
- Results update the data, gap detector re-runs, new hypotheses emerge
- Show a full learning loop in 30 demo seconds

### 7.3 Content Performance Module (LinkedIn integration)

**Role:** Analyze content effectiveness, feed insights to the Brain.

- The pre-built Chrome extension scrapes LinkedIn data
- Webhook POSTs structured data to platform API
- Deterministic tools process it: `topic_model_lda`, `extract_keywords_tfidf`, `sentence_similarity_sbert`, `cohort_analysis`
- Results: which topics resonate with which segments, which content formats drive funnel movement

This module is the simplest. Don't overbuild it. Use it primarily to **prove the integration pattern** for third-party modules.

### 7.4 Stub modules (UI-only)

Greyed tiles signaling extensibility:
- Ad Copy Variant Generator
- Email Sequence Designer
- Competitive Intel Monitor
- SEO Keyword Strategist
- Webinar Performance Analyzer
- Tool Marketplace (community-contributed tools — the ecosystem signal)

---

## 8. Frontend Plan

The frontend is not a wrapper around the API. It's a deliberate visual demonstration of the philosophy: deterministic results, beautiful presentation, full auditability.

### 8.1 Visual identity

| Element | Choice | Rationale |
|---------|--------|-----------|
| Theme | Dark mode primary (light optional) | Dev-tool aesthetic, matches B2B SaaS judges |
| Typography | Inter (UI) + JetBrains Mono (code/data) | Premium B2B SaaS pairing |
| Primary accent | Sophisticated cyan-teal (#06B6D4 / #14B8A6) | Technical without being cliché |
| Secondary accent | Muted amber (warnings), soft green (confirmations) | Restrained signal colors |
| Density | Medium-high (Linear-inspired) | Dense but readable, signals serious users |
| Motion | Framer Motion, ~200ms transitions | Smooth, never showy |

**Reference benchmarks:** Linear (density), Vercel (whitespace), Stripe (data clarity), Retool (technical depth).
**Avoid:** generic "AI startup" aesthetic (gradient blobs, glowing accents, neon).

### 8.2 Tech stack

```
Next.js 14 (App Router)         → Pages, routing, server components
Tailwind CSS                    → Styling
shadcn/ui                       → Base components
Framer Motion                   → Animation
TanStack Query                  → Server state, caching
Zustand                         → Client state
React Hook Form + Zod           → Forms with validation
Recharts                        → Standard charts
Visx (D3 React wrapper)         → Custom viz (Sankey, treemap, force layout)
React Flow                      → Graph/tree visualizations
react-resizable-panels          → Workspace splits
react-hot-toast                 → Notifications
cmdk                            → Command palette
```

### 8.3 Key screens

#### Screen 1: Pipeline Overview (the hero)

**The single most important screen.** This is the live-data illustration.

- **Animated Sankey diagram:** Prospects → Leads → MQLs → SALs → Opps → Closed-Won
- Each band thickness = volume in that stage transition
- Color-coded by channel (5 channels, 5 colors)
- **Live counters** at each stage that increment as new data arrives (SSE stream)
- Hover any stage → drill-down panel with cohort breakdown
- Filter bar: time period, segment, geography, channel
- Toggle: Marketing Sourced vs Marketing Influenced
- **Anomaly markers** appear as pulsing dots when gap detector fires

Implementation:
- Use Visx Sankey
- Animate band width transitions with Framer Motion
- Live counter increments via SSE
- Anomaly pulse = simple keyframe animation

This is the screen on the deck cover. The screen judges remember.

#### Screen 2: Ask Anything (Investigation Workspace)

Split layout:

**Left panel (40%):**
- Chat-style question input
- Question history
- Suggested follow-up questions

**Right panel (60%):**
- The current answer (text + charts)
- Charts rendered from structured tool outputs (not LLM-generated)
- Each chart has a small "ⓘ" icon → reveals which tool produced it

**Bottom drawer (collapsible) — the Audit Drawer:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Question: "Why did DACH CAC spike in October?"                      │
│ Asked: 2026-05-12 14:23:01                                          │
│                                                                     │
│ Tier classifier: gemini-2.0-flash → Tier 2 (Analysis)               │
│ Compiler:        gemini-2.0-flash (no escalation needed)            │
│                                                                     │
│ Metric resolution:                                                  │
│   "CAC"  →  customer_acquisition_cost v2.1                          │
│             owner: marketing-ops · updated 2026-05-01 · view def ↗  │
│   "DACH" →  geo_segment v1.0 (Germany, Austria, Switzerland)        │
│             owner: rev-ops · updated 2026-02-12 · view def ↗        │
│                                                                     │
│ Execution plan: 6 tool calls (430ms total)                          │
│                                                                     │
│   └─ detect_anomaly_stl_residual v1.2.0  (89ms)                     │
│        params: {metric_def_id: 12, segment: 4, window: "30d"}       │
│        result: {anomaly: true, z_score: 2.8}                        │
│        metric definitions used: [customer_acquisition_cost v2.1]    │
│                                                                     │
│   └─ decompose_metric v1.0.0          (45ms)  [...]                 │
│   └─ compare_cohorts v1.1.0           (78ms)  [...]                 │
│   └─ causal_bayesian_impact v1.1.0    (97ms)  [...]                 │
│   └─ attribution_markov_chain v1.0.0  (62ms)  [...]                 │
│                                                                     │
│   └─ find_historical_analog v1.0.0    (59ms)                        │
│        params: {window: "30d", metric_def_ids: [12, 7, 9, 18, 22]}  │
│        result: {top_analog: "2024-10", similarity: 0.87}            │
│                                                                     │
│ Decompiler: gemini-2.0-flash                                        │
│ Final answer: [...]                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

Three things judges register from this panel within 5 seconds:
1. The system is two-stage and chose the cheap model deliberately
2. Every metric has a versioned, owned definition
3. The final tool grounds the diagnosis in a past period — not just statistics

**When Investigation Mode triggers:**
- Right panel transforms into a 3-pane investigation workspace
- Pane 1: Hypothesis brainstorm (cards)
- Pane 2: Proposed new tool (code editor view, syntax-highlighted)
- Pane 3: Validation results
- "Approve and add to registry" button

#### Screen 3: Channel Performance Constellation

Radial visualization:
- 5 channel nodes arranged in a circle
- Node size = pipe contribution
- Node color = performance vs target (red/yellow/green)
- Concentric rings = segments (Enterprise innermost → Freelancer outermost)
- Edges between channels = correlation in performance
- Click a node → drill to swimlane-level detail

Implementation: D3 force-directed layout via Visx, smooth transitions on filter changes.

#### Screen 4: Cohort Heatmap

- Rows: cohort time period
- Columns: weeks/months since acquisition
- Cells: conversion rate (or revenue, or retention)
- Color: heatmap scale
- Hover: tooltip with absolute numbers
- Click: drill to cohort detail

#### Screen 5: Hypothesis Lab

Card-based UI:
- Each card: hypothesis title, predicted lift, cost, time-to-signal, EV score
- Color-coded by template type
- Sortable, filterable
- Click → full experiment brief with sample size calc, success metrics
- "Run in simulator" button
- "Approve and queue" button

#### Screen 6: Tool Registry (the OS kernel view)

The unsung hero. Judges love this.

- Searchable list of all deterministic tools
- For each tool: name, version, category, classical method citation, input/output schema (collapsible), "times called this week" counter, "avg execution time" stat, "last validated" timestamp
- Filter: "Tools created during Investigation Mode" (shows the growing library)
- Stats banner: "247 tools registered · 89% deterministic core · 11% community-contributed"

This screen visualizes the philosophy. Include it in the deck.

#### Screen 7: Connector Studio

- Grid of available connectors (BigQuery, Confluence, HubSpot, Salesforce, Slack, LinkedIn extension, etc.)
- Each shows: connected/disconnected status, last sync, records ingested, errors
- "Add connector" button → modal with auth flow

#### Screen 8: Onboarding Flow

Stepper:
1. Company basics (TestPilot Inc. is preloaded)
2. ICP definition (5 segments preloaded with Enterprise/Strategic/Commercial/SMB/Freelancer)
3. Connect data sources (3-4 connectors)
4. Live Brain population (show entities/relations getting created in real-time)

Total: ~90 seconds in the demo.

#### Screen 9: Metric Studio (build if time permits, else skip to slide)

Read-mostly screen for the semantic metric layer:
- List view of all metric definitions
- Each row: display name, canonical name, version, owner, last updated
- Click to view: formula description, source mapping, version history
- "Edit" / "Deprecate" buttons (visible but not wired live)
- "Compare versions" diff view (visible in nav, not required functional)

**Build cost:** 2-3 hours on Day 6. If Pipeline Overview and Ask Anything aren't fully polished by then, skip this and show metric definitions as a static deck slide.

### 8.4 Dynamic elements (live data)

- **SSE streams** for pipeline counter updates
- **TanStack Query** with polling for dashboards (10s refresh)
- **Optimistic UI** for user actions
- **Skeleton loaders** during initial loads
- **Subtle pulse animations** when new data lands

For the demo, choreograph "events" on a timeline so liveness is guaranteed:
- T+0s: page loads, baseline state
- T+15s: fake anomaly fires, pulse marker appears on Sankey
- T+30s: hypothesis card appears in lab
- T+45s: simulator runs experiment, results update funnel

### 8.5 Component library

Build these on Day 5-6:

```
<MetricCard>     → Big number with delta indicator
<ToolBadge>      → Pill showing tool name + version
<ConfidenceBar>  → Visual confidence indicator (0-100%)
<ProvenanceTag>  → Click-through to see data sources
<MetricDefRef>   → Pill showing metric definition + version
<AnomalyPulse>   → Animated marker for active anomalies
<ExperimentCard> → Standard hypothesis card
<AuditDrawer>    → The expandable audit trail (see Screen 2)
<SegmentFilter>  → ICP segment multi-select
<TimeRangePicker> → Standard date range with presets
<TierBadge>      → Pill showing compiler tier (1/2/3) + model used
```

---

## 9. The Brain (Schema)

### 9.1 Core tables

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Entities (graph nodes)
CREATE TABLE entities (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    name TEXT NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}',
    source_refs JSONB,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entities_embedding ON entities
    USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_entities_type ON entities (entity_type);
CREATE INDEX idx_entities_properties ON entities USING GIN (properties);

-- Relationships (graph edges)
CREATE TABLE relationships (
    id BIGSERIAL PRIMARY KEY,
    source_id BIGINT NOT NULL REFERENCES entities(id),
    target_id BIGINT NOT NULL REFERENCES entities(id),
    relation_type TEXT NOT NULL,
    confidence FLOAT NOT NULL DEFAULT 1.0,
    evidence JSONB,
    description TEXT,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_relationships_source ON relationships (source_id);
CREATE INDEX idx_relationships_target ON relationships (target_id);
CREATE INDEX idx_relationships_type ON relationships (relation_type);

-- Document chunks (vector RAG fallback)
CREATE TABLE document_chunks (
    id BIGSERIAL PRIMARY KEY,
    source_type TEXT,
    source_id TEXT,
    chunk_text TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chunks_embedding ON document_chunks
    USING hnsw (embedding vector_cosine_ops);
```

### 9.2 Metric definitions (semantic contract layer)

```sql
CREATE TABLE metric_definitions (
    id BIGSERIAL PRIMARY KEY,
    canonical_name TEXT NOT NULL,        -- "customer_acquisition_cost"
    display_name TEXT NOT NULL,          -- "CAC"
    aliases TEXT[] DEFAULT '{}',         -- ['customer acquisition cost', ...]
    formula_description TEXT NOT NULL,
    source_table TEXT NOT NULL,
    source_field_mappings JSONB NOT NULL,
    owner TEXT NOT NULL,
    version TEXT NOT NULL,               -- semver e.g. "2.1.0"
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deprecated_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(canonical_name, version)
);

CREATE INDEX idx_metric_def_display_name ON metric_definitions (display_name);
CREATE INDEX idx_metric_def_aliases ON metric_definitions USING GIN (aliases);
CREATE INDEX idx_metric_def_active ON metric_definitions (canonical_name)
  WHERE deprecated_at IS NULL;
```

**Seed data for Day 1** (12-15 definitions):

```
- customer_acquisition_cost (CAC)
- lifetime_value (LTV)
- marketing_qualified_lead (MQL)
- sales_accepted_lead (SAL)
- opportunity (Opp)
- closed_won (CW)
- pipeline_value (Pipe)
- mql_to_sal_conversion_rate
- sal_to_opp_conversion_rate
- opp_to_cw_conversion_rate
- average_deal_size (ADS)
- pipeline_velocity
- audience_saturation_index
- channel_mix_index
- mql_volume_30d_rolling
```

### 9.3 Metric snapshots (for historical analog matching)

```sql
CREATE TABLE metric_snapshots (
    id BIGSERIAL PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    segment_id INT,                      -- NULL = whole company
    metric_def_ids INT[] NOT NULL,
    vector vector(64),                   -- z-normalized, fixed-dim
    metadata JSONB NOT NULL,             -- raw metric values, normalization stats
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshot_period ON metric_snapshots (period_start, period_end);
CREATE INDEX idx_snapshot_segment ON metric_snapshots (segment_id);
CREATE INDEX idx_snapshot_vector ON metric_snapshots
    USING hnsw (vector vector_cosine_ops);
```

**Population:** Background job runs daily, generates a 30-day rolling snapshot per segment. For synthetic 18-month dataset: 7-day stride × 5 segments = ~390 historical snapshots.

**Vector composition:** Concatenation of z-normalized values across a fixed metric set, padded/truncated to 64 dimensions. Exact metric set stored in `metric_def_ids` for unambiguous reconstruction.

### 9.4 Tool registry and execution log

```sql
CREATE TABLE tools (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    input_schema JSONB NOT NULL,
    output_schema JSONB NOT NULL,
    classical_basis TEXT,
    code_path TEXT,
    created_via TEXT,                    -- 'builtin' or 'investigation_mode'
    created_by TEXT,
    validated_at TIMESTAMPTZ,
    deprecated BOOLEAN DEFAULT FALSE,
    UNIQUE(name, version)
);

CREATE TABLE tool_executions (
    id BIGSERIAL PRIMARY KEY,
    tool_name TEXT NOT NULL,
    tool_version TEXT NOT NULL,
    inputs JSONB NOT NULL,
    output JSONB,                        -- includes metric_definitions_used
    execution_time_ms INT,
    triggered_by_query_id BIGINT,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    error TEXT
);
```

### 9.5 Queries (with two-stage routing metadata)

```sql
CREATE TABLE queries (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT,
    question TEXT NOT NULL,
    compiler_tier SMALLINT,              -- 1, 2, or 3
    compiler_model_used TEXT,            -- e.g. 'gemini-2.0-flash'
    metric_resolutions JSONB,            -- resolved metric defs + versions
    compiled_plan JSONB,
    final_answer TEXT,
    confidence FLOAT,
    investigation_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 9.6 Experiments

```sql
CREATE TABLE experiments (
    id BIGSERIAL PRIMARY KEY,
    hypothesis TEXT NOT NULL,
    design JSONB NOT NULL,
    predicted_lift JSONB,
    actual_outcome JSONB,
    status TEXT,                         -- 'proposed', 'running', 'concluded'
    learnings TEXT,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 10. Enterprise Integrations

Build these as plug-and-play connectors. **In the demo, show adding a new connector takes minutes.**

### Tier 1 (must build, functional)

| Integration | Auth | Data pulled | Output entities |
|-------------|------|-------------|-----------------|
| BigQuery | Service account JSON | GA4 events, custom marketing tables | Campaign metrics, Funnel events |
| Confluence | API token | Marketing wiki, ICP docs, brand guidelines | Knowledge entities, Persona, Brand_Voice |
| HubSpot (CRM) | OAuth or API key | Contacts, deals, lifecycle stages | Lead, Opp, Funnel_Stage |
| Google Sheets | OAuth | Manual data (escape hatch) | Configurable |

### Tier 2 (mocked with realistic data)

Salesforce, Slack, LinkedIn Ads, Google Ads, Meta Ads, Marketo, Segment.

### Connector contract

```python
class Connector(ABC):
    @abstractmethod
    async def authenticate(self, creds: dict) -> bool: ...

    @abstractmethod
    async def discover_schemas(self) -> List[SchemaDescriptor]: ...

    @abstractmethod
    async def sync(self, since: datetime) -> AsyncIterator[RawRecord]: ...

    @abstractmethod
    def get_extraction_hints(self) -> ExtractionHints: ...
```

**Pitch line:** *"Adding a new data source is ~50 lines of code. Any mid-sized startup can plug their stack in over an afternoon."*

---

## 11. Data Strategy

### 11.1 Fictional client: TestPilot Inc.

A fictional B2B SaaS developer testing platform. **No confidential data from any specific employer is used.** The funnel structure (Lead → MQL → SAL → Opp → CW), channel taxonomy, and segmentation tiers (Enterprise/Strategic/Commercial/SMB/Freelancer) are industry-standard B2B SaaS patterns documented across many public sources (HubSpot research, OpenView benchmarks, MarTech Today).

### 11.2 Public dataset foundation

- Google Merchandise Store on BigQuery (real GA4 events)
- Olist Brazilian E-commerce on Kaggle (orders, channels, reviews)
- HubSpot Research benchmarks (B2B SaaS conversion rates)
- OpenView SaaS Benchmarks 2024 (CAC/LTV priors)

### 11.3 Synthetic overlay

- 18 months of marketing history
- ~50,000 leads, 8,000 MQLs, 1,200 SQLs, 300 closed-won
- Ad spend: $2.4M across LinkedIn, Google, Meta, X
- 4 ICP segments × 2 geographies (US + DACH)
- 200 LinkedIn posts, 80 blog articles, 15 webinars

### 11.4 Planted ground truth (8 scenarios)

Each scenario has a known root cause. The system must discover it through tool execution.

1. **Week 18-23:** Creative fatigue on Meta, masked by Week 23 iOS 17 attribution change
2. **Q3:** ICP drift on Google Ads — broad match keywords pulled in SMB traffic
3. **DACH segment:** code-snippet creative converts 2.3× better, only for >50-employee companies
4. **September:** Competitor launch tanked organic SEO for top 3 keywords (8-week recovery)
5. **LinkedIn:** technical buyers respond to founder-led posts at 4× engagement; VPs respond to data-driven posts
6. **Email nurture:** 7-touch sequence underperforms 4-touch by 18% for mid-market
7. **Webinar attendees** convert 6× better than gated PDF downloaders, but only with 48h SDR follow-up
8. **Brand campaign in Q2** created delayed pipeline impact visible 6 weeks later

**Demo move:** Run the agent. Reveal the answer key. Show the audit trail proving the discovery was deterministic. Re-run the question. Same answer.

### 11.5 Data generation approach

Python with `faker` + `numpy.random` + careful seeding:
- Realistic time-series patterns (weekly seasonality, monthly trends, quarterly campaigns)
- Correlated noise (multiple metrics move together realistically)
- Inject planted scenarios at specific timestamps
- Match channel-specific CACs to industry benchmarks

Use the real LinkedIn extension to pull engagement patterns from public B2B SaaS pages, anonymize structure into the synthetic data. Real engagement curves.

---

## 12. Build Plan — Day by Day

### Day 1 (Sunday): Foundation + Metric Layer

**Morning:**
- Spin up Postgres + pgvector on Railway
- Set up FastAPI + Next.js scaffolds
- Define `Tool`, `ToolMetadata`, `ToolResult` contracts (with `metric_definitions_used` field)
- Define `metric_definitions` and `metric_snapshots` schemas
- Build the Metric Resolver service (deterministic lookup, alias matching, clarification raising)

**Afternoon:**
- Build first 3 proof tools: `detect_anomaly_zscore`, `funnel_conversion_rates`, `attribution_markov_chain`
- Seed 12-15 metric definitions
- Synthetic data generator skeleton
- Generate first 3 months of data
- Verify reproducibility AND verify resolution against `metric_definitions`

**EoD deliverable:** 3 working deterministic tools producing reproducible outputs, each with `metric_definitions_used` populated. Metric Resolver passes a 10-question test suite (8 resolved correctly, 2 raise expected ClarificationRequests).

### Day 2 (Monday): Tool Library Sprint + Snapshot Generation

**Goal:** Build 26 more tools (29 total). Plus snapshot infrastructure.

**Morning (build ~13 tools):**
- Time-series: `forecast_pipeline_quarterly`, `decompose_seasonality`, `forecast_with_uncertainty`
- Anomaly: `detect_anomaly_stl_residual`, `detect_changepoint`
- Causal: `causal_bayesian_impact`, `causal_did`
- Attribution: `attribution_shapley`
- Segmentation: `cluster_kmeans`, `rfm_analysis`, `cohort_analysis`, `icp_drift_detection`

**Afternoon (build ~13 tools + snapshot infra):**
- Scoring: `score_lead_xgboost`, `predict_churn_cox`, `feature_importance_shap`
- Experiment: `ab_test_bayesian`, `multi_armed_bandit_thompson`, `sample_size_calculator`
- Content: `topic_model_lda`, `extract_keywords_tfidf`, `sentence_similarity_sbert`
- Statistical: `compare_distributions_ks`, `compare_means_welch`, `bootstrap_confidence_interval`
- Funnel: `funnel_drop_off_analysis`, `pipe_decomposition`
- Build `find_historical_analog` tool with cosine similarity over pgvector
- Build snapshot generation script (rolling 30-day windows, 7-day stride, per segment)
- Generate ~390 historical snapshots from synthetic 18 months

**EoD deliverable:** 29 tools registered, each with a deterministic test case. Snapshot table populated. `find_historical_analog` returns sensible top-3 matches when given the planted-anomaly periods.

### Day 3 (Tuesday): Two-Stage Compiler + 6 Playbooks

**Morning:**
- Build the Tier Classifier (Gemini Flash, structured output)
- Build the escalation router (Flash → Pro for Tier 3)
- Wire the Metric Resolver into the compiler flow
- Build the plan compiler with two model variants
- Define playbook YAML format

**Afternoon:**
- Write 6 playbooks: `metric_anomaly_diagnosis` (6 steps incl. `find_historical_analog`), `channel_comparison`, `funnel_diagnosis`, `segment_deep_dive`, `attribution_analysis`, `experiment_design`
- Build the orchestrator (executes tool chains in parallel where possible)
- Build the decompiler (Flash, structured input)
- End-to-end test: 10 questions → 10 audit trails with tier classification, metric resolution, tool execution, final answer

**EoD deliverable:** Full compile → execute → decompile loop with two-stage routing. 8/10 test questions answered correctly. Audit trail shows tier, model used, metric resolutions, tool calls.

### Day 4 (Wednesday): Investigation Mode + Hypothesis Engine

**Morning:**
- Build Investigation Mode workflow
- Implement new-tool synthesis via SOTA model (Claude Opus 4.7 or Gemini 2.5 Pro)
- Static analysis pipeline (ruff, mypy)
- Schema validation against database
- Approval UI workflow

**Afternoon:**
- Build the Gap Detector (continuous scan)
- Build the Hypothesis Template Library (10 templates)
- Build the scoring function and ranking
- Build the simulator (planted-truth experiments)

**EoD deliverable:** Hypothesis Engine produces 3 ranked hypotheses for a given goal. Investigation Mode handles one "novel" question end-to-end.

### Day 5 (Thursday): Connectors + Frontend Foundation

**Morning:**
- Build BigQuery, Confluence, HubSpot connectors (real)
- Build connector mocks for Salesforce, Slack, LinkedIn Ads, Google Ads
- Integrate the pre-built LinkedIn Chrome extension via webhook

**Afternoon:**
- Frontend scaffolding (Next.js + Tailwind + shadcn/ui)
- Build core design-system components (MetricCard, ToolBadge, ConfidenceBar, MetricDefRef, TierBadge, AuditDrawer, etc.)
- Build Pipeline Overview screen (Sankey with live counters)

**EoD deliverable:** 4 connectors live, 4 mocked. Pipeline Overview screen renders live data with animated Sankey.

### Day 6 (Friday): Frontend Polish + Demo Choreography

**Morning:**
- Build Ask Anything screen (investigation workspace + audit drawer)
- Build Tool Registry screen
- Build Hypothesis Lab
- If time: Channel Constellation, Cohort Heatmap, Connector Studio
- If time AND priorities allow: Metric Studio (else skip to static slide)

**Afternoon:**
- Wire up SSE streams for live data
- Choreograph demo timeline (anomaly fires at T+15s, hypothesis appears at T+30s, etc.)
- Add micro-interactions (loading states, pulse animations, toast notifications)

**EoD deliverable:** Full UI works. Complete demo flow runs in 6 minutes without crashing.

### Day 7 (Saturday): Deck + Dry Runs

**Morning:**
- Write the consulting deck (15-20 slides, see Section 14)
- MBB teammate owns deck structure

**Afternoon:**
- 3 full dry runs with timer
- Stress test: friend asks unscripted questions
- Investigation Mode dry run

**Evening:**
- Final polish
- Backup demo recording (in case live demo fails)

---

## 13. Decision Tree — Cuts If Time Runs Short

If behind, cut from the bottom up:

| Priority | Component | Cut criterion |
|----------|-----------|---------------|
| 1 (must have) | Tool registry with 20+ tools | Never cut |
| 2 (must have) | Compiler + decompiler loop | Never cut |
| 3 (must have) | Two-stage compiler routing (Tier Classifier + escalation) | Never cut — visible in UI, sells the architecture |
| 4 (must have) | Metric Resolver + `metric_definitions` table seeded | Never cut — audit trail story collapses without this |
| 5 (must have) | Pipeline Overview screen | Never cut — hero visual |
| 6 (must have) | 6 playbooks | Never cut |
| 7 (must have) | Audit trail UI with tier, metric resolution, tool calls | Never cut — THIS is the demo |
| 8 (must have) | `find_historical_analog` + `metric_snapshots` populated | Never cut — key differentiator |
| 9 | Investigation Mode | Cut to pre-recorded walkthrough if behind |
| 10 | Hypothesis Engine simulator | Cut to pre-computed results if behind |
| 11 | BigQuery/Confluence connectors (real) | Cut to mocks if behind |
| 12 | LinkedIn extension integration | Show extension separately if integration is fragile |
| 13 | Channel Constellation viz | Cut to standard bar chart |
| 14 (nice to have) | Metric Studio screen | Cut to static deck slide |
| 15 (nice to have) | Cohort Heatmap | Cut |
| 16 (nice to have) | Tool Registry public view | Show only in deck |
| 17 (nice to have) | Onboarding flow | Hardcode TestPilot |

**Rule:** A working compiler with 20 tools, 6 playbooks, two-stage routing, metric layer, and historical analog beats a fancy UI with everything half-built. Defend the must-haves with your life.

**Scope discipline:** If a new feature is proposed during the build, refuse it unless it's a corresponding cut from this table.

---

## 14. The Consulting Deck

15-20 slides, consulting deck aesthetic (clean, single-thought-per-slide, action title format).

### Slide-by-slide

1. **Title:** "Thinking Machines: The Marketing Intelligence Platform for Lean Teams"
2. **Hook:** "Anthropic ran growth marketing with 1 person for 10 months. We built the system that lets every marketer do that."
3. **The problem:** Marketing has 15 disconnected AI tools, none of which give the same answer twice
4. **The contrarian insight:** Reproducibility is the missing feature. Enterprise marketing can't trust AI that's non-deterministic.
5. **Our approach:** Grace Hopper, applied to AI. LLMs are compilers. Statistics does the work.
6. **One diagram:** The five-layer architecture (Tier Classifier → Metric Resolver → Compiler → Tools → Decompiler)
7. **The semantic metric layer:** Every metric has a versioned, owned definition. CAC means the same thing today as it did last quarter.
8. **The tool registry:** 29 deterministic tools, mostly classical ML. Tool count visible.
9. **The audit trail:** Every answer traces to exact tool calls + metric definitions + tier classification (screenshot of Audit Drawer)
10. **Historical analog matching:** "This looks most like October 2024" — the answer marketers actually want
11. **Investigation Mode:** What happens when something truly novel arrives. System learns its own kernel.
12. **Live demo intro:** "Watch a marketer at TestPilot diagnose a pipeline drop in 90 seconds"
13. **[LIVE DEMO]**
14. **The answer-key reveal:** What we planted vs. what the system discovered. Re-run → same answer.
15. **Why Track 4:** 5 of 5 focus areas hit, with validation as a first-class concern
16. **The ecosystem play:** Community-contributed tools grow the kernel
17. **Enterprise readiness:** Connectors, audit trails, reproducibility, governed metrics — actually deployable
18. **The business case:** 1-person marketing team operating like 10. ROI math.
19. **Team:** Why this team (data eng + EE + NLP + MBB + marketer at B2B SaaS dev tool company)
20. **Thank you / Q&A**

### Deck design principles

- Action titles only ("Modules share a single intelligence layer" not "Architecture")
- Single thought per slide
- Visual > text (use diagrams from this architecture)
- Consulting aesthetic: McKinsey/BCG slide style — clean, hierarchical, plenty of whitespace
- 2 colors max + grayscale
- Speaker notes carry detail; slides carry signal

### MBB teammate's role

- Owns deck structure and narrative arc
- Writes the business case slide (TAM, ROI math, sales motion)
- Designs the playbook library (consultant frameworks → tool chains)
- Runs live demo as "marketer persona" while you handle technical Q&A

---

## 15. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tool quality varies, some return junk | Medium | High | Every tool has test cases on day of build |
| Compiler picks wrong tools | Medium | High | Playbook library constrains choices; eval harness on Day 3 |
| Metric Resolver mis-resolves common metrics | Low | High | Test suite of 30+ phrasings per metric on Day 1 |
| LLM rate limits during demo | Low | Medium | Far less LLM-dependent than typical AI agent; Flash for most calls |
| Investigation Mode tool synthesis fails live | Medium | Medium | Pre-validated demo case; fallback to pre-recorded |
| Synthetic data feels fake | Low | Medium | Anchor to public benchmarks; cite in deck |
| Live demo crashes | Medium | High | Pre-recorded backup; rehearse recovery line |
| Judges question "is this just LLM with extra steps" | Low | Medium | Audit Drawer rebuts this in 10 seconds |
| Frontend doesn't look polished enough | Medium | High | Day 5-6 dedicated; reference Linear/Vercel aesthetic |
| Connector OAuth fails live | Medium | Low | Use sandbox/mock for demo path |
| Pipeline Sankey laggy with live updates | Low | Medium | Throttle SSE updates; pre-warm demo |
| Scope creep mid-build | High | High | Section 13 is the source of truth; no exceptions |

---

## 16. Simplicity Heuristics

For this build doc and code: detail is fine, even welcome.

For the system's *output* and the *deck*: ruthless simplicity.

Apply at every output decision:
1. **Grandmother Test:** Can a non-technical person understand this output in 30 seconds?
2. **So-What Test:** After every technical detail in the answer, ask "so what does this mean for the marketer?"
3. **Diagram Test:** If a slide has >30 words, replace with a diagram.
4. **Demo Test:** Every feature must earn 15 seconds of demo time.
5. **Memorability Test:** What's the ONE thing a judge will remember 6 hours later?

**For Thinking Machines, the memorable thing is:** *"LLMs as compilers, statistics as the workhorse. Same question, same answer, always."*

Everything serves that line.

---

## 17. Glossary

- **Compiler (LLM):** The LLM acting as a translator — parses natural language, picks tools, generates execution plans. Does NOT do analytical reasoning.
- **Decompiler (LLM):** The LLM translating structured tool outputs back to natural language. Does NOT add information not in the result.
- **Tier Classifier:** The first-stage LLM call (always Gemini Flash) that routes incoming queries into Tier 1, 2, or 3. Does not execute analysis or compile plans. Its only job is routing.
- **Compiler Tier (1 / 2 / 3):** Complexity classification from the Tier Classifier. Tier 1 = single tool lookup. Tier 2 = 2-5 tool playbook chain. Tier 3 = novel or Investigation Mode candidate. Tier determines whether the plan compiler runs on Flash or Pro.
- **Metric Definition / Semantic Contract:** A versioned, owned, human-approved definition of a quantitative concept (e.g., "CAC"). Includes canonical name, formula, source field mappings, owner, and effective dates. Stored in `metric_definitions`. The LLM NEVER infers metric meaning; it resolves against this table or raises a ClarificationRequest.
- **Metric Resolver:** Deterministic service that maps metric names in a question (e.g., "CAC") to versioned metric definition IDs. Raises a ClarificationRequest if the metric is undefined or ambiguous.
- **Metric Snapshot:** A rolling time-window vector of normalized metric values, used by `find_historical_analog` for cosine similarity matching. Generated daily via background job. Stored in `metric_snapshots`.
- **Historical Analog:** A past time period whose metric vector is structurally similar (high cosine similarity) to the current period. Used to ground anomaly diagnoses in lived precedent.
- **Tool:** A deterministic, versioned, schema-validated Python function. Mostly wrappers around classical ML/statistics libraries.
- **Tool Registry:** The catalog of all tools available to the compiler.
- **Playbook:** A predefined mapping from question patterns to tool chains.
- **Investigation Mode:** The workflow for novel questions that don't match any playbook. Lets a SOTA model write a new tool with human approval.
- **Brain:** The knowledge base (entities, relationships, chunks) the compiler reads to understand context. Read-only for the compiler.
- **Audit Trail:** The full execution log of a query — tier classification, metric resolution, tool calls with params, tool outputs, in order.
- **Gap Detector:** Continuous background scan that finds anomalies and drives the Hypothesis Engine.
- **ClarificationRequest:** What the Metric Resolver raises when a metric reference can't be uniquely resolved. The system asks the user rather than guessing.

---

## 18. Final Notes for the Implementation Agent

**Read this entire document before writing code.** The architecture is non-trivial and the philosophy matters at every decision point.

**The compiler is the smallest component, not the largest.** Most build time goes into the tool library, the metric layer, and the frontend.

**Every tool needs a test case.** No exceptions. Add it the moment you write the tool.

**Every metric reference goes through the Metric Resolver.** No exceptions. If you find yourself bypassing it for convenience, stop — that bypass is exactly what we're refusing to do.

**Default to simplicity in the output, detail in the audit trail.** The user sees simple. The judge who clicks "show me how" sees rigor.

**The Pipeline Overview screen is the hero. The Audit Drawer is the moat.** Polish both disproportionately.

**The brand is restraint.** Dark mode, sophisticated cyan, no glow effects, no AI clichés. Linear/Vercel/Stripe aesthetic.

**Investigation Mode is the long-tail solution.** Don't over-invest in it — show it works once, beautifully.

**The five NEVERs are non-negotiable.** If you find yourself violating one to ship faster, you are weakening the only argument that makes this submission win.

**One idea, expressed three ways.** The deck has one headline (compilers + statistics), one proof (audit trail), one defensibility argument (reproducibility). If any new idea doesn't deepen one of those three lines, it doesn't ship.

---

*The philosophy: Grace Hopper invented compilers so humans wouldn't have to think in machine code. We use LLMs as compilers so marketers don't have to think in statistics. The work is done by 30 years of validated methods, not by hopeful AI reasoning. Same question. Same answer. Always.*

**End of build handoff. Now go build it.**