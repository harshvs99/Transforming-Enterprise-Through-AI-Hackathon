import datetime
from sqlalchemy.orm import Session
from .database import SessionLocal, engine
from . import models

def seed_metrics():
    db = SessionLocal()
    metrics = [
        {
            "canonical_name": "customer_acquisition_cost",
            "display_name": "CAC",
            "aliases": ["customer acquisition cost", "acquisition cost"],
            "formula_description": "Total sales and marketing expenses / Number of new customers acquired",
            "source_table": "marketing_spend",
            "source_field_mappings": {"spend": "amount", "new_customers": "customer_count"},
            "owner": "marketing-ops",
            "version": "2.1.0"
        },
        {
            "canonical_name": "lifetime_value",
            "display_name": "LTV",
            "aliases": ["lifetime value", "customer lifetime value"],
            "formula_description": "Average revenue per user * Gross margin % * (1 / Monthly churn rate)",
            "source_table": "revenue_data",
            "source_field_mappings": {"arpu": "arpu", "churn": "churn_rate"},
            "owner": "rev-ops",
            "version": "1.0.0"
        },
        {
            "canonical_name": "marketing_qualified_lead",
            "display_name": "MQL",
            "aliases": ["marketing qualified lead", "mql count"],
            "formula_description": "Leads that meet specific marketing criteria and are ready for sales",
            "source_table": "leads",
            "source_field_mappings": {"id": "id", "status": "mql"},
            "owner": "marketing-ops",
            "version": "1.2.0"
        },
        {
            "canonical_name": "sales_accepted_lead",
            "display_name": "SAL",
            "aliases": ["sales accepted lead", "sal count"],
            "formula_description": "MQLs that have been reviewed and accepted by the sales team",
            "source_table": "leads",
            "source_field_mappings": {"id": "id", "status": "sal"},
            "owner": "sales-ops",
            "version": "1.1.0"
        },
        {
            "canonical_name": "opportunity",
            "display_name": "Opp",
            "aliases": ["opportunity", "opp count", "pipeline opportunities"],
            "formula_description": "Qualified leads that have moved into the sales pipeline as a potential deal",
            "source_table": "deals",
            "source_field_mappings": {"id": "id", "stage": "opportunity"},
            "owner": "sales-ops",
            "version": "1.0.0"
        },
        {
            "canonical_name": "closed_won",
            "display_name": "CW",
            "aliases": ["closed won", "won deals", "revenue events"],
            "formula_description": "Deals that have been successfully closed and signed",
            "source_table": "deals",
            "source_field_mappings": {"id": "id", "stage": "closed_won"},
            "owner": "sales-ops",
            "version": "1.0.0"
        },
        {
            "canonical_name": "pipeline_value",
            "display_name": "Pipe",
            "aliases": ["pipeline value", "total pipe", "forecasted revenue"],
            "formula_description": "Total estimated value of all active opportunities in the pipeline",
            "source_table": "deals",
            "source_field_mappings": {"amount": "deal_value"},
            "owner": "rev-ops",
            "version": "2.0.0"
        }
    ]

    for m in metrics:
        existing = db.query(models.MetricDefinition).filter_by(canonical_name=m["canonical_name"]).first()
        if not existing:
            metric_def = models.MetricDefinition(**m)
            db.add(metric_def)

    db.commit()
    db.close()

if __name__ == "__main__":
    seed_metrics()
    print("Metrics seeded successfully.")
