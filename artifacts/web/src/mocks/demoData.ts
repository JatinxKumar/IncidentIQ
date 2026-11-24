// Mock data for demo purposes when backend APIs return empty results
// This file is clearly labeled as DEMO DATA

export const DEMO_INCIDENTS = [
  { id: 'INC-1024', title: 'API Gateway Timeout', description: 'Multiple timeout errors detected on the API gateway service affecting user requests', severity: 'critical', status: 'open', service: 'api-gateway', confidence: 0.94, rootCause: 'Connection pool exhaustion', timestamp: '2026-08-04T02:30:45Z', assignee: 'Sarah Chen', metadata: { cpu: 87, memory: 92, disk: 45, network: 230, anomalyScore: 0.94, confidence: 0.91, severity: 'critical' } },
  { id: 'INC-1023', title: 'Database Connection Pool Exhaustion', description: 'PostgreSQL connection pool reached maximum limit causing query failures', severity: 'high', status: 'investigating', service: 'postgres-primary', confidence: 0.88, rootCause: 'Unoptimized queries causing slow connections', timestamp: '2026-08-03T18:15:22Z', assignee: 'Mike Johnson', metadata: { cpu: 65, memory: 78, disk: 52, network: 45, anomalyScore: 0.88, confidence: 0.85, severity: 'high' } },
  { id: 'INC-1022', title: 'Memory Leak in Auth Service', description: 'Gradual memory increase detected in the authentication microservice', severity: 'high', status: 'resolved', service: 'auth-service', confidence: 0.82, rootCause: 'Unclosed event listeners in session handler', timestamp: '2026-08-03T14:22:10Z', assignee: 'Alex Rivera', metadata: { cpu: 42, memory: 95, disk: 30, network: 12, anomalyScore: 0.82, confidence: 0.79, severity: 'high' } },
  { id: 'INC-1021', title: 'Redis Cache Miss Rate Spike', description: 'Cache hit ratio dropped below 60% causing increased database load', severity: 'medium', status: 'acknowledged', service: 'redis-cluster', confidence: 0.76, rootCause: 'Key eviction due to memory pressure', timestamp: '2026-08-03T10:05:33Z', assignee: 'Jordan Lee', metadata: { cpu: 35, memory: 88, disk: 20, network: 8, anomalyScore: 0.76, confidence: 0.72, severity: 'medium' } },
  { id: 'INC-1020', title: 'Kubernetes Pod CrashLoopBackOff', description: 'Payment service pods repeatedly crashing due to OOM kills', severity: 'critical', status: 'resolved', service: 'payment-service', confidence: 0.96, rootCause: 'Memory limit too low for processing batch payments', timestamp: '2026-08-02T22:45:18Z', assignee: 'Sarah Chen', metadata: { cpu: 95, memory: 99, disk: 55, network: 180, anomalyScore: 0.96, confidence: 0.93, severity: 'critical' } },
  { id: 'INC-1019', title: 'SSL Certificate Expiry Warning', description: 'TLS certificate for *.sentinel.io expires in 7 days', severity: 'low', status: 'open', service: 'ingress-controller', confidence: 0.99, rootCause: 'Certificate auto-renewal misconfigured', timestamp: '2026-08-02T08:00:00Z', assignee: 'Mike Johnson', metadata: { cpu: 12, memory: 30, disk: 15, network: 2, anomalyScore: 0.3, confidence: 0.99, severity: 'low' } },
  { id: 'INC-1018', title: 'Disk I/O Latency Spike', description: 'EBS volume latency exceeds 50ms threshold on data processing nodes', severity: 'medium', status: 'resolved', service: 'data-pipeline', confidence: 0.71, rootCause: 'Burst credit depletion on gp2 volumes', timestamp: '2026-08-01T16:30:00Z', assignee: 'Alex Rivera', metadata: { cpu: 55, memory: 60, disk: 92, network: 15, anomalyScore: 0.71, confidence: 0.68, severity: 'medium' } },
  { id: 'INC-1017', title: 'Network Partition Detected', description: 'Intermittent connectivity loss between us-east-1a and us-east-1c availability zones', severity: 'high', status: 'resolved', service: 'vpc-network', confidence: 0.85, rootCause: 'AWS networking infrastructure degradation', timestamp: '2026-08-01T04:12:00Z', assignee: 'Jordan Lee', metadata: { cpu: 20, memory: 40, disk: 25, network: 500, anomalyScore: 0.85, confidence: 0.82, severity: 'high' } },
];

