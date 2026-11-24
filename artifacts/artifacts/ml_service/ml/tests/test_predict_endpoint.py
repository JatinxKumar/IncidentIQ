"""
ml/tests/test_predict_endpoint.py — Tests for ML Prediction Endpoints
======================================================================

Tests for:
- POST /api/v1/predict - successful prediction
- POST /api/v1/predict - invalid input validation
- POST /api/v1/predict - missing model artifact
- GET /api/v1/models/info - model information
- Model loading and preprocessing consistency
"""

import os
import sys
import json
import tempfile
import unittest
from unittest.mock import patch, MagicMock

# Add the ml_service directory to path
ml_service_path = os.path.join(os.path.dirname(__file__), '..', '..')
sys.path.insert(0, ml_service_path)

# Set DEBUG to False to avoid pydantic validation error
import os
os.environ['DEBUG'] = 'False'

import pandas as pd
import numpy as np
import joblib
from fastapi.testclient import TestClient

# Import the app
from main import create_application


class TestPredictEndpoint(unittest.TestCase):
    """Test cases for the prediction endpoint."""
    
    @classmethod
    def setUpClass(cls):
        """Set up test client and model path."""
        cls.app = create_application()
        cls.client = TestClient(cls.app)
        
        # Model path
        cls.PROJECT_ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
        cls.MODEL_PATH = os.path.join(cls.PROJECT_ROOT, "artifacts", "ml-service", "ml", "models", "incident_model.joblib")
        cls.METRICS_PATH = os.path.join(cls.PROJECT_ROOT, "artifacts", "ml-service", "ml", "models", "metrics.json")
        
        # Feature names
        cls.FEATURES = [
            'cpu_usage', 'memory_usage', 'disk_usage', 'network_latency',
            'request_rate', 'error_rate', 'response_time', 'http_status',
            'service_availability', 'db_connections', 'query_latency',
            'cache_hit_ratio', 'restart_count', 'deployment_indicator'
        ]
        
        # Valid sample data
        cls.valid_sample = {
            'cpu_usage': 55.0,
            'memory_usage': 60.0,
            'disk_usage': 70.0,
            'network_latency': 120.0,
            'request_rate': 520.0,
            'error_rate': 0.03,
            'response_time': 210.0,
            'http_status': 200,
            'service_availability': 95.0,
            'db_connections': 25.0,
            'query_latency': 160.0,
            'cache_hit_ratio': 0.82,
            'restart_count': 0,
            'deployment_indicator': 0
        }
    
    def test_predict_success(self):
        """Test successful prediction with valid input."""
        response = self.client.post("/ml/api/v1/predict", json=self.valid_sample)
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check response structure
        self.assertIn("data", data)
        self.assertIn("message", data)
        self.assertEqual(data["message"], "Success")
        
        # Check prediction data
        pred_data = data["data"]
        self.assertIn("prediction", pred_data)
        self.assertIn("anomaly_status", pred_data)
        self.assertIn("confidence", pred_data)
        self.assertIn("probability", pred_data)
        self.assertIn("features", pred_data)
        
        # Check prediction values
        self.assertIn(pred_data["prediction"], [0, 1])
        self.assertIn(pred_data["anomaly_status"], ["normal", "anomaly"])
        self.assertGreaterEqual(pred_data["confidence"], 0.0)
        self.assertLessEqual(pred_data["confidence"], 1.0)
        
        # Check probability structure
        prob = pred_data["probability"]
        self.assertIn("normal", prob)
        self.assertIn("anomaly", prob)
        self.assertAlmostEqual(prob["normal"] + prob["anomaly"], 1.0, places=5)
        
        # Check features match input
        self.assertEqual(pred_data["features"], self.valid_sample)
    
    def test_predict_invalid_missing_field(self):
        """Test prediction with missing required field."""
        invalid_data = self.valid_sample.copy()
        del invalid_data['cpu_usage']
        
        response = self.client.post("/ml/api/v1/predict", json=invalid_data)
        
        self.assertEqual(response.status_code, 422)  # Validation error
        data = response.json()
        self.assertIn("error", data)
    
    def test_predict_invalid_field_type(self):
        """Test prediction with invalid field type."""
        invalid_data = self.valid_sample.copy()
        invalid_data['cpu_usage'] = "not_a_number"
        
        response = self.client.post("/ml/api/v1/predict", json=invalid_data)
        
        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertIn("error", data)
    
    def test_predict_invalid_ratio_field(self):
        """Test prediction with ratio field out of bounds."""
        invalid_data = self.valid_sample.copy()
        invalid_data['error_rate'] = 1.5  # Should be 0-1
        
        response = self.client.post("/ml/api/v1/predict", json=invalid_data)
        
        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertIn("error", data)
    
    def test_predict_invalid_http_status(self):
        """Test prediction with invalid HTTP status."""
        invalid_data = self.valid_sample.copy()
        invalid_data['http_status'] = 999  # Invalid
        
        response = self.client.post("/ml/api/v1/predict", json=invalid_data)
        
        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertIn("error", data)
    
    def test_predict_invalid_availability(self):
        """Test prediction with invalid availability."""
        invalid_data = self.valid_sample.copy()
        invalid_data['service_availability'] = 150  # Should be 0-100
        
        response = self.client.post("/ml/api/v1/predict", json=invalid_data)
        
        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertIn("error", data)
    
    def test_predict_empty_body(self):
        """Test prediction with empty request body."""
        response = self.client.post("/ml/api/v1/predict", json={})
        
        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertIn("error", data)
    
    def test_model_info_success(self):
        """Test successful model info retrieval."""
        response = self.client.get("/ml/api/v1/models/info")
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check response structure
        self.assertIn("data", data)
        self.assertIn("message", data)
        self.assertEqual(data["message"], "Success")
        
        # Check model info structure
        model_info = data["data"]
        self.assertIn("model_name", model_info)
        self.assertIn("algorithm", model_info)
        self.assertIn("feature_names", model_info)
        self.assertIn("target_name", model_info)
        self.assertIn("class_names", model_info)
        self.assertIn("training_status", model_info)
        self.assertIn("metrics", model_info)
        self.assertIn("model_path", model_info)
        self.assertIn("metrics_path", model_info)
        self.assertIn("model_size_bytes", model_info)
        
        # Check values
        self.assertEqual(model_info["model_name"], "RandomForestClassifier")
        self.assertEqual(model_info["algorithm"], "random_forest")
        self.assertEqual(model_info["feature_names"], self.FEATURES)
        self.assertEqual(model_info["target_name"], "anomaly")
        self.assertEqual(model_info["training_status"], "trained")
        self.assertGreater(model_info["model_size_bytes"], 0)
    
    def test_model_loading_consistency(self):
        """Test that model loading is consistent and returns expected structure."""
        # Load model directly
        model = joblib.load(self.MODEL_PATH)
        
        # Check model structure
        self.assertIn('model', model)
        self.assertIn('feature_names', model)
        self.assertIn('target_name', model)
        self.assertIn('class_names', model)
        
        # Check feature names match
        self.assertEqual(model['feature_names'], self.FEATURES)
        self.assertEqual(model['target_name'], 'anomaly')
        
        # Check model is a RandomForestClassifier
        from sklearn.ensemble import RandomForestClassifier
        self.assertIsInstance(model['model'], RandomForestClassifier)
    
    def test_preprocessing_consistency(self):
        """Test that preprocessing produces consistent feature order."""
        # Create DataFrame with features in random order
        random_order = self.FEATURES[::-1]  # Reverse order
        data_dict = {feature: self.valid_sample[feature] for feature in random_order}
        
        # The endpoint should reorder to FEATURES order
        # We test this by making a prediction and checking it works
        response = self.client.post("/ml/api/v1/predict", json=self.valid_sample)
        self.assertEqual(response.status_code, 200)
        
        # Also test with different order in request
        response2 = self.client.post("/ml/api/v1/predict", json=data_dict)
        self.assertEqual(response2.status_code, 200)
        
        # Both should give same prediction
        pred1 = response.json()["data"]["prediction"]
        pred2 = response2.json()["data"]["prediction"]
        self.assertEqual(pred1, pred2)
    
    def test_metrics_file_exists(self):
        """Test that metrics file exists and has expected structure."""
        self.assertTrue(os.path.exists(self.METRICS_PATH))
        
        with open(self.METRICS_PATH, 'r') as f:
            metrics = json.load(f)
        
        # Check expected keys (some may be missing from original training)
        expected_keys = ['accuracy', 'precision', 'recall', 'f1_score', 'confusion_matrix']
        for key in expected_keys:
            self.assertIn(key, metrics)
        
        # Check values are reasonable
        self.assertGreaterEqual(metrics['accuracy'], 0.0)
        self.assertLessEqual(metrics['accuracy'], 1.0)
        self.assertGreaterEqual(metrics['precision'], 0.0)
        self.assertGreaterEqual(metrics['recall'], 0.0)
        self.assertGreaterEqual(metrics['f1_score'], 0.0)
        
        # Check confusion matrix structure
        self.assertIsInstance(metrics['confusion_matrix'], list)
        self.assertGreater(len(metrics['confusion_matrix']), 0)
        for row in metrics['confusion_matrix']:
            self.assertIsInstance(row, list)
            for val in row:
                self.assertIsInstance(val, int)
                self.assertGreaterEqual(val, 0)
        
        # Check optional keys if present
        if 'feature_names' in metrics:
            self.assertEqual(metrics['feature_names'], self.FEATURES)
        if 'target_name' in metrics:
            self.assertEqual(metrics['target_name'], 'anomaly')
        if 'algorithm' in metrics:
            self.assertEqual(metrics['algorithm'], 'random_forest')
        if 'n_estimators' in metrics:
            self.assertEqual(metrics['n_estimators'], 200)
        if 'max_depth' in metrics:
            self.assertEqual(metrics['max_depth'], 15)
    
    def test_model_file_exists(self):
        """Test that model file exists and is loadable."""
        self.assertTrue(os.path.exists(self.MODEL_PATH))
        self.assertGreater(os.path.getsize(self.MODEL_PATH), 0)
        
        # Should be loadable
        model = joblib.load(self.MODEL_PATH)
        self.assertIsNotNone(model)


class TestModelLoadingEdgeCases(unittest.TestCase):
    """Test edge cases for model loading."""
    
    @patch('app.api.v1.endpoints.predict.MODEL_PATH', '/nonexistent/path/model.joblib')
    def test_missing_model_file(self):
        """Test behavior when model file is missing."""
        from app.api.v1.endpoints.predict import load_model
        
        import asyncio
        with self.assertRaises(FileNotFoundError):
            asyncio.run(load_model())


if __name__ == '__main__':
    unittest.main()