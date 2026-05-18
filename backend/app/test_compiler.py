import asyncio
from backend.app.database import SessionLocal
from backend.app.services.metric_resolver import MetricResolver
from backend.app.compiler.tier_classifier import TierClassifier
from backend.app.compiler.compiler import PlanCompiler, Decompiler
from backend.app.tools import registry

async def test_full_loop():
    db = SessionLocal()
    resolver = MetricResolver(db)
    classifier = TierClassifier()
    compiler = PlanCompiler()
    decompiler = Decompiler()

    question = "Why did our CAC spike in October?"
    print(f"Question: {question}")

    # 1. Tier Classification
    tier_result = await classifier.classify(question)
    print(f"Tier: {tier_result.tier} (Playbook: {tier_result.suggested_playbook_id})")

    # 2. Metric Resolution
    resolved_metrics = await resolver.resolve_all(question)
    print(f"Metrics: {[m.canonical_name for m in resolved_metrics.resolutions]}")

    # 3. Plan Compilation
    plan = await compiler.compile(question, resolved_metrics, tier_result.suggested_playbook_id)
    print(f"Plan steps: {[s.tool for s in plan.steps]}")

    # 4. Execution
    results = []
    for step in plan.steps:
        tool = registry.get_tool(step.tool)
        if tool:
            res = tool.run(step.params)
            results.append(res)
            print(f"Executed {step.tool}: {res.output}")

    # 5. Decompilation
    answer = await decompiler.decompile(question, results)
    print(f"Final Answer: {answer}")

    db.close()

if __name__ == "__main__":
    asyncio.run(test_full_loop())
