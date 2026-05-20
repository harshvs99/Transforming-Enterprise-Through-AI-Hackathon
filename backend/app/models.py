from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text, Boolean, ForeignKey, Table, Date
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class Entity(Base):
    __tablename__ = "entities"
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String)
    name = Column(String)
    properties = Column(JSON, default={})
    source_refs = Column(JSON)
    # embedding = Column(JSON) # Mocking vector with JSON for SQLite
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class MetricDefinition(Base):
    __tablename__ = "metric_definitions"
    id = Column(Integer, primary_key=True, index=True)
    canonical_name = Column(String, unique=True, index=True)
    display_name = Column(String, index=True)
    aliases = Column(JSON, default=[])
    formula_description = Column(Text)
    source_table = Column(String)
    source_field_mappings = Column(JSON)
    owner = Column(String)
    version = Column(String)
    effective_from = Column(DateTime, default=datetime.datetime.utcnow)
    deprecated_at = Column(DateTime, nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class MetricSnapshot(Base):
    __tablename__ = "metric_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    period_start = Column(Date)
    period_end = Column(Date)
    segment_id = Column(Integer, nullable=True)
    metric_def_ids = Column(JSON) # List of IDs
    snapshot_vector = Column(JSON) # List of floats
    metadata_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Tool(Base):
    __tablename__ = "tools"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    version = Column(String)
    category = Column(String)
    description = Column(Text)
    input_schema = Column(JSON)
    output_schema = Column(JSON)
    classical_basis = Column(String)
    code_path = Column(String)
    created_via = Column(String) # 'builtin' or 'investigation_mode'
    created_by = Column(String)
    validated_at = Column(DateTime)
    deprecated = Column(Boolean, default=False)

class ToolExecution(Base):
    __tablename__ = "tool_executions"
    id = Column(Integer, primary_key=True, index=True)
    tool_name = Column(String)
    tool_version = Column(String)
    inputs = Column(JSON)
    output = Column(JSON)
    execution_time_ms = Column(Integer)
    triggered_by_query_id = Column(Integer)
    triggered_at = Column(DateTime, default=datetime.datetime.utcnow)
    error = Column(Text)

class ConnectorState(Base):
    __tablename__ = "connector_states"
    id           = Column(String, primary_key=True)  # connector_id
    configured   = Column(Boolean, default=False)
    status       = Column(String, default="disconnected")
    last_sync    = Column(DateTime, nullable=True)
    record_count = Column(Integer, default=0)
    updated_at   = Column(DateTime, default=datetime.datetime.utcnow)

class Query(Base):
    __tablename__ = "queries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String)
    question = Column(Text)
    compiler_tier = Column(Integer)
    compiler_model_used = Column(String)
    metric_resolutions = Column(JSON)
    compiled_plan = Column(JSON)
    final_answer = Column(Text)
    confidence = Column(Float)
    investigation_mode = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
