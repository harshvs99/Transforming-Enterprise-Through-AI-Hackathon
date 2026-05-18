import asyncio
from backend.app.database import SessionLocal
from backend.app.services.metric_resolver import MetricResolver

async def test_resolver():
    db = SessionLocal()
    resolver = MetricResolver(db)

    test_queries = [
        "What was our CAC last month?",
        "Show me LTV vs CAC",
        "How many MQLs did we get?",
        "What's the pipeline value for Q4?"
    ]

    for q in test_queries:
        print(f"\nQuery: {q}")
        resolved = await resolver.resolve_all(q)
        for res in resolved.resolutions:
            print(f"  Found: {res.text} -> {res.canonical_name} (v{res.version})")

    db.close()

if __name__ == "__main__":
    asyncio.run(test_resolver())
