import os
import sys
import joblib
import numpy as np
import httpx
import time
from pathlib import Path

# Add the ml-service directory to the Python path
ml_service_path = os.path.join(os.path.dirname(__file__), 'artifacts', 'ml-service')
sys.path.insert(0, ml_service_path)

# Import the generator to create samples
from ml.data.generator import SyntheticIncidentGenerator
from ml.preprocessing.pipeline import DataPipeline

# Path to the model artifact
MODEL_PATH = os.path.join(ml_service_path, 'ml', 'models', 'incident_model.joblib')
METRICS_PATH = os.path.join(ml_service_path, 'ml', 'models', 'metrics.json')

def load_model():
    """Load the trained model from disk."""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model artifact not found at {MODEL_PATH}")
    model_artifacts = joblib.load(MODEL_PATH)
    return model_artifacts

def get_normal_anomalous_samples():
    """Generate one normal and one anomalous sample using the same pipeline as training."""
    # We'll use the same seed and pipeline as in training to get consistent samples
    pipeline = DataPipeline(seed=42, num_samples=10000)
    pipeline.generate_data()
    cleaned = pipeline.clean_data()
    engineered = pipeline.engineer_features()
    train_data, test_data = pipeline.split_data()
    
    # We'll take the first normal and first anomalous from the test set
    # But note: the test set is already split, so we can filter
    X_test = test_data[pipeline.FEATURES]
    y_test = test_data[pipeline.TARGET]
    
    # Find indices of normal and anomalous
    normal_indices = np.where(y_test == 0)[0]
    anomalous_indices = np.where(y_test == 1)[0]
    
    if len(normal_indices) == 0 or len(anomalous_indices) == 0:
        # If we don't have both, we'll generate a new small dataset with the same seed and take one of each
        # We'll generate 20 samples and hope we get both
        pipeline_small = DataPipeline(seed=42, num_samples=20)
        pipeline_small.generate_data()
        cleaned_small = pipeline_small.clean_data()
        engineered_small = pipeline_small.engineer_features()
        train_small, test_small = pipeline_small.split_data()
        X_test_small = test_small[pipeline_small.FEATURES]
        y_test_small = test_small[pipeline_small.TARGET]
        
        normal_indices = np.where(y_test_small == 0)[0]
        anomalous_indices = np.where(y_test_small == 1)[0]
        
        if len(normal_indices) == 0:
            # If still no normal, we'll take the first sample and force it to be normal by adjusting? 
            # Instead, we'll use the generator directly and then preprocess.
            # Let's use the generator and then apply the same preprocessing steps.
            pass
    
    # We'll take the first normal and first anomalous from the test set we have
    normal_sample = X_test.iloc[normal_indices[0]] if len(normal_indices) > 0 else None
    anomalous_sample = X_test.iloc[anomalous_indices[0]] if len(anomalous_indices) > 0 else None
    
    # If we don't have both, we'll generate a new dataset and try again with a different seed?
    # For simplicity, we'll just use the first two samples from the test set and hope they are different.
    # But note: the model might be biased, so we want to ensure we have one of each.
    # We'll use the generator to create a sample that we know is normal and one that we know is anomalous.
    # We can do this by generating a sample and then checking the label.
    # We'll generate until we get one normal and one anomalous.
    
    # Let's do a simple approach: generate 100 samples and split, then take one of each.
    pipeline_ensure = DataPipeline(seed=123, num_samples=100)
    pipeline_ensure.generate_data()
    cleaned_ensure = pipeline_ensure.clean_data()
    engineered_ensure = pipeline_ensure.engineer_features()
    train_ensure, test_ensure = pipeline_ensure.split_data()
    X_test_ensure = test_ensure[pipeline_ensure.FEATURES]
    y_test_ensure = test_ensure[pipeline_ensure.TARGET]
    
    normal_indices = np.where(y_test_ensure == 0)[0]
    anomalous_indices = np.where(y_test_ensure == 1)[0]
    
    if len(normal_indices) > 0 and len(anomalous_indices) > 0:
        normal_sample = X_test_ensure.iloc[normal_indices[0]]
        anomalous_sample = X_test_ensure.iloc[anomalous_indices[0]]
    else:
        # Fallback: use the first two samples and hope they are different (though they might be same class)
        normal_sample = X_test_ensure.iloc[0]
        anomalous_sample = X_test_ensure.iloc[1]
    
    return normal_sample, anomalous_sample

def check_health(client, base_url):
    """Check the health endpoint."""
    try:
        response = client.get(f"{base_url}/ml/healthz")
        return response.status_code == 200, response.json()
    except Exception as e:
        return False, str(e)

def predict_sample(client, base_url, sample):
    """Send a sample to the prediction endpoint and return the response."""
    # Convert the sample to a list of floats (since it's a pandas Series)
    # We need to match the feature order expected by the model.
    # The model expects the features in the order of `FEATURES` in the training script.
    # We'll use the same order as in the training script.
    FEATURES = [
        'cpu_usage', 'memory_usage', 'disk_usage', 'network_latency',
        'request_rate', 'error_rate', 'response_time', 'http_status',
        'service_availability', 'db_connections', 'query_latency',
        'cache_hit_ratio', 'restart_count', 'deployment_indicator'
    ]
    
    # Ensure the sample is in the same order
    sample_ordered = [sample[feat] for feat in FEATURES]
    
    # The endpoint expects a JSON object with the features
    payload = {
        "cpu_usage": sample_ordered[0],
        "memory_usage": sample_ordered[1],
        "disk_usage": sample_ordered[2],
        "network_latency": sample_ordered[3],
        "request_rate": sample_ordered[4],
        "error_rate": sample_ordered[5],
        "response_time": sample_ordered[6],
        "http_status": int(sample_ordered[7]),  # http_status is integer
        "service_availability": sample_ordered[8],
        "db_connections": sample_ordered[9],
        "query_latency": sample_ordered[10],
        "cache_hit_ratio": sample_ordered[11],
        "restart_count": int(sample_ordered[12]),  # restart_count is integer
        "deployment_indicator": int(sample_ordered[13])  # deployment_indicator is integer
    }
    
    try:
        response = client.post(f"{base_url}/ml/api/v1/predict", json=payload)
        return response.status_code, response.json()
    except Exception as e:
        return 500, {"error": str(e)}

