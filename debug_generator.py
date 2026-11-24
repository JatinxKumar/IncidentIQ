import sys
sys.path.insert(0, 'artifacts/ml-service')
from ml.data.generator import SyntheticIncidentGenerator
import numpy as np

gen = SyntheticIncidentGenerator(seed=42, num_samples=10000)
df = gen.generate()
print("Anomaly distribution:")
print(df['anomaly'].value_counts())
print("\nPercentage anomaly:", df['anomaly'].mean()*100)
print("\nFeature means:")
for col in ['cpu_usage', 'memory_usage', 'disk_usage', 'network_latency', 'request_rate', 'error_rate', 'response_time', 'db_connections', 'query_latency', 'cache_hit_ratio', 'restart_count']:
    print(f"{col}: {df[col].mean():.2f}")