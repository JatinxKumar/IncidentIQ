#!/usr/bin/env python3
"""
Script to validate the ML inference pipeline:

1. Starts the FastAPI service (uvicorn) for the trained model.
2. Waits for the service to become healthy.
3. Loads the trained model and preprocessing pipeline.
4. Generates one normal and one anomalous telemetry sample using the
   SyntheticIncidentGenerator and DataPipeline.
5. Sends each sample to the /ml/api/v1/predict endpoint.
6. Prints the raw HTTP request/response for both cases.
7. Prints model predict_proba outputs and the predicted class.
8. Cleans up by terminating the FastAPI process.

The script is intended to be run from the repository root.
"""

import os
import json
import time
import subprocess
import signal
import requests
import joblib
import pandas as pd
from pathlib import Path

# ----------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------
# Base URL of the FastAPI service (changed if needed)
API_BASE_URL = "http://127.0.0.1:8000"
PREDICT_ENDPOINT = f"{API_BASE_URL}/ml/api/v1/predict"

# Path to the FastAPI application entrypoint
FASTAPI_APP_MODULE = "artifacts.ml_service.main:app"

# Port on which the FastAPI service will run
FASTAPI_PORT = 8000

# Path to the trained model artifact
MODEL_PATH = Path("artifacts/ml_service/ml/models/incident_model.joblib")

# Path to the preprocessing pipeline class
PIPELINE_MODULE = "artifacts.ml_service.ml.preprocessing.pipeline.DataPipeline"

# Number of samples to generate for validation
NUM_SAMPLES = 1

# ----------------------------------------------------------------------
# Helper Functions
# ----------------------------------------------------------------------
def start_fastapi_server():
    """Start the FastAPI server in a subprocess."""
    cmd = [
        "uvicorn",
        FASTAPI_APP_MODULE,
        f"--host", "0.0.0.0",
        f"--port", str(FASTAPI_PORT),
    ]
    print(f"[INFO] Starting FastAPI server: {' '.join(cmd)}")
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    # Give the server a moment to start
    time.sleep(5)
    return process


def is_server_up():
    """Check if the FastAPI health endpoint is reachable."""
    health_url = f"{API_BASE_URL}/ml/healthz"
    try:
        resp = requests.get(health_url, timeout=5)
        return resp.status_code == 200
    except Exception:
        return False


def load_model():
    """Load the serialized model from disk."""
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
    print(f"[INFO] Loading model from {MODEL_PATH}")
    return joblib.load(MODEL_PATH)


def load_pipeline():
    """Import and instantiate the data pipeline."""
    # Import dynamically to respect the package structure
    import importlib
    mod = importlib.import_module(PIPELINE_MODULE.split(".")[0])
    PipelineClass = getattr(mod, "DataPipeline")
    return PipelineClass()


def generate_samples(pipeline, generator):
    """
    Generate one normal and one anomalous sample using the pipeline
    and generator, returning two dictionaries ready for JSON serialization.
    """
    # Generate raw telemetry data
    raw_df = generator.generate()
    # Apply the full pipeline to obtain processed features
    train_df, test_df = pipeline.run_pipeline()
    # Use the first row of the test split as a representative sample
    sample_row = test_df.iloc[0]

    # Convert the sample to a plain dict (JSON-serializable)
    normal_payload = sample_row.to_dict()

    # Create an anomalous sample by artificially inflating one feature
    # (choose a feature that is likely to be indicative of an anomaly)
    anomalous_payload = normal_payload.copy()
    # Example: set CPU usage to an extreme value that should be flagged as anomaly
    anomalous_payload["cpu_usage"] = 100.0  # unrealistic high CPU usage

    return normal_payload, anomalous_payload


def send_prediction_request(payload):
    """Send a POST request to the prediction endpoint and return the response."""
    url = PREDICT_ENDPOINT
    headers = {"Content-Type": "application/json"}
    print(f"\n=== Sending POST request to {url} ===")
    print("Request payload:")
    print(json.dumps(payload, indent=2))
    try:
        response = requests.post(url, json=payload, timeout=10)
        print(f"Response status: {response.status_code}")
        print("Response body:")
        print(response.text)
        return response
    except requests.RequestException as e:
        print(f"Request failed: {e}")
        return None


def analyze_response(response, model, sample_id, payload):
    """
    Extract and display model prediction details from the API response.
    The expected response format is:
    {
        "prediction": <int>,
        "probabilities": [<prob_class_0>, <prob_class_1>]
    }
    """
    if response is None:
        print(f"[{sample_id}] No response to analyze.")
        return

    try:
        data = response.json()
        pred = data.get("prediction")
        probs = data.get("probabilities", [])
        print(f"[{sample_id}] Predicted class: {pred}")
        print(f"[{sample_id}] Predicted probabilities: {probs}")
        # Also show the raw model predict_proba for comparison
        if isinstance(model, object) and hasattr(model, "predict_proba"):
            # Convert payload to DataFrame for model inference
            df = pd.DataFrame([list(payload.values())], columns=list(payload.keys()))
            model_probs = model.predict_proba(df)[0]
            print(f"[{sample_id}] Model predict_proba (class 0, class 1): {model_probs}")
    except Exception as e:
        print(f"[{sample_id}] Failed to parse JSON response: {e}")


# ----------------------------------------------------------------------
# Main Execution Flow
# ----------------------------------------------------------------------
def main():
    # 1. Start FastAPI server
    server_process = start_fastapi_server()

    # Wait until the service reports healthy
    print("[INFO] Waiting for FastAPI health check...")
    timeout = 30  # seconds
    start_time = time.time()
    while not is_server_up():
        if time.time() - start_time > timeout:
            print("[ERROR] Server did not become healthy within timeout.")
            server_process.terminate()
            server_process.wait()
            return
        time.sleep(1)
    print("[INFO] FastAPI service is healthy.")

    # 2. Load model and pipeline
    try:
        model = load_model()
        pipeline = load_pipeline()
    except Exception as e:
        print(f"[ERROR] Failed to load model/pipeline: {e}")
        server_process.terminate()
        server_process.wait()
        return

    # 3. Generate normal and anomalous samples
    try:
        normal_payload, anomalous_payload = generate_samples(pipeline, None)
    except Exception as e:
        print(f"[ERROR] Failed to generate samples: {e}")
        server_process.terminate()
        server_process.wait()
        return

    # 4. Send prediction requests
    print("\n=== Sending Normal Sample ===")
    resp_normal = send_prediction_request(normal_payload)
    analyze_response(resp_normal, model, "NORMAL", normal_payload)

    print("\n=== Sending Anomalous Sample ===")
    resp_anomalous = send_prediction_request(anomalous_payload)
    analyze_response(resp_anomalous, model, "ANOMALOUS", anomalous_payload)

    # 5. Clean up
    print("\n[INFO] Shutting down FastAPI server...")
    server_process.send_signal(signal.SIGINT)
    server_process.wait(timeout=5)
    if server_process.poll() is None:
        server_process.terminate()
    print("[INFO] Server stopped.")


if __name__ == "__main__":
    # Ensure the project root is on PYTHONPATH so imports work
    import sys
    import pathlib

    PROJECT_ROOT = pathlib.Path(__file__).parent.parent
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))

    main()