def main():
    base_url = "http://localhost:8000"
    
    print("=" * 60)
    print("ML Model Validation")
    print("=" * 60)
    
    # 1. Load the model and show classes and predict_proba
    print("\n1. Loading model artifact...")
    try:
        model_artifacts = load_model()
        model = model_artifacts['model']
        print(f"   Model loaded successfully from: {MODEL_PATH}")
        print(f"   Model classes: {model.classes_}")
        print(f"   Number of estimators: {model.n_estimators}")
    except Exception as e:
        print(f"   ERROR: Failed to load model: {e}")
        return
    
    # 2. Generate one normal and one anomalous sample
    print("\n2. Generating normal and anomalous telemetry samples...")
    try:
        normal_sample, anomalous_sample = get_normal_anomalous_samples()
        print(f"   Normal sample features: {normal_sample.to_dict()}")
        print(f"   Anomalous sample features: {anomalous_sample.to_dict()}")
    except Exception as e:
        print(f"   ERROR: Failed to generate samples: {e}")
        return
    
    # 3. Show the model's prediction probabilities for these samples
    print("\n3. Model prediction probabilities (local inference)...")
    try:
        # Prepare the samples in the order expected by the model
        FEATURES = [
            'cpu_usage', 'memory_usage', 'disk_usage', 'network_latency',
            'request_rate', 'error_rate', 'response_time', 'http_status',
            'service_availability', 'db_connections', 'query_latency',
            'cache_hit_ratio', 'restart_count', 'deployment_indicator'
        ]
        normal_ordered = np.array([normal_sample[feat] for feat in FEATURES]).reshape(1, -1)
        anomalous_ordered = np.array([anomalous_sample[feat] for feat in FEATURES]).reshape(1, -1)
        
        normal_proba = model.predict_proba(normal_ordered)[0]
        anomalous_proba = model.predict_proba(anomalous_ordered)[0]
        
        print(f"   Normal sample -> class probabilities: {normal_proba}")
        print(f"   Anomalous sample -> class probabilities: {anomalous_proba}")
        print(f"   Normal sample -> predicted class: {model.classes_[np.argmax(normal_proba)]}")
        print(f"   Anomalous sample -> predicted class: {model.classes_[np.argmax(anomalous_proba)]}")
    except Exception as e:
        print(f"   ERROR: Failed to compute local prediction probabilities: {e}")
        return
    
    # 4. Check if the ML service is running, if not start it
    print("\n4. Checking ML service health...")
    client = httpx.Client(timeout=10.0)
    is_healthy, health_info = check_health(client, base_url)
    if not is_healthy:
        print(f"   ML service health check failed: {health_info}")
        print("   Attempting to start ML service...")
        # We'll try to start the service in the background
        # Note: This is a blocking call, so we'll run it in a separate process?
        # Since we are in a script, we can start it and then wait a bit.
        # We'll use subprocess to start the service without waiting.
        import subprocess
        try:
            # Change to the ml-service directory and start uvicorn
            ml_service_dir = os.path.join(os.path.dirname(__file__), 'artifacts', 'ml-service')
            # We'll use the command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
            # We'll run it in the background and capture the output to a file or pipe.
            # We'll use subprocess.Popen
            proc = subprocess.Popen(
                ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
                cwd=ml_service_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            print(f"   Started ML service with PID {proc.pid}")
            # Wait a few seconds for the service to start
            time.sleep(5)
            # Check health again
            is_healthy, health_info = check_health(client, base_url)
            if is_healthy:
                print(f"   ML service is now healthy: {health_info}")
            else:
                print(f"   ML service health check still failed after start: {health_info}")
                print("   Please check the service logs.")
                # We'll continue anyway and try to predict, but it might fail.
        except Exception as e:
            print(f"   ERROR: Failed to start ML service: {e}")
            return
    else:
        print(f"   ML service is healthy: {health_info}")
    
    # 5. Send the normal and anomalous samples to the prediction endpoint
    print("\n5. Sending samples to ML service prediction endpoint...")
    try:
        # Normal sample
        print("\n   --- Normal Sample ---")
        status_code, response = predict_sample(client, base_url, normal_sample)
        print(f"   HTTP Status: {status_code}")
        print(f"   Response: {response}")
        
        # Anomalous sample
        print("\n   --- Anomalous Sample ---")
        status_code, response = predict_sample(client, base_url, anomalous_sample)
        print(f"   HTTP Status: {status_code}")
        print(f"   Response: {response}")
    except Exception as e:
        print(f"   ERROR: Failed to send prediction request: {e}")
    finally:
        client.close()
    
    print("\n" + "=" * 60)
    print("Validation complete.")
    print("=" * 60)

if __name__ == "__main__":
    main()