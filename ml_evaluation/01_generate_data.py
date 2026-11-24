"""
SentinelAI ML Evaluation - Synthetic Telemetry Dataset Generator

This script generates a synthetic telemetry dataset for SentinelAI ML evaluation.
The dataset simulates system metrics with realistic patterns and anomalies.

Features:
- CPU usage (0-100%)
- Memory usage (0-100%)
- Disk usage (0-100%)
- Network latency (0-1000 ms)
- Request rate (0-1000 req/sec)
- Error rate (0-1.0)
- Response time (0-5000 ms)
- HTTP status (200-599)
- Service availability (0-100%)
- Database connections (0-100)
- Query latency (0-1000 ms)
- Cache hit ratio (0-1)
- Restart count (0-10)
- Deployment indicator (0/1)
- Telemetry source ("sentinelai")

Anomalies are generated based on realistic system failure patterns.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import json
import os
from typing import Dict, List, Tuple

# Set random seed for reproducibility
np.random.seed(42)

def generate_normal_pattern(length: int, mean: float, std: float, trend: float = 0.0) -> np.ndarray:
    """Generate normal pattern with optional trend."""
    data = np.random.normal(mean, std, length)
    if trend != 0.0:
        trend_data = np.linspace(0, trend * length, length)
        data += trend_data
    return np.clip(data, 0, None)

def generate_anomaly_pattern(length: int, base_mean: float, anomaly_amplitude: float) -> np.ndarray:
    """Generate data with periodic anomalies."""
    data = np.full(length, base_mean)
    
    # Add periodic anomalies (every 50-100 points)
    for i in range(0, length, np.random.randint(50, 100)):
        end_idx = min(i + np.random.randint(5, 15), length)
        anomaly_strength = np.random.uniform(1.5, 3.0)
        data[i:end_idx] = base_mean * anomaly_strength
    
    # Add occasional spikes
    spike_indices = np.random.choice(length, size=int(length * 0.05), replace=False)
    data[spike_indices] *= np.random.uniform(2.0, 5.0)
    
    return np.clip(data, 0, None)

def generate_telemetry_dataset(num_samples: int = 10000) -> pd.DataFrame:
    """Generate synthetic telemetry dataset with anomalies."""
    print(f"Generating {num_samples} telemetry samples...")
    
    # Base timestamps
    start_time = datetime(2024, 1, 1, 0, 0, 0)
    timestamps = [start_time + timedelta(seconds=i * 10) for i in range(num_samples)]
    
    # Generate features with realistic patterns
    cpu_usage = generate_normal_pattern(num_samples, 45.0, 15.0, trend=0.01)
    memory_usage = generate_normal_pattern(num_samples, 60.0, 20.0, trend=0.005)
    disk_usage = generate_normal_pattern(num_samples, 70.0, 10.0)
    network_latency = generate_normal_pattern(num_samples, 150.0, 100.0)
    request_rate = generate_normal_pattern(num_samples, 200.0, 50.0)
    error_rate = generate_normal_pattern(num_samples, 0.05, 0.02)
    response_time = generate_normal_pattern(num_samples, 500.0, 200.0)
    http_status = np.random.choice([200, 201, 404, 500, 503], size=num_samples, p=[0.7, 0.1, 0.1, 0.05, 0.05])
    service_availability = generate_normal_pattern(num_samples, 99.0, 2.0)
    db_connections = generate_normal_pattern(num_samples, 50.0, 15.0)
    query_latency = generate_normal_pattern(num_samples, 100.0, 50.0)
    cache_hit_ratio = generate_normal_pattern(num_samples, 0.85, 0.05)
    restart_count = np.random.poisson(0.5, num_samples).astype(int)
    deployment_indicator = np.random.choice([0, 1], size=num_samples, p=[0.95, 0.05])
    
    # Add anomalies to some features
    cpu_usage = generate_anomaly_pattern(num_samples, 45.0, 2.0)
    memory_usage = generate_anomaly_pattern(num_samples, 60.0, 1.8)
    error_rate = generate_anomaly_pattern(num_samples, 0.05, 3.0)
    response_time = generate_anomaly_pattern(num_samples, 500.0, 2.5)
    http_status = np.where(np.random.random(num_samples) < 0.02, 500, http_status)  # 2% 500 errors
    service_availability = generate_anomaly_pattern(num_samples, 99.0, 5.0)
    
    # Create DataFrame
    df = pd.DataFrame({
        'timestamp': timestamps,
        'cpu_usage': cpu_usage,
        'memory_usage': memory_usage,
        'disk_usage': disk_usage,
        'network_latency': network_latency,
        'request_rate': request_rate,
        'error_rate': error_rate,
        'response_time': response_time,
        'http_status': http_status,
        'service_availability': service_availability,
        'db_connections': db_connections,
        'query_latency': query_latency,
        'cache_hit_ratio': cache_hit_ratio,
        'restart_count': restart_count,
        'deployment_indicator': deployment_indicator,
        'telemetry_source': 'sentinelai'
    })
    
    # Add anomaly label (1 = anomaly, 0 = normal)
    # Anomalies are defined as having any of these conditions:
    # - CPU > 80% or < 20%
    # - Memory > 90% or < 30%
    # - Error rate > 0.2
    # - Response time > 2000 ms
    # - Service availability < 95%
    # - HTTP status >= 500
    anomaly_conditions = (
        (df['cpu_usage'] > 80) | (df['cpu_usage'] < 20) |
        (df['memory_usage'] > 90) | (df['memory_usage'] < 30) |
        (df['error_rate'] > 0.2) |
        (df['response_time'] > 2000) |
        (df['service_availability'] < 95) |
        (df['http_status'] >= 500)
    )
    df['anomaly'] = anomaly_conditions.astype(int)
    
    # Add repository_id for realistic multi-repository scenario
    df['repository_id'] = np.random.choice(['repo-1', 'repo-2', 'repo-3', 'repo-4'], size=num_samples)
    
    # Add session_id to group related requests
    df['session_id'] = np.random.choice([f'session-{i:04d}' for i in range(100)], size=num_samples)
    
    print(f"Dataset generated: {len(df)} samples")
    print(f"Anomaly rate: {df['anomaly'].mean():.2%}")
    print(f"Repositories: {df['repository_id'].nunique()}")
    print(f"Features: {list(df.columns)}")
    
    return df

def save_dataset(df: pd.DataFrame, output_path: str = 'ml_evaluation/synthetic_telemetry.csv'):
    """Save dataset to CSV file."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Dataset saved to {output_path}")
    
    # Save metadata
    metadata = {
        'num_samples': len(df),
        'num_features': len(df.columns) - 4,  # timestamp, anomaly, repository_id, session_id
        'anomaly_rate': float(df['anomaly'].mean()),
        'feature_names': list(df.columns[4:-4]),  # exclude timestamp, anomaly, repo_id, session_id
        'generated_at': datetime.now().isoformat(),
        'description': 'Synthetic telemetry dataset for SentinelAI ML evaluation'
    }
    
    metadata_path = output_path.replace('.csv', '_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved to {metadata_path}")

def main():
    """Main function to generate and save dataset."""
    print("=" * 60)
    print("SentinelAI ML Evaluation - Synthetic Telemetry Generator")
    print("=" * 60)
    
    # Generate dataset
    df = generate_telemetry_dataset(num_samples=10000)
    
    # Save dataset
    output_path = 'ml_evaluation/synthetic_telemetry.csv'
    save_dataset(df, output_path)
    
    print("\nDataset generation completed successfully!")
    print(f"\nSample statistics:")
    print(f"  - Total samples: {len(df):,}")
    print(f"  - Anomaly samples: {df['anomaly'].sum():,} ({df['anomaly'].mean():.2%})")
    print(f"  - Normal samples: {len(df) - df['anomaly'].sum():,}")
    print(f"  - Features: {len(df.columns)}")
    
    # Show some sample data
    print(f"\nSample data (first 5 rows):")
    print(df.head().to_string(index=False))

if __name__ == "__main__":
    main()