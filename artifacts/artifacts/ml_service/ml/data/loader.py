import pandas as pd
import numpy as np
import os
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class DataLoader:
    """
    Loads and manages synthetic incident datasets.
    """
    
    def __init__(self, data_dir: str = "artifacts/ml-service/ml/data/datasets"):
        """
        Initialize the data loader.
        
        Args:
            data_dir: Directory where datasets are stored
        """
        self.data_dir = data_dir
        self.dataset = None
        self.train_data = None
        self.test_data = None
        logger.info(f"DataLoader initialized with data_dir: {data_dir}")
    
    def load_from_csv(self, filename: str = "synthetic_incidents.csv") -> pd.DataFrame:
        """
        Load dataset from CSV file.
        
        Args:
            filename: Name of the CSV file to load
            
        Returns:
            pd.DataFrame: Loaded dataset
        """
        filepath = os.path.join(self.data_dir, filename)
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Dataset file not found: {filepath}")
        
        logger.info(f"Loading dataset from {filepath}")
        self.dataset = pd.read_csv(filepath)
        logger.info(f"Loaded dataset with shape: {self.dataset.shape}")
        return self.dataset
    
    def load_from_json(self, filename: str = "synthetic_incidents.json") -> pd.DataFrame:
        """
        Load dataset from JSON file.
        
        Args:
            filename: Name of the JSON file to load
            
        Returns:
            pd.DataFrame: Loaded dataset
        """
        filepath = os.path.join(self.data_dir, filename)
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Dataset file not found: {filepath}")
        
        logger.info(f"Loading dataset from {filepath}")
        self.dataset = pd.read_json(filepath)
        logger.info(f"Loaded dataset with shape: {self.dataset.shape}")
        return self.dataset
    
    def save_to_csv(self, data: pd.DataFrame, filename: str = "synthetic_incidents.csv") -> None:
        """
        Save dataset to CSV file.
        
        Args:
            data: DataFrame to save
            filename: Name of the CSV file
        """
        os.makedirs(self.data_dir, exist_ok=True)
        filepath = os.path.join(self.data_dir, filename)
        data.to_csv(filepath, index=False)
        logger.info(f"Saved dataset to {filepath} with shape: {data.shape}")
    
    def save_to_json(self, data: pd.DataFrame, filename: str = "synthetic_incidents.json") -> None:
        """
        Save dataset to JSON file.
        
        Args:
            data: DataFrame to save
            filename: Name of the JSON file
        """
        os.makedirs(self.data_dir, exist_ok=True)
        filepath = os.path.join(self.data_dir, filename)
        data.to_json(filepath, orient='records', date_format='iso')
        logger.info(f"Saved dataset to {filepath} with shape: {data.shape}")
    
    def get_dataset_info(self) -> dict:
        """
        Get information about the loaded dataset.
        
        Returns:
            dict: Dataset information
        """
        if self.dataset is None:
            return {"error": "No dataset loaded"}
        
        info = {
            "shape": self.dataset.shape,
            "columns": list(self.dataset.columns),
            "dtypes": self.dataset.dtypes.to_dict(),
            "missing_values": self.dataset.isnull().sum().to_dict(),
            "memory_usage": self.dataset.memory_usage(deep=True).sum(),
            "sample_data": self.dataset.head().to_dict('records')
        }
        return info
    
    def split_features_labels(self, 
                            feature_columns: Optional[list] = None,
                            label_columns: list = ['incident_type', 'severity', 'anomaly']) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Split dataset into features and labels.
        
        Args:
            feature_columns: List of feature column names (if None, use all non-label columns)
            label_columns: List of label column names
            
        Returns:
            Tuple[pd.DataFrame, pd.DataFrame]: (features, labels)
        """
        if self.dataset is None:
            raise ValueError("No dataset loaded. Call load_from_csv or load_from_json first.")
        
        if feature_columns is None:
            feature_columns = [col for col in self.dataset.columns if col not in label_columns]
        
        features = self.dataset[feature_columns].copy()
        labels = self.dataset[label_columns].copy()
        
        logger.info(f"Split dataset: {features.shape[0]} samples, {features.shape[1]} features, {labels.shape[1]} labels")
        return features, labels