# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Thinking Machines" — a hackathon prototype for an enterprise analytics assistant. A FastAPI backend compiles a natural-language business question into a deterministic chain of statistical tools and synthesizes an answer; a Next.js frontend provides the Ask / Pipeline / Registry UI. Demo scenario: "Why did our CAC spike in October?" (an anomaly is intentionally planted in the synthetic data).

## Commands

All Python commands must be run **from the repository root** (not `backend/`). The package root is `backend.app`; tests and scripts use absolute imports like `from backend.app...`, and `main.py` uses package-relative imports. The SQLite path is `sqlite:///./thinking_machines.db`, resolved relative to the current working directory, so running from root uses the root `thinking_machines.db` (a stale copy also exists at `backend/thinking_machines.db`).

```bash
# Backend setup + run
pip install -r requirements.txt
python -m backend.app.seed_metrics      # populate metric_definitions
python -m backend.app.generate_data     # generate synthetic entities + snapshots
uvicorn backend.app.main:app --reload --port 8000   # tables auto-create on startup

# Backend tests
python -m unittest backend.app.test_tools   # the only assertion-based test (unittest)
python -m backend.app.test_resolver         # standalone script, prints output (no asserts)
python -m backend.app.test_compiler         # standalone script, prints the full pipeline

# Frontend (from frontend/)
npm install
npm run dev      # localhost:3000, expects backend on localhost:8000
npm run build    # static export to frontend/out
npm run lint
```

The frontend hardcodes `http://localhost:8000` for the API (in `src/app/page.tsx`). There is **no CORS middleware** in `main.py` — browser `OPTIONS` preflight to `/query` returns 405 (see `server_api.log`). Adding `CORSMiddleware` is required for the live UI to call the backend cross-origin.

## Architecture

### Query pipeline (`backend/app/main.py` `POST /query`)

The request flows through a fixed pipeline, instantiated fresh per request:

1. **`TierClassifier`** (`compiler/tier_classifier.py`) — keyword heuristic routes the question to Tier 1 (direct lookup), Tier 2 (analysis, selects a `playbook_id`), or Tier 3 (novel/strategic).
2. **`MetricResolver`** (`services/metric_resolver.py`) — naive substring match of the question against `MetricDefinition.display_name`/`aliases` in the DB; returns canonical name, version, owner.
3. **Branch:** Tier 3 → **`InvestigationMode`** (`compiler/investigation.py`) returns canned hypotheses (some flagged `requires_new_tool`) and short-circuits. Tier 1/2 → continue.
4. **`PlanCompiler`** (`compiler/compiler.py`) — maps `playbook_id` to a deterministic list of `ToolCall` steps (`ExecutionPlan`).
5. **Execution** — each step's tool is looked up in the global `registry` and `.run(params)` is called.
6. **`Decompiler`** (`compiler/compiler.py`) — synthesizes a natural-language answer **only from tool outputs**.

**Design contract (intentional, preserve it):** the compiler only *chains* tools and never does analytical reasoning; the decompiler never adds information not present in tool results; tools are deterministic. This "deterministic kernel" is the core thesis — the UI footer and audit trail advertise it.

### Prototype caveats — do not assume real data flow

This is a demo. Several stages are mocked and **not** wired to real data even though plumbing exists:
- `PlanCompiler` passes **hardcoded literal arrays** as tool params; it does not query `Entity`/`MetricSnapshot`.
- `InvestigationMode` `sleep(1)` then returns fixed hypotheses; `TierClassifier` is pure keyword matching.
- `google-generativeai` / `python-dotenv` are in `requirements.txt`. The `Decompiler` and `InvestigationMode` **do call Gemini** via `backend/app/services/llm.py` when `GEMINI_API_KEY` is set (loaded from `.env` locally, or from Cloud Run environment variables in production). When the key is absent the backend falls back to the deterministic heuristic transparently. Check `GET /health` → `llm_enabled` to confirm.
- `/query` does not persist a `Query` row despite the `Query` model and `triggered_by_query_id` fields existing.

When extending, prefer wiring these to real DB data over adding new mocks, unless asked otherwise.

### Tool system (`backend/app/tools/`)

A `Tool` is a `Protocol` (`tools/base.py`): a `metadata: ToolMetadata` attribute plus `run(inputs: dict) -> ToolResult`. `ToolResult` carries inputs, output, timing, provenance, and `metric_definitions_used` for the audit trail. The global `registry` registers each tool under both `name` and `name@version`; `get_tool(name)` returns the unversioned latest.

**To add a tool:** create a class implementing the Protocol in a new module under `tools/`, then instantiate-and-`registry.register(...)` it in `tools/__init__.py` (registration is import-time, manual). To make it reachable, add a `ToolCall` for it in the relevant `PlanCompiler` playbook branch.

### Data model (`backend/app/models.py`, SQLAlchemy → SQLite)

`MetricDefinition` (canonical metric registry with aliases/versioning/ownership — the resolver's source of truth), `Entity` (daily synthetic metric rows), `MetricSnapshot` (monthly rollups, the October CAC spike is planted here and in entities by `generate_data.py`), plus `Tool`, `ToolExecution`, `Query` (defined but currently unused by the pipeline). `Base.metadata.create_all` runs on app startup; there are no migrations.

### Frontend (`frontend/`)

Next.js 14.2.3 App Router, `output: 'export'` (fully static, no SSR/API routes). One page (`src/app/page.tsx`) with three tabs: Ask (query → answer + `AuditDrawer` or investigation hypotheses), Pipeline (`PipelineSankey`), Registry (`ToolRegistry`, fed by `GET /tools`). API response shapes are in `src/components/api.ts`. Path alias `@/*` → `src/*`. `frontend/CLAUDE.md` just points to `frontend/AGENTS.md`.

### Deployment

`.github/workflows/deploy.yml` builds the **frontend only** as a static site and publishes `frontend/out` to GitHub Pages on push to `main`. The backend is not deployed by CI — the static site assumes a backend reachable at `localhost:8000`.

**Cloud Run deployments** happen exclusively through the GitHub repository — do not attempt direct `gcloud run deploy` commands. Push changes to `main`, and CI/CD will handle the Cloud Run build and deployment.
