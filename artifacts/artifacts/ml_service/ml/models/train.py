import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_score, recall_score, f1_score

# Add the ml-service directory to the Python path
ml_service_path = os.path.join(os.path.dirname(__file__), '..', '..')
sys.path.insert(0, ml_service_path)

# Import pipeline components
from ml.preprocessing.pipeline import DataPipeline

# Define model save path - use absolute path from project root
PROJECT_ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..')
MODEL_PATH = os.path.join(PROJECT_ROOT, "artifacts", "ml-service", "ml", "models", "incident_model.joblib")
FEATURES = [
    'cpu_usage', 'memory_usage', 'disk_usage', 'network_latency',
    'request_rate', 'error_rate', 'response_time', 'http_status',
    'service_availability', 'db_connections', 'query_latency',
    'cache_hit_ratio', 'restart_count', 'deployment_indicator'
]
TARGET = 'anomaly'  # binary label for incident prediction

def train_model() -> None:
    """Train a RandomForestClassifier on synthetic incident data."""
    print("Initializing data pipeline...")
    pipeline = DataPipeline(seed=42, num_samples=10000)
    
    # Generate and preprocess data
    pipeline.generate_data()
    cleaned = pipeline.clean_data()
    engineered = pipeline.engineer_features()
    
    # Split into train/test (pipeline already splits)
    train_data, test_data = pipeline.split_data()
    
    # Separate features and target
    X_train = train_data[FEATURES]
    y_train = train_data[TARGET]
    X_test = test_data[FEATURES]
    y_test = test_data[TARGET]
    
    print(f"Training data shape: {X_train.shape}")
    print(f"Test data shape: {X_test.shape}")
    
    # Initialize and train RandomForestClassifier
    print("Training RandomForestClassifier...")
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        class_weight='balanced'  # Handle potential class imbalance
    )
    
    clf.fit(X_train, y_train)
    
    # Evaluate
    print("Evaluating model...")
    y_pred = clf.predict(X_test)
    
    # Calculate metrics
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    
    # Generate classification report and confusion matrix
    report = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred)
    
    print(f"Accuracy: {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall: {rec:.4f}")
    print(f"F1 Score: {f1:.4f}")
    print("Confusion Matrix:")
    print(cm)
    
    # Ensure model directory exists
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    
    # Save model and preprocessing objects
    model_artifacts = {
        'model': clf,
        'feature_names': FEATURES,
        'target_name': TARGET,
        'class_names': ['0', '1'],  # Binary: 0 = normal, 1 = anomaly
        'scaler': clf.named_steps['scaler'] if hasattr(clf, 'named_steps') else None,
    }
    
    # Save model
    joblib.dump(model_artifacts, MODEL_PATH)
    print(f"Trained model saved to {MODEL_PATH}")
    
    # Also save evaluation metrics
    metrics_path = os.path.join(os.path.dirname(MODEL_PATH), "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump({
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1),
            "confusion_matrix": cm.tolist(),
            "feature_names": FEATURES,
            "target_name": TARGET,
            "algorithm": "random_forest",
            "n_estimators": 200,
            "max_depth": 15
        }, f)
    print(f"Evaluation metrics saved to {metrics_path}")

if __name__ == "__main__":
    train_model()