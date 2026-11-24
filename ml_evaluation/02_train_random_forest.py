"""
SentinelAI ML Evaluation - Random Forest Classifier Training and Evaluation

This script trains a Random Forest Classifier on the synthetic telemetry dataset
and evaluates its performance using train/test split.

Requirements:
- Clean and validate dataset
- Handle missing values
- Split data into training and testing sets
- Use a reproducible random_state
- Prevent data leakage
- Train RandomForestClassifier
- Save the trained model
- Generate predictions on the test dataset
- Calculate Accuracy, Precision, Recall, F1-score, Confusion matrix
"""

import json
import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler

# Configuration
RANDOM_STATE = 42
TEST_SIZE = 0.2
ANOMALY_CLASS = 1
NORMAL_CLASS = 0

def load_dataset(data_path: str = 'ml_evaluation/synthetic_telemetry.csv'):
    """Load and validate the telemetry dataset."""
    print(f"Loading dataset from {data_path}")
    df = pd.read_csv(data_path)
    
    # Validate required columns
    required_columns = [
        'cpu_usage', 'memory_usage', 'disk_usage', 'network_latency',
        'request_rate', 'error_rate', 'response_time', 'http_status',
        'service_availability', 'db_connections', 'query_latency',
        'cache_hit_ratio', 'restart_count', 'deployment_indicator', 'anomaly'
    ]
    
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")
    
    # Drop non-feature columns
    feature_columns = [
        'cpu_usage', 'memory_usage', 'disk_usage', 'network_latency',
        'request_rate', 'error_rate', 'response_time', 'http_status',
        'service_availability', 'db_connections', 'query_latency',
        'cache_hit_ratio', 'restart_count', 'deployment_indicator'
    ]
    
    # Handle missing values
    df_clean = df[feature_columns + ['anomaly']].copy()
    
    # Check for missing values
    missing_values = df_clean.isnull().sum().sum()
    if missing_values > 0:
        print(f"Found {missing_values} missing values. Imputing with median...")
        df_clean = df_clean.fillna(df_clean.median())
    
    # Encode target variable
    le = LabelEncoder()
    df_clean['anomaly_encoded'] = le.fit_transform(df_clean['anomaly'])
    
    # Separate features and target
    X = df_clean[feature_columns]
    y = df_clean['anomaly_encoded']
    
    print(f"Dataset loaded: {len(df_clean)} samples, {len(feature_columns)} features")
    print(f"Class distribution: Normal={np.sum(y == NORMAL_CLASS)}, Anomaly={np.sum(y == ANOMALY_CLASS)}")
    
    return X, y, le, feature_columns

def train_and_evaluate(X: pd.DataFrame, y: np.ndarray, feature_names: list, model_save_path: str = 'ml_evaluation/models/random_forest_model.pkl'):
    """Train Random Forest and evaluate on test set."""
    print("\n" + "=" * 60)
    print("Training Random Forest Classifier")
    print("=" * 60)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    
    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")
    
    # Create model
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        class_weight='balanced'
    )
    
    # Train
    print("Training model...")
    model.fit(X_train, y_train)
    
    # Save model
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    with open(model_save_path, 'wb') as f:
        pickle.dump({
            'model': model,
            'feature_names': feature_names,
            'label_encoder': None,  # Will use separate encoder
            'random_state': RANDOM_STATE,
            'test_size': TEST_SIZE
        }, f)
    print(f"Model saved to {model_save_path}")
    
    # Predict on test set
    print("Generating predictions on test set...")
    y_pred = model.predict(X_test)
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    cm = confusion_matrix(y_test, y_pred)
    
    print(f"\n" + "=" * 60)
    print("Random Forest Evaluation Results")
    print("=" * 60)
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print(f"Confusion Matrix:\n{cm}")
    
    # Detailed classification report
    report = classification_report(y_test, y_pred, target_names=['Normal', 'Anomaly'])
    print(f"\nClassification Report:\n{report}")
    
    # Save metrics
    metrics = {
        'model_type': 'RandomForestClassifier',
        'random_state': RANDOM_STATE,
        'test_size': TEST_SIZE,
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'confusion_matrix': cm.tolist(),
        'classification_report': report,
        'n_estimators': 100,
        'max_depth': 10,
        'trained_at': pd.Timestamp.now().isoformat()
    }
    
    metrics_path = 'ml_evaluation/models/rf_metrics.json'
    os.makedirs(os.path.dirname(metrics_path), exist_ok=True)
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"Metrics saved to {metrics_path}")
    
    # Return results
    return {
        'model': model,
        'metrics': metrics,
        'X_test': X_test,
        'y_test': y_test,
        'y_pred': y_pred,
        'feature_names': feature_names
    }

def main():
    """Main function to train and evaluate Random Forest."""
    print("=" * 60)
    print("SentinelAI ML Evaluation - Random Forest Training")
    print("=" * 60)
    
    # Load dataset
    X, y, le, feature_names = load_dataset()
    
    # Train and evaluate
    results = train_and_evaluate(X, y, feature_names)
    
    print("\n" + "=" * 60)
    print("Random Forest Training Completed Successfully")
    print("=" * 60)
    print(f"Model saved to: {os.path.abspath('ml_evaluation/models/random_forest_model.pkl')}")
    print(f"Metrics saved to: {os.path.abspath('ml_evaluation/models/rf_metrics.json')}")

if __name__ == "__main__":
    main()