export const DEMO_ANOMALIES = [
  { id: 'ANM-501', title: 'Unusual CPU spike on api-gateway', description: 'CPU usage exceeded 95% for over 10 minutes', severity: 'high', status: 'open', service: 'api-gateway', confidence: 0.92, timestamp: '2026-08-04T03:15:00Z', type: 'resource' },
  { id: 'ANM-500', title: 'Memory consumption pattern change', description: 'Gradual memory increase detected — possible leak', severity: 'medium', status: 'investigating', service: 'auth-service', confidence: 0.84, timestamp: '2026-08-03T20:30:00Z', type: 'pattern' },
  { id: 'ANM-499', title: 'Abnormal network traffic volume', description: '3x normal ingress traffic detected from unusual IP ranges', severity: 'critical', status: 'open', service: 'ingress-controller', confidence: 0.97, timestamp: '2026-08-03T15:45:00Z', type: 'security' },
  { id: 'ANM-498', title: 'Error rate increase on payment API', description: '5xx error rate jumped from 0.1% to 2.3%', severity: 'high', status: 'acknowledged', service: 'payment-service', confidence: 0.89, timestamp: '2026-08-03T11:20:00Z', type: 'error_rate' },
  { id: 'ANM-497', title: 'Latency outlier on database queries', description: 'P99 latency increased to 800ms (normal: 50ms)', severity: 'medium', status: 'resolved', service: 'postgres-primary', confidence: 0.78, timestamp: '2026-08-02T19:00:00Z', type: 'latency' },
  { id: 'ANM-496', title: 'Disk usage growth acceleration', description: 'Storage consumption rate doubled in the last 24 hours', severity: 'low', status: 'resolved', service: 'data-pipeline', confidence: 0.65, timestamp: '2026-08-02T14:30:00Z', type: 'resource' },
];

export const DEMO_MODELS = [
  { id: 'MDL-001', name: 'Random Forest Classifier', version: 'v2.4.1', accuracy: 94.2, precision: 93.1, recall: 95.4, f1Score: 94.2, silhouetteScore: 0.82, status: 'active' as const, isBest: true, lastTrained: '2026-08-03T10:00:00Z', dataPoints: 15420, description: 'Primary anomaly detection model trained on system metrics' },
  { id: 'MDL-002', name: 'XGBoost Ensemble', version: 'v1.8.0', accuracy: 92.8, precision: 91.5, recall: 94.1, f1Score: 92.8, silhouetteScore: 0.79, status: 'active' as const, isBest: false, lastTrained: '2026-08-02T08:00:00Z', dataPoints: 15420, description: 'Gradient boosting model for severity prediction' },
  { id: 'MDL-003', name: 'Isolation Forest', version: 'v3.1.0', accuracy: 89.5, precision: 88.2, recall: 91.0, f1Score: 89.6, silhouetteScore: 0.75, status: 'active' as const, isBest: false, lastTrained: '2026-08-01T12:00:00Z', dataPoints: 12800, description: 'Unsupervised anomaly detector for time-series data' },
  { id: 'MDL-004', name: 'LSTM Autoencoder', version: 'v1.2.3', accuracy: 87.3, precision: 86.0, recall: 88.8, f1Score: 87.4, silhouetteScore: 0.71, status: 'inactive' as const, isBest: false, lastTrained: '2026-07-28T14:00:00Z', dataPoints: 10200, description: 'Deep learning model for sequence anomaly detection' },
  { id: 'MDL-005', name: 'K-Means Clustering', version: 'v2.0.0', accuracy: 85.1, precision: 84.0, recall: 86.5, f1Score: 85.2, silhouetteScore: 0.68, status: 'deprecated' as const, isBest: false, lastTrained: '2026-07-20T09:00:00Z', dataPoints: 8500, description: 'Clustering model for incident categorization' },
];

