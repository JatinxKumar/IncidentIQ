import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)

class FeatureEngineering:
    """
    Performs feature engineering for synthetic incident data.
    """
    
    def __init__(self, data: pd.DataFrame):
        """
        Initialize with dataset
        
        Args:
            data: Input DataFrame
        """
        self.data = data.copy()
        self.scaler = StandardScaler()
        self.minmax_scaler = MinMaxScaler()
        logger.info("FeatureEngineering initialized")
    
    def create_time_features(self) -> pd.DataFrame:
        """
        Create time-based features from timestamp column.
        
        Returns:
            pd.DataFrame: DataFrame with new time features
        """
        logger.info("Creating time-based features...")
        
        # Extract time components
        self.data['hour'] = self.data['timestamp'].dt.hour
        self.data['day_of_week'] = self.data['timestamp'].dt.dayofweek
        self.data['is_weekend'] = self.data['timestamp'].dt.dayofweek.isin([5, 6])
        self.data['month'] = self.data['timestamp'].dt.month
        
        # Create time-based patterns
        self.data['time_sin'] = np.sin(2 * np.pi * self.data['hour'] / 24)
        self.data['time_cos'] = np.cos(2 * np.pi * self.data['hour'] / 24)
        
        logger.info("Time features created")
        return self.data
    
    def create_correlation_features(self) -> pd.DataFrame:
        """
        Create features based on feature correlations.
        
        Returns:
            pd.DataFrame: DataFrame with new correlation features
        """
        logger.info("Creating correlation-based features...")
        
        # Calculate correlation matrix
        corr_matrix = self.data.corr(numeric_only=True)
        
        # Create interaction features
        self.data['cpu_memory_interaction'] = self.data['cpu_usage'] * self.data['memory_usage']
        self.data['cpu_disk_interaction'] = self.data['cpu_usage'] * self.data['disk_usage']
        self.data['network_cpu_interaction'] = self.data['network_latency'] * self.data['cpu_usage']
        
        # Create ratio features
        self.data['cpu_to_disk_ratio'] = self.data['cpu_usage'] / (self.data['disk_usage'] + 1e-6)
        self.data['memory_to_disk_ratio'] = self.data['memory_usage'] / (self.data['disk_usage'] + 1e-6)
        
        logger.info("Correlation features created")
        return self.data
    
    def create_anomaly_features(self) -> pd.DataFrame:
        """
        Create features based on anomaly detection.
        
        Returns:
            pd.DataFrame: DataFrame with new anomaly features
        """
        logger.info("Creating anomaly-based features...")
        
        # Calculate z-scores for anomaly detection
        numeric_cols = self.data.select_dtypes(include=[np.number]).columns
        z_scores = (self.data[numeric_cols] - self.data[numeric_cols].mean()) / self.data[numeric_cols].std()
        
        # Create anomaly indicators
        self.data['anomaly_score'] = np.sqrt((z_scores ** 2).sum(axis=1))
        self.data['is_anomaly'] = (self.data['anomaly_score'] > 3).astype(int)
        
        logger.info("Anomaly features created")
        return self.data
    
    def scale_features(self) -> pd.DataFrame:
        """
        Scale features using StandardScaler.
        
        Returns:
            pd.DataFrame: Scaled DataFrame
        """
        logger.info("Scaling features...")
        
        # Scale numeric features
        numeric_cols = self.data.select_dtypes(include=[np.number]).columns
        except_cols = ['timestamp', 'incident_type', 'severity', 'anomaly', 'is_anomaly']
        numeric_cols = [col for col in numeric_cols if col not in except_cols]
        
        self.data[numeric_cols] = self.scaler.fit_transform(self.data[numeric_cols])
        
        # Scale categorical features using one-hot encoding
        categorical_cols = self.data.select_dtypes(include=['object']).columns
        except_cols = ['incident_type', 'severity', 'anomaly', 'is_anomaly']
        categorical_cols = [col for col in categorical_cols if col not in except_cols]
        
        self.data = pd.get_dummies(self.data, columns=categorical_cols, drop_first=True)
        
        logger.info("Features scaled")
        return self.data
    
    def transform(self) -> pd.DataFrame:
        """
        Apply all feature engineering transformations.
        
        Returns:
            pd.DataFrame: Transformed DataFrame
        """
        logger.info("Starting feature engineering pipeline...")
        
        # Create time features
        self.data = self.create_time_features()
        
        # Create correlation features
        self.data = self.create_correlation_features()
        
        # Create anomaly features
        self.data = self.create_anomaly_features()
        
        # Scale features
        self.data = self.scale_features()
        
        logger.info("Feature engineering completed")
        return self.data