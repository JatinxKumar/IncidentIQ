import pandas as pd
import numpy as np
from typing import Union, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean the synthetic incident dataset.
    
    Args:
        df: Raw dataset DataFrame
        
    Returns:
        pd.DataFrame: Cleaned dataset
    """
    logger.info("Starting data cleaning process...")
    
    # Create a copy to avoid modifying the original
    cleaned_df = df.copy()
    
    # 1. Handle missing values
    initial_missing = cleaned_df.isnull().sum().sum()
    if initial_missing > 0:
        logger.info(f"Found {initial_missing} missing values")
        
        # For numeric columns, fill with median
        numeric_columns = cleaned_df.select_dtypes(include=[np.number]).columns
        for col in numeric_columns:
            if cleaned_df[col].isnull().any():
                median_val = cleaned_df[col].median()
                cleaned_df[col].fillna(median_val, inplace=True)
                logger.info(f"Filled missing values in {col} with median: {median_val}")
        
        # For categorical columns, fill with mode
        categorical_columns = cleaned_df.select_dtypes(include=['object']).columns
        for col in categorical_columns:
            if cleaned_df[col].isnull().any():
                mode_val = cleaned_df[col].mode()[0] if not cleaned_df[col].mode().empty else 'unknown'
                cleaned_df[col].fillna(mode_val, inplace=True)
                logger.info(f"Filled missing values in {col} with mode: {mode_val}")
    
    # 2. Handle outliers using IQR method for numeric columns
    numeric_columns = cleaned_df.select_dtypes(include=[np.number]).columns
    outlier_counts = {}
    
    for col in numeric_columns:
        if col in ['timestamp']:  # Skip timestamp column
            continue
            
        Q1 = cleaned_df[col].quantile(0.25)
        Q3 = cleaned_df[col].quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        
        outliers = ((cleaned_df[col] < lower_bound) | (cleaned_df[col] > upper_bound))
        outlier_count = outliers.sum()
        outlier_counts[col] = outlier_count
        
        if outlier_count > 0:
            logger.info(f"Found {outlier_count} outliers in {col}")
            # Cap outliers to bounds instead of removing
            cleaned_df[col] = cleaned_df[col].clip(lower=lower_bound, upper=upper_bound)
    
    total_outliers = sum(outlier_counts.values())
    logger.info(f"Total outliers capped: {total_outliers}")
    
    # 3. Validate data ranges
    validation_rules = {
        'cpu_usage': (0, 100),
        'memory_usage': (0, 100),
        'disk_usage': (0, 100),
        'network_latency': (0, None),
        'request_rate': (0, None),
        'error_rate': (0, 1),
        'response_time': (0, None),
        'http_status': (100, 599),
        'service_availability': (0, 100),
        'db_connections': (0, None),
        'query_latency': (0, None),
        'cache_hit_ratio': (0, 1),
        'restart_count': (0, None),
        'deployment_indicator': (0, 1)
    }
    
    for col, (min_val, max_val) in validation_rules.items():
        if col in cleaned_df.columns:
            if min_val is not None:
                below_min = (cleaned_df[col] < min_val).sum()
                if below_min > 0:
                    logger.warning(f"{below_min} values below minimum {min_val} in {col}")
                    cleaned_df[col] = cleaned_df[col].clip(lower=min_val)
            
            if max_val is not None:
                above_max = (cleaned_df[col] > max_val).sum()
                if above_max > 0:
                    logger.warning(f"{above_max} values above maximum {max_val} in {col}")
                    cleaned_df[col] = cleaned_df[col].clip(upper=max_val)
    
    # 4. Ensure timestamp is datetime
    if 'timestamp' in cleaned_df.columns:
        cleaned_df['timestamp'] = pd.to_datetime(cleaned_df['timestamp'])
    
    final_missing = cleaned_df.isnull().sum().sum()
    logger.info(f"Data cleaning completed. Missing values: {initial_missing} -> {final_missing}")
    logger.info(f"Cleaned dataset shape: {cleaned_df.shape}")
    
    return cleaned_df

def handle_missing_values(df: pd.DataFrame, strategy: str = 'median') -> pd.DataFrame:
    """
    Handle missing values in the dataset.
    
    Args:
        df: Input DataFrame
        strategy: Strategy for handling missing values ('mean', 'median', 'mode', 'drop')
        
    Returns:
        pd.DataFrame: DataFrame with handled missing values
    """
    logger.info(f"Handling missing values using strategy: {strategy}")
    
    df_copy = df.copy()
    
    if strategy == 'drop':
        initial_rows = len(df_copy)
        df_copy.dropna(inplace=True)
        logger.info(f"Dropped {initial_rows - len(df_copy)} rows with missing values")
        return df_copy
    
    # Handle numeric columns
    numeric_columns = df_copy.select_dtypes(include=[np.number]).columns
    for col in numeric_columns:
        if df_copy[col].isnull().any():
            if strategy == 'mean':
                fill_value = df_copy[col].mean()
            elif strategy == 'median':
                fill_value = df_copy[col].median()
            else:  # default to median
                fill_value = df_copy[col].median()
            
            df_copy[col].fillna(fill_value, inplace=True)
            logger.info(f"Filled missing values in {col} with {strategy}: {fill_value}")
    
    # Handle categorical columns
    categorical_columns = df_copy.select_dtypes(include=['object']).columns
    for col in categorical_columns:
        if df_copy[col].isnull().any():
            mode_val = df_copy[col].mode()[0] if not df_copy[col].mode().empty else 'unknown'
            df_copy[col].fillna(mode_val, inplace=True)
            logger.info(f"Filled missing values in {col} with mode: {mode_val}")
    
    return df_copy

def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """
    Remove duplicate rows from the dataset.
    
    Args:
        df: Input DataFrame
        
    Returns:
        pd.DataFrame: DataFrame with duplicates removed
    """
    initial_rows = len(df)
    df_cleaned = df.drop_duplicates()
    duplicates_removed = initial_rows - len(df_cleaned)
    
    if duplicates_removed > 0:
        logger.info(f"Removed {duplicates_removed} duplicate rows")
    else:
        logger.info("No duplicate rows found")
    
    return df_cleaned