export const DEMO_REPORTS = [
  { id: 'RPT-101', title: 'Weekly Incident Summary — Week 31', severity: 'info', status: 'completed', generatedAt: '2026-08-04T00:00:00Z', author: 'System', type: 'summary', pages: 12 },
  { id: 'RPT-100', title: 'Critical Incident Post-Mortem — INC-1020', severity: 'critical', status: 'completed', generatedAt: '2026-08-03T10:00:00Z', author: 'Sarah Chen', type: 'post-mortem', pages: 8 },
  { id: 'RPT-099', title: 'Model Performance Analysis — Q3 2026', severity: 'info', status: 'completed', generatedAt: '2026-08-01T00:00:00Z', author: 'System', type: 'analysis', pages: 24 },
  { id: 'RPT-098', title: 'SLA Compliance Report — July 2026', severity: 'medium', status: 'draft', generatedAt: '2026-07-31T23:59:00Z', author: 'System', type: 'compliance', pages: 16 },
  { id: 'RPT-097', title: 'Security Anomaly Investigation', severity: 'high', status: 'in-review', generatedAt: '2026-07-30T15:00:00Z', author: 'Jordan Lee', type: 'investigation', pages: 6 },
];

export const DEMO_REPOSITORIES = [
  { id: 'REPO-001', name: 'sentinel-api-gateway', url: 'https://github.com/sentinel/api-gateway', branch: 'main', status: 'connected' as const, lastScan: '2026-08-04T01:00:00Z', incidentCount: 5, monitoringEnabled: true, language: 'TypeScript' },
  { id: 'REPO-002', name: 'sentinel-auth-service', url: 'https://github.com/sentinel/auth-service', branch: 'main', status: 'connected' as const, lastScan: '2026-08-04T01:00:00Z', incidentCount: 2, monitoringEnabled: true, language: 'Go' },
  { id: 'REPO-003', name: 'sentinel-payment-service', url: 'https://github.com/sentinel/payment-service', branch: 'develop', status: 'connected' as const, lastScan: '2026-08-03T22:00:00Z', incidentCount: 8, monitoringEnabled: true, language: 'Java' },
  { id: 'REPO-004', name: 'sentinel-data-pipeline', url: 'https://github.com/sentinel/data-pipeline', branch: 'main', status: 'disconnected' as const, lastScan: '2026-07-28T12:00:00Z', incidentCount: 3, monitoringEnabled: false, language: 'Python' },
];

export const DEMO_KNOWLEDGE = [
  { id: 'KB-001', title: 'API Gateway Troubleshooting Runbook', category: 'runbook', source: 'Internal', description: 'Step-by-step guide for diagnosing and resolving API gateway issues including timeouts, 5xx errors, and connection pool exhaustion.', updatedAt: '2026-08-02T10:00:00Z', author: 'Sarah Chen', tags: ['api-gateway', 'troubleshooting', 'runbook'] },
  { id: 'KB-002', title: 'Database Incident Response Playbook', category: 'playbook', source: 'Internal', description: 'Standardized response procedures for database-related incidents including connection issues, replication lag, and performance degradation.', updatedAt: '2026-08-01T14:00:00Z', author: 'Mike Johnson', tags: ['database', 'incident-response', 'playbook'] },
  { id: 'KB-003', title: 'Kubernetes Pod Debugging Guide', category: 'documentation', source: 'Confluence', description: 'Comprehensive guide for debugging Kubernetes pod issues including CrashLoopBackOff, OOMKilled, and scheduling failures.', updatedAt: '2026-07-30T09:00:00Z', author: 'Alex Rivera', tags: ['kubernetes', 'debugging', 'pods'] },
  { id: 'KB-004', title: 'Memory Leak Investigation Playbook', category: 'playbook', source: 'Internal', description: 'Procedures for identifying, isolating, and resolving memory leaks in Node.js and JVM-based services.', updatedAt: '2026-07-28T16:00:00Z', author: 'Jordan Lee', tags: ['memory', 'leak', 'investigation'] },
  { id: 'KB-005', title: 'SSL/TLS Certificate Management', category: 'documentation', source: 'Wiki', description: 'Documentation for managing SSL/TLS certificates including auto-renewal setup, monitoring, and emergency rotation procedures.', updatedAt: '2026-07-25T11:00:00Z', author: 'Sarah Chen', tags: ['ssl', 'tls', 'certificates'] },
  { id: 'KB-006', title: 'Network Partition Recovery', category: 'runbook', source: 'Internal', description: 'Recovery procedures for network partition events between availability zones including failover and data reconciliation.', updatedAt: '2026-07-20T08:00:00Z', author: 'Mike Johnson', tags: ['network', 'partition', 'recovery'] },
];

