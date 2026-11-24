#!/usr/bin/env python
import os
import sys
os.environ['DEBUG'] = 'False'
os.environ['DATABASE_URL'] = 'postgresql://user:password@localhost:5432/incidentiq'

# Add ml_service to path so we can import main
ml_service_dir = os.path.join(os.path.dirname(__file__), 'artifacts', 'artifacts', 'ml_service')
if ml_service_dir not in sys.path:
    sys.path.insert(0, ml_service_dir)

print("Step 1: Importing app...")
from main import app
print("Step 2: Creating TestClient...")
from fastapi.testclient import TestClient
client = TestClient(app)
print("Step 3: Testing GET /api/v1/models/info...")
try:
    r = client.get('/api/v1/models/info')
    print(f"  Status: {r.status_code}")
    print(f"  Body: {r.json()}")
except Exception as e:
    print(f"  ERROR: {type(e).__name__}: {e}")

print("Step 4: Testing POST /api/v1/predict...")
try:
    payload = {
        'cpu_usage': 95.0,
        'memory_usage': 85.0,
        'disk_usage': 70.0,
        'network_latency': 50.0,
        'request_rate': 1000.0,
        'error_rate': 5.0,
        'response_time': 2000.0,
        'http_status': 500,
        'service_availability': 0.9,
        'db_connections': 200.0,
        'query_latency': 500.0,
        'cache_hit_ratio': 0.6,
        'restart_count': 3,
        'deployment_indicator': 1
    }
    r = client.post('/api/v1/predict', json=payload)
    print(f"  Status: {r.status_code}")
    print(f"  Body: {r.json()}")
except Exception as e:
    print(f"  ERROR: {type(e).__name__}: {e}")

print("Done.")
