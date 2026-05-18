import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from backend.app.database import SessionLocal
from backend.app import models

def generate_data():
    db = SessionLocal()

    # 18 months of history
    start_date = datetime(2024, 1, 1)
    end_date = start_date + timedelta(days=18*30)
    date_range = pd.date_range(start=start_date, end=end_date, freq='D')

    # Standard metrics
    metrics = {
        "mql": np.random.poisson(lam=20, size=len(date_range)),
        "sal": np.random.poisson(lam=10, size=len(date_range)),
        "opp": np.random.poisson(lam=5, size=len(date_range)),
        "cw": np.random.poisson(lam=1, size=len(date_range)),
        "cac": np.random.normal(loc=500, scale=50, size=len(date_range))
    }

    # Plant Anomaly: October 2024 CAC spike
    oct_2024_mask = (date_range.month == 10) & (date_range.year == 2024)
    metrics["cac"][oct_2024_mask] *= 1.5

    # Save to entities (simplified for demo)
    for i, date in enumerate(date_range):
        entity = models.Entity(
            entity_type="daily_metrics",
            name=f"metrics_{date.strftime('%Y-%m-%d')}",
            properties={
                "date": date.strftime('%Y-%m-%d'),
                "mql": int(metrics["mql"][i]),
                "sal": int(metrics["sal"][i]),
                "opp": int(metrics["opp"][i]),
                "cw": int(metrics["cw"][i]),
                "cac": float(metrics["cac"][i])
            }
        )
        db.add(entity)

    # Generate metric_snapshots (monthly rolling)
    for year in [2024, 2025]:
        for month in range(1, 13):
            month_mask = (date_range.month == month) & (date_range.year == year)
            if month_mask.any():
                avg_cac = metrics["cac"][month_mask].mean()
                avg_mql = metrics["mql"][month_mask].mean()

                snapshot = models.MetricSnapshot(
                    period_start=datetime(year, month, 1).date(),
                    period_end=(datetime(year, month, 1) + timedelta(days=30)).date(),
                    metric_def_ids=[1, 3], # CAC and MQL
                    snapshot_vector=[float(avg_cac), float(avg_mql)],
                    metadata_json={"avg_cac": avg_cac, "avg_mql": avg_mql}
                )
                db.add(snapshot)

    db.commit()
    db.close()

if __name__ == "__main__":
    generate_data()
    print("Synthetic data generated.")
