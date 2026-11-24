import pandas as pd
import numpy as np
from typing import List, Tuple, Optional
import logging
from sklearn.model_selection import train_test_split

# Use absolute imports for internal modules
from ml.data.generator import SyntheticIncidentGenerator
from ml.data.loader import DataLoader
from ml.preprocessing.cleaning import clean_data
from ml.preprocessing.feature_engineering import FeatureEngineering

logger = logging.getLogger(__name__)

class DataPipeline:
    """
    Complete data pipeline for synthetic incident data generation and preprocessing.
    """
    
    def __init__(self, 
                 seed: int = 42, 
                 num_samples: int = 10000,
                 test_size: float = 0.2,
                 random_state: int = 42):
        """
        Initialize the data pipeline.
        
        Args:
            seed: Random seed for reproducibility
            num_samples: Number of samples to generate
            test_size: Proportion of dataset to include in test split
            random_state: Random state for train/test split
        """
        self.seed = seed
        self.num_samples = num_samples
        self.test_size = test_size
        self.random_state = random_state
        
        # Initialize components
        self.generator = SyntheticIncidentGenerator(seed=seed, num_samples=num_samples)
        self.loader = DataLoader()
        self.feature_engineer = None
        
        # Data storage
        self.raw_data = None
        self.cleaned_data = None
        self.engineered_data = None
        self.train_data = None
        self.test_data = None
        
        logger.info(f"DataPipeline initialized with {num_samples} samples")
    
    def generate_data(self) -> pd.DataFrame:
        """
        Generate synthetic incident data.
        
        Returns:
            pd.DataFrame: Generated raw data
        """
        logger.info("Generating synthetic data...")
        self.raw_data = self.generator.generate()
        return self.raw_data
    
    def clean_data(self, data: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        Clean the data.
        
        Args:
            data: Data to clean (if None, uses raw_data)
            
        Returns:
            pd.DataFrame: Cleaned data
        """
        if data is None:
            if self.raw_data is None:
                raise ValueError("No data available. Generate data first.")
            data = self.raw_data
        
        logger.info("Cleaning data...")
        self.cleaned_data = clean_data(data)
        return self.cleaned_data
    
    def engineer_features(self, data: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        Perform feature engineering.
        
        Args:
            data: Data to engineer features for (if None, uses cleaned_data)
            
        Returns:
            pd.DataFrame: Data with engineered features
        """
        if data is None:
            if self.cleaned_data is None:
                raise ValueError("No cleaned data available. Clean data first.")
            data = self.cleaned_data
        
        logger.info("Engineering features...")
        self.feature_engineer = FeatureEngineering(data)
        self.engineered_data = self.feature_engineer.transform()
        return self.engineered_data
    
    def split_data(self, 
                   data: Optional[pd.DataFrame] = None,
                   target_columns: List[str] = ['incident_type', 'severity', 'anomaly']) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Split data into train and test sets.
        
        Args:
            data: Data to split (if None, uses engineered_data)
            target_columns: List of target column names
            
        Returns:
            Tuple[pd.DataFrame, pd.DataFrame]: (train_data, test_data)
        """
        if data is None:
            if self.engineered_data is None:
                raise ValueError("No engineered data available. Engineer features first.")
            data = self.engineered_data
        
        logger.info("Splitting data into train and test sets...")
        
        # Separate features and targets
        feature_columns = [col for col in data.columns if col not in target_columns]
        X = data[feature_columns]
        y = data[target_columns]
        
        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=self.test_size, random_state=self.random_state, stratify=y['incident_type']
        )
        
        # Combine features and targets back
        self.train_data = pd.concat([X_train, y_train], axis=1)
        self.test_data = pd.concat([X_test, y_test], axis=1)
        
        logger.info(f"Data split complete. Train: {self.train_data.shape}, Test: {self.test_data.shape}")
        return self.train_data, self.test_data
    
    def run_pipeline(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Run the complete data pipeline.
        
        Returns:
            Tuple[pd.DataFrame, pd.DataFrame]: (train_data, test_data)
        """
        logger.info("Starting complete data pipeline...")
        
        # Generate data
        self.generate_data()
        
        # Clean data
        self.clean_data()
        
        # Engineer features
        self.engineer_features()
        
        # Split data
        train_data, test_data = self.split_data()
        
        logger.info("Data pipeline completed successfully")
        return train_data, test_data
    
    def save_datasets(self, 
                      train_path: str = "artifacts/ml-service/ml/data/datasets/train.csv",
                      test_path: str = "artifacts/ml-service/ml/data/datasets/test.csv",
                      full_path: str = "artifacts/ml-service/ml/data/datasets/engineered_data.csv") -> None:
        """
        Save the datasets to files.
        
        Args:
            train_path: Path to save training data
            test_path: Path to save test data
            full_path: Path to save full engineered dataset
        """
        import os
        
        # Create directories if they don't exist
        os.makedirs(os.path.dirname(train_path), exist_ok=True)
        os.makedirs(os.path.dirname(test_path), exist_ok=True)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # Save datasets
        if self.train_data is not None:
            self.train_data.to_csv(train_path, index=False)
            logger.info(f"Training data saved to {train_path}")
        
        if self.test_data is not None:
            self.test_data.to_csv(test_path, index=False)
            logger.info(f"Test data saved to {test_path}")
        
        if self.engineered_data is not None:
            self.engineered_data.to_csv(full_path, index=False)
            logger.info(f"Full engineered dataset saved to {full_path}")
    
    def get_pipeline_summary(self) -> dict:
        """
        Get a summary of the pipeline execution.
        
        Returns:
            dict: Pipeline summary
        """
        summary = {
            "pipeline_config": {
                "seed": self.seed,
                "num_samples": self.num_samples,
                "test_size": self.test_size,
                "random_state": self.random_state
            },
            "data_shapes": {
                "raw_data": self.raw_data.shape if self.raw_data is not None else None,
                "cleaned_data": self.cleaned_data.shape if self.cleaned_data is not None else None,
                "engineered_data": self.engineered_data.shape if self.engineered_data is not None else None,
                "train_data": self.train_data.shape if self.train_data is not None else None,
                "test_data": self.test_data.shape if self.test_data is not None else None
            }
        }
        return summary