import joblib
import os
import sys

# Use absolute path from workspace root
workspace_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
model_path = os.path.join(workspace_root, 'artifacts', 'artifacts', 'ml_service', 'artifacts', 'ml-service', 'ml', 'models', 'incident_model.joblib')
metrics_path = os.path.join(workspace_root, 'artifacts', 'artifacts', 'ml_service', 'artifacts', 'ml-service', 'ml', 'models', 'metrics.json')
print('Model path:', model_path)
print('Model path exists:', os.path.exists(model_path))
print('File size:', os.path.getsize(model_path) if os.path.exists(model_path) else 'N/A')

try:
    model = joblib.load(model_path)
    print('Model keys:', list(model.keys()))
    print('Feature names:', model.get('feature_names'))
    print('Target name:', model.get('target_name'))
    print('Class names:', model.get('class_names'))
    print('Model type:', type(model.get('model')))
    print('Model loaded successfully')
except Exception as e:
    print(f'Error loading model: {e}')
    sys.exit(1)

# Test prediction with sample data
import numpy as np
import pandas as pd

FEATURES = ['cpu_usage', 'memory_usage', 'disk_usage', 'network_latency',
             'request_rate', 'error_rate', 'response_time', 'http_status',
             'service_availability', 'db_connections', 'query_latency',
             'cache_hit_ratio', 'restart_count', 'deployment_indicator']

# Create a sample telemetry point
sample_data = {
    'cpu_usage': [55.0],
    'memory_usage': [60.0],
    'disk_usage': [70.0],
    'network_latency': [120.0],
    'request_rate': [520.0],
    'error_rate': [0.03],
    'response_time': [210.0],
    'http_status': [200],
    'service_availability': [95],
    'db_connections': [25.0],
    'query_latency': [160.0],
    'cache_hit_ratio': [0.82],
    'restart_count': [0],
    'deployment_indicator': [0]
}

df = pd.DataFrame(sample_data)
features_df = df[FEATURES]

predictions = model['model'].predict(features_df)
probabilities = model['model'].predict_proba(features_df)

print('\nPrediction result:', predictions[0])
print('Probabilities:', probabilities[0])
print('\nAll checks passed!')
