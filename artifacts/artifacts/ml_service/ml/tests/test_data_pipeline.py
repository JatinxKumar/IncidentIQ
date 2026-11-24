import unittest
import pandas as pd
import numpy as np
import tempfile
import os
import sys

# Add the ml-service directory to the path so we can import the ml package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from ml.data.generator import SyntheticIncidentGenerator
from ml.data.loader import DataLoader
from ml.preprocessing.cleaning import clean_data
from ml.preprocessing.feature_engineering import FeatureEngineering
from ml.preprocessing.pipeline import DataPipeline

class TestDataPipeline(unittest.TestCase):
    """Test cases for the DataPipeline class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.pipeline = DataPipeline(
            seed=42,
            num_samples=100,
            test_size=0.2,
            random_state=42
        )
    
    def test_generate_data(self):
        """Test that data generation produces a DataFrame."""
        data = self.pipeline.generate_data()
        self.assertIsInstance(data, pd.DataFrame)
        self.assertEqual(len(data), 100)
        self.assertIn('timestamp', data.columns)
        self.assertIn('cpu_usage', data.columns)
        self.assertIn('incident_type', data.columns)
        self.assertIn('severity', data.columns)
        self.assertIn('anomaly', data.columns)
    
    def test_clean_data(self):
        """Test that data cleaning works correctly."""
        # Create sample data with missing values
        sample_data = pd.DataFrame({
            'cpu_usage': [10, 20, np.nan, 40],
            'memory_usage': [15, np.nan, 25, 35],
            'incident_type': ['normal', 'normal', 'normal', 'normal'],
            'severity': ['low', 'low', 'low', 'low'],
            'anomaly': [0, 0, 0, 0]
        })
        
        cleaned_data = self.pipeline.clean_data(sample_data)
        self.assertIsInstance(cleaned_data, pd.DataFrame)
        self.assertEqual(len(cleaned_data), 4)
        # Check that missing values were filled
        self.assertFalse(cleaned_data.isnull().any().any())
    
    def test_feature_engineering(self):
        """Test that feature engineering works correctly."""
        # Generate data
        data = self.pipeline.generate_data()
        cleaned_data = self.pipeline.clean_data(data)
        
        # Engineer features
        engineered_data = self.pipeline.engineer_features(cleaned_data)
        self.assertIsInstance(engineered_data, pd.DataFrame)
        self.assertGreater(len(engineered_data.columns), len(cleaned_data.columns))
        # Check that new features were created
        self.assertIn('hour', engineered_data.columns)
        self.assertIn('cpu_memory_interaction', engineered_data.columns)
        self.assertIn('anomaly_score', engineered_data.columns)
    
    def test_split_data(self):
        """Test that data splitting works correctly."""
        # Generate and engineer data
        data = self.pipeline.generate_data()
        cleaned_data = self.pipeline.clean_data(data)
        engineered_data = self.pipeline.engineer_features(cleaned_data)
        
        # Split data
        train_data, test_data = self.pipeline.split_data(engineered_data)
        self.assertIsInstance(train_data, pd.DataFrame)
        self.assertIsInstance(test_data, pd.DataFrame)
        self.assertGreater(len(train_data), 0)
        self.assertGreater(len(test_data), 0)
        # Check that both sets have the same columns
        self.assertListEqual(list(train_data.columns), list(test_data.columns))
    
    def test_run_pipeline(self):
        """Test that the complete pipeline runs successfully."""
        train_data, test_data = self.pipeline.run_pipeline()
        self.assertIsInstance(train_data, pd.DataFrame)
        self.assertIsInstance(test_data, pd.DataFrame)
        self.assertGreater(len(train_data), 0)
        self.assertGreater(len(test_data), 0)
    
    def test_save_datasets(self):
        """Test that datasets can be saved."""
        # Run the complete pipeline
        train_data, test_data = self.pipeline.run_pipeline()
        
        # Save datasets to temporary files
        with tempfile.TemporaryDirectory() as temp_dir:
            train_path = os.path.join(temp_dir, 'train.csv')
            test_path = os.path.join(temp_dir, 'test.csv')
            full_path = os.path.join(temp_dir, 'engineered_data.csv')
            
            self.pipeline.save_datasets(
                train_path=train_path,
                test_path=test_path,
                full_path=full_path
            )
            
            # Check that files were created
            self.assertTrue(os.path.exists(train_path))
            self.assertTrue(os.path.exists(test_path))
            self.assertTrue(os.path.exists(full_path))
            
            # Check that data was saved correctly
            train_df = pd.read_csv(train_path)
            test_df = pd.read_csv(test_path)
            self.assertEqual(len(train_df), len(train_data))
            self.assertEqual(len(test_df), len(test_data))
    
    def test_get_pipeline_summary(self):
        """Test that pipeline summary is generated correctly."""
        summary = self.pipeline.get_pipeline_summary()
        self.assertIsInstance(summary, dict)
        self.assertIn('pipeline_config', summary)
        self.assertIn('data_shapes', summary)
        self.assertIn('seed', summary['pipeline_config'])
        self.assertIn('num_samples', summary['pipeline_config'])
        self.assertIn('test_size', summary['pipeline_config'])
        self.assertIn('random_state', summary['pipeline_config'])
        self.assertIn('raw_data', summary['data_shapes'])
        self.assertIn('cleaned_data', summary['data_shapes'])
        self.assertIn('engineered_data', summary['data_shapes'])
        self.assertIn('train_data', summary['data_shapes'])
        self.assertIn('test_data', summary['data_shapes'])

if __name__ == '__main__':
    unittest.main()