// Chart demo data
export const DEMO_INCIDENT_TREND = [
  { hour: '00:00', incidents: 2, anomalies: 5 },
  { hour: '02:00', incidents: 1, anomalies: 3 },
  { hour: '04:00', incidents: 3, anomalies: 7 },
  { hour: '06:00', incidents: 2, anomalies: 4 },
  { hour: '08:00', incidents: 5, anomalies: 8 },
  { hour: '10:00', incidents: 8, anomalies: 12 },
  { hour: '12:00', incidents: 6, anomalies: 9 },
  { hour: '14:00', incidents: 4, anomalies: 6 },
  { hour: '16:00', incidents: 7, anomalies: 11 },
  { hour: '18:00', incidents: 9, anomalies: 14 },
  { hour: '20:00', incidents: 5, anomalies: 8 },
  { hour: '22:00', incidents: 3, anomalies: 5 },
];

export const DEMO_SEVERITY_DISTRIBUTION = [
  { name: 'Critical', value: 8, color: '#ef4444' },
  { name: 'High', value: 15, color: '#f97316' },
  { name: 'Medium', value: 28, color: '#eab308' },
  { name: 'Low', value: 45, color: '#22c55e' },
];

export const DEMO_INCIDENT_TYPES = [
  { type: 'Resource Exhaustion', count: 18 },
  { type: 'Network Failure', count: 12 },
  { type: 'Database Issue', count: 15 },
  { type: 'Security Alert', count: 8 },
  { type: 'Configuration', count: 6 },
  { type: 'Other', count: 4 },
];

export const DEMO_RECENT_ACTIVITY = [
  { id: '1', action: 'Incident INC-1024 opened', actor: 'ML Detection', time: '5 min ago', type: 'incident' as const },
  { id: '2', action: 'Model MDL-001 retrained — accuracy 94.2%', actor: 'ML Pipeline', time: '1 hour ago', type: 'model' as const },
  { id: '3', action: 'Anomaly ANM-499 escalated to incident', actor: 'Sarah Chen', time: '2 hours ago', type: 'anomaly' as const },
  { id: '4', action: 'Incident INC-1020 resolved', actor: 'Alex Rivera', time: '3 hours ago', type: 'resolved' as const },
  { id: '5', action: 'Repository sentinel-payment-service scanned', actor: 'System', time: '4 hours ago', type: 'scan' as const },
  { id: '6', action: 'Report RPT-101 generated', actor: 'System', time: '6 hours ago', type: 'report' as const },
];

export const DEMO_ANOMALY_TREND = [
  { date: 'Jul 29', resource: 4, pattern: 2, security: 1, error_rate: 3, latency: 2 },
  { date: 'Jul 30', resource: 3, pattern: 3, security: 0, error_rate: 2, latency: 4 },
  { date: 'Jul 31', resource: 5, pattern: 1, security: 2, error_rate: 4, latency: 3 },
  { date: 'Aug 01', resource: 6, pattern: 4, security: 1, error_rate: 3, latency: 5 },
  { date: 'Aug 02', resource: 4, pattern: 2, security: 3, error_rate: 5, latency: 2 },
  { date: 'Aug 03', resource: 7, pattern: 3, security: 2, error_rate: 4, latency: 6 },
  { date: 'Aug 04', resource: 5, pattern: 5, security: 4, error_rate: 3, latency: 3 },
];
