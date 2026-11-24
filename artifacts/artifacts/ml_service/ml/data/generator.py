import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random
import logging

logger = logging.getLogger(__name__)

class SyntheticIncidentGenerator:
    """
    Generates synthetic incident data for ML pipeline training.
    Creates realistic correlations between system metrics.
    """

    def __init__(self, seed: int = 42, num_samples: int = 10000):
        """
        Initialize the generator with a fixed random seed for reproducibility.

        Args:
            seed: Random seed for reproducible results
            num_samples: Number of data points to generate
        """
        self.seed = seed
        self.num_samples = num_samples
        random.seed(self.seed)
        np.random.seed(self.seed)
        logger.info(f"Initialized SyntheticIncidentGenerator with seed={seed}, samples={num_samples}")

    def generate(self) -> pd.DataFrame:
        """
        Generate the complete synthetic dataset with realistic correlations.

        Returns:
            pd.DataFrame: Generated dataset with features and labels
        """
        logger.info("Starting synthetic data generation...")

        # Generate timestamp series
        start_time = datetime.now() - timedelta(days=30)
        timestamps = [
            start_time + timedelta(minutes=i)
            for i in range(self.num_samples)
        ]

        # Generate base feature values with realistic ranges
        base_cpu = np.random.normal(30, 15)  # Mean 30%, std 15%
        base_memory = np.random.normal(45, 20)  # Mean 45%, std 20%
        base_disk = np.random.normal(60, 25)  # Mean 60%, std 25%
        base_latency = np.random.normal(100, 80)  # Mean 100ms, std 80ms
        base_request_rate = np.random.normal(500, 200)  # Mean 500 req/min, std 200
        base_error_rate = np.random.normal(0.02, 0.03)  # Mean 2% error, std 3%
        base_response_time = np.random.normal(200, 150)  # Mean 200ms, std 150ms
        base_db_connections = np.random.normal(20, 10)  # Mean 20 connections, std 10
        base_query_latency = np.random.normal(150, 100)  # Mean 150ms, std 100ms
        base_cache_ratio = np.random.normal(0.85, 0.15)  # Mean 85% hit ratio, std 15%
        base_restart_count = np.random.normal(0, 0.5)  # Mean 0 restarts, std 0.5
        base_deployment = np.random.choice([0, 1], p=[0.95, 0.05])  # 5% deployment events

        # Generate correlated features
        cpu_usage = self._generate_cpu_usage(base_cpu, timestamps)
        memory_usage = self._generate_memory_usage(base_memory, cpu_usage)
        request_rate = self._generate_request_rate(base_request_rate, cpu_usage)
        disk_usage = self._generate_disk_usage(base_disk, cpu_usage, request_rate)
        network_latency = self._generate_network_latency(base_latency, cpu_usage)
        error_rate = self._generate_error_rate(base_error_rate, cpu_usage)
        response_time = self._generate_response_time(base_response_time, cpu_usage)
        http_status = self._generate_http_status(error_rate)
        service_availability = self._generate_service_availability(cpu_usage)
        db_connections = self._generate_db_connections(base_db_connections, cpu_usage)
        query_latency = self._generate_query_latency(base_query_latency, db_connections)
        cache_hit_ratio = self._generate_cache_hit_ratio(base_cache_ratio, cpu_usage)
        restart_count = self._generate_restart_count(base_restart_count, base_deployment, cpu_usage)
        deployment_indicator = base_deployment

        # Generate incident labels based on correlated patterns
        incident_type, severity, anomaly = self._generate_labels(
            cpu_usage, memory_usage, disk_usage, network_latency,
            request_rate, error_rate, response_time, db_connections,
            restart_count, query_latency
        )

        # Create DataFrame
        data = {
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
            'incident_type': incident_type,
            'severity': severity,
            'anomaly': anomaly
        }

        df = pd.DataFrame(data)
        logger.info(f"Generated dataset with shape: {df.shape}")
        logger.info(f"Dataset statistics:\n{df.describe()}")

        return df

    def _generate_cpu_usage(self, base_value: float, timestamps: list) -> np.ndarray:
        """Generate CPU usage with realistic diurnal patterns and anomalies."""
        hours = np.array([t.hour for t in timestamps])  # Convert to numpy array
        diurnal_factor = np.where(
            (hours >= 9) & (hours <= 17),
            1.2,  # 20% higher during business hours
            1.0
        )
        trend = np.linspace(0, 10, len(timestamps))
        cpu = np.random.normal(base_value, 15) + trend * 0.1
        cpu = np.clip(cpu * diurnal_factor + np.random.normal(0, 5, len(timestamps)), 0, 100)
        overload_mask = (cpu > 80) & (np.random.random(len(timestamps)) < 0.1)
        cpu[overload_mask] += np.random.normal(20, 5, np.sum(overload_mask))
        cpu = np.clip(cpu, 0, 100)
        return cpu

    def _generate_memory_usage(self, base_value: float, cpu_usage: np.ndarray) -> np.ndarray:
        """Generate memory usage correlated with CPU usage."""
        memory = cpu_usage * 1.5 + np.random.normal(0, 10, len(cpu_usage))
        memory = np.clip(memory, 0, 100)
        return memory

    def _generate_disk_usage(self, base_value: float, cpu_usage: np.ndarray, request_rate: np.ndarray) -> np.ndarray:
        """Generate disk usage with write/read patterns."""
        disk = cpu_usage * 0.8 + request_rate * 0.002 + np.random.normal(0, 15, len(cpu_usage))
        disk = np.clip(disk, 0, 100)
        return disk

    def _generate_network_latency(self, base_value: float, cpu_usage: np.ndarray) -> np.ndarray:
        """Generate network latency correlated with CPU and request patterns."""
        network = base_value * (1 + cpu_usage * 0.01) + np.random.normal(0, 20, len(cpu_usage))
        network = np.clip(network, 0, None)
        return network

    def _generate_request_rate(self, base_value: float, cpu_usage: np.ndarray) -> np.ndarray:
        """Generate request rate with diurnal patterns and spikes."""
        base_request = base_value * np.random.uniform(0.8, 1.2, len(cpu_usage))
        spike_mask = cpu_usage > 75
        if np.any(spike_mask):
            spike_multiplier = np.random.uniform(2.0, 3.5, np.sum(spike_mask))
            base_request[spike_mask] *= spike_multiplier
        variation = np.random.normal(0, base_request * 0.1, len(base_request))
        request_rate = base_request + variation
        request_rate = np.clip(request_rate, 0, None)
        return request_rate

    def _generate_error_rate(self, base_value: float, cpu_usage: np.ndarray) -> np.ndarray:
        """Generate error rate correlated with CPU and request patterns."""
        error = base_value + cpu_usage * 0.05 + np.random.normal(0, 0.01, len(cpu_usage))
        error = np.clip(error, 0, 0.5)  # Cap at 50% error rate
        return error

    def _generate_response_time(self, base_value: float, cpu_usage: np.ndarray) -> np.ndarray:
        """Generate response time correlated with CPU and request patterns."""
        response = base_value * (1 + cpu_usage * 0.01) + np.random.normal(0, 50, len(cpu_usage))
        return response

    def _generate_http_status(self, error_rate: np.ndarray) -> np.ndarray:
        """Generate HTTP status codes based on error rates."""
        status = np.full(len(error_rate), 200, dtype=int)
        error_mask = error_rate > 0.05
        status[error_mask] = np.random.choice([400, 500], size=np.sum(error_mask), p=[0.7, 0.3])
        return status

    def _generate_service_availability(self, cpu_usage: np.ndarray) -> np.ndarray:
        """Generate service availability correlated with CPU usage."""
        availability = 1.0 - (cpu_usage / 100) * 0.3
        availability = np.clip(availability, 0.5, 1.0)
        failure_mask = (np.random.random(len(cpu_usage)) < 0.02) & (cpu_usage > 60)
        availability[failure_mask] = 0.0
        return (availability * 100).astype(int)  # Convert to percentage

    def _generate_db_connections(self, base_value: float, cpu_usage: np.ndarray) -> np.ndarray:
        """Generate database connection count correlated with load."""
        connections = base_value + cpu_usage * 0.2 + np.random.normal(0, 5, len(cpu_usage))
        connections = np.clip(connections, 0, None)
        return connections

    def _generate_query_latency(self, base_value: float, db_connections: np.ndarray) -> np.ndarray:
        """Generate database query latency correlated with connection count."""
        latency = base_value + db_connections * 0.1 + np.random.normal(0, 50, len(db_connections))
        return latency

    def _generate_cache_hit_ratio(self, base_value: float, cpu_usage: np.ndarray) -> np.ndarray:
        """Generate cache hit ratio inversely correlated with CPU usage."""
        cache_ratio = base_value - cpu_usage * 0.005
        cache_ratio = np.clip(cache_ratio, 0.5, 1.0)  # Fixed: was using cpu_usage instead of cache_ratio
        return cache_ratio

    def _generate_restart_count(self, base_value: float, deployment_indicator: int, cpu_usage: np.ndarray) -> np.ndarray:
        """Generate restart count based on deployment events."""
        restarts = np.full(len(cpu_usage), base_value, dtype=float)
        restart_events = deployment_indicator == 1
        if np.any(restart_events):
            restart_multiplier = np.random.uniform(10, 50, np.sum(restart_events))
            restarts[restart_events] += restart_multiplier
        return restarts.astype(int)

    def _generate_labels(self, cpu_usage: np.ndarray, memory_usage: np.ndarray,
                         disk_usage: np.ndarray, network_latency: np.ndarray,
                         request_rate: np.ndarray, error_rate: np.ndarray,
                         response_time: np.ndarray, db_connections: np.ndarray,
                         restart_count: np.ndarray, query_latency: np.ndarray) -> tuple:
        """
        Generate incident labels based on correlated feature patterns.

        Returns:
            tuple: (incident_type, severity, anomaly) arrays
        """
        incident_type = np.full(len(cpu_usage), 'normal', dtype=str)
        severity = np.full(len(cpu_usage), 'low', dtype=str)
        anomaly = np.zeros(len(cpu_usage), dtype=int)

        resource_exhaustion_mask = (
            (cpu_usage > 60) & (memory_usage > 65) & (disk_usage > 70)
        )
        database_failure_mask = (
            (db_connections > 50) & (query_latency > 150)
        )
        network_failure_mask = (
            (network_latency > 100) & (error_rate > 0.01)
        )
        service_crash_mask = (
            (restart_count > 1) & (cpu_usage > 70)
        )
        high_error_mask = error_rate > 0.05
        traffic_spike_mask = request_rate > 600
        cascading_failure_mask = (
            (cpu_usage > 65) & (response_time > 300) & (error_rate > 0.05)
        )

        incident_type[resource_exhaustion_mask] = 'resource_exhaustion'
        incident_type[database_failure_mask] = 'database_failure'
        incident_type[network_failure_mask] = 'network_failure'
        incident_type[service_crash_mask] = 'service_crash'
        incident_type[high_error_mask] = 'high_error_rate'
        incident_type[traffic_spike_mask] = 'traffic_spike'
        incident_type[cascading_failure_mask] = 'cascading_failure'

        severity[incident_type == 'resource_exhaustion'] = 'medium'
        severity[incident_type == 'database_failure'] = 'high'
        severity[incident_type == 'network_failure'] = 'high'
        severity[incident_type == 'service_crash'] = 'critical'
        severity[incident_type == 'high_error_rate'] = 'high'
        severity[incident_type == 'traffic_spike'] = 'medium'
        severity[incident_type == 'cascading_failure'] = 'critical'
        severity[incident_type == 'normal'] = 'low'

        anomaly[resource_exhaustion_mask] = 1
        anomaly[database_failure_mask] = 1
        anomaly[network_failure_mask] = 1
        anomaly[service_crash_mask] = 1
        anomaly[high_error_mask] = 1
        anomaly[traffic_spike_mask] = 1
        anomaly[cascading_failure_mask] = 1

        return incident_type, severity, anomaly