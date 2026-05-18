import unittest
from backend.app.tools.anomaly import DetectAnomalyZScore
from backend.app.tools.analysis import FindHistoricalAnalog

class TestTools(unittest.TestCase):
    def test_zscore(self):
        tool = DetectAnomalyZScore()
        data = [10, 12, 11, 13, 100, 11, 12]
        result = tool.run({"data": data, "threshold": 2.0})
        self.assertTrue(result.output["anomalies"][4])
        self.assertFalse(result.output["anomalies"][0])

    def test_historical_analog(self):
        tool = FindHistoricalAnalog()
        current = [1, 0, 0]
        historical = [
            [0.9, 0.1, 0],
            [0, 1, 0],
            [0, 0, 1]
        ]
        periods = ["Oct 2024", "Nov 2024", "Dec 2024"]
        result = tool.run({
            "current_vector": current,
            "historical_vectors": historical,
            "historical_periods": periods
        })
        self.assertEqual(result.output["top_analog_period"], "Oct 2024")
        self.assertGreater(result.output["similarity_score"], 0.8)

if __name__ == "__main__":
    unittest.main()
