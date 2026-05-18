from .base import registry
from .anomaly import DetectAnomalyZScore
from .analysis import FindHistoricalAnalog
from .timeseries import DecomposeSeasonality
from .statistical import CompareDistributionsKS
from .segmentation import RFMAnalysis
from .attribution import AttributionMarkovChain
from .causal import CausalBayesianImpact
from .forecasting import ForecastPipelineQuarterly

registry.register(DetectAnomalyZScore())
registry.register(FindHistoricalAnalog())
registry.register(DecomposeSeasonality())
registry.register(CompareDistributionsKS())
registry.register(RFMAnalysis())
registry.register(AttributionMarkovChain())
registry.register(CausalBayesianImpact())
registry.register(ForecastPipelineQuarterly())
