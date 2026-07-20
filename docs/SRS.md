# Software Requirements Specification (SRS)
## SentinelAI — AI-Based Incident Detection and Root Cause Analysis Platform

**Version:** 1.0  
**Date:** July 20, 2026  
**Classification:** Final Year Project — Production-Grade Reference Implementation  
**Authors:** Principal Engineering Team  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Product Vision & Scope](#2-product-vision--scope)
3. [Stakeholders & User Roles](#3-stakeholders--user-roles)
4. [System Architecture Overview](#4-system-architecture-overview)
5. [Functional Requirements](#5-functional-requirements)
6. [AI/ML Module Specifications](#6-aiml-module-specifications)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Data Requirements](#8-data-requirements)
9. [API Contract Summary](#9-api-contract-summary)
10. [UI/UX Module Breakdown](#10-uiux-module-breakdown)
11. [Database Schema Design](#11-database-schema-design)
12. [Integration Points](#12-integration-points)
13. [Security Requirements](#13-security-requirements)
14. [Deployment Architecture](#14-deployment-architecture)
15. [ML Syllabus Coverage Matrix](#15-ml-syllabus-coverage-matrix)
16. [Glossary](#16-glossary)

---

## 1. Introduction

### 1.1 Purpose

This document defines the complete functional and non-functional requirements for **SentinelAI**, an enterprise-grade SaaS platform that ingests system telemetry data (logs, metrics, traces), detects anomalies and incidents using machine learning models, performs root cause analysis, and provides actionable intelligence through a real-time dashboard.

### 1.2 Project Background

Modern distributed systems (microservices, Kubernetes clusters, cloud infrastructure) generate terabytes of telemetry data per day. Traditional rule-based alerting produces excessive false positives and cannot perform automated root cause analysis. SentinelAI replaces brittle threshold-based rules with learned behavioral models, reducing mean time to detect (MTTD) and mean time to resolve (MTTR) incidents.

### 1.3 Document Conventions

| Term | Meaning |
|------|---------|
| SHALL | Mandatory requirement |
| SHOULD | Recommended but not mandatory |
| MAY | Optional |
| ML | Machine Learning |
| RCA | Root Cause Analysis |
| SLO | Service Level Objective |

### 1.4 Intended Audience

- Software engineers implementing the platform
- Product managers reviewing feature completeness
- Academic evaluators assessing ML syllabus coverage
- DevOps engineers planning deployment

---

## 2. Product Vision & Scope

### 2.1 Vision Statement

> "Give every engineering team a 24/7 AI-powered SRE that never misses an anomaly, always explains its reasoning, and continuously learns from your feedback."

### 2.2 Core Value Propositions

| Problem (Status Quo) | SentinelAI Solution |
|----------------------|---------------------|
| Alert storms from threshold rules | ML-based anomaly detection with dynamic baselines |
| Manual log triage taking hours | Automated RCA with contributing factor ranking |
| No context between incidents | Cross-incident correlation and knowledge base |
| Black-box predictions | Explainable AI (SHAP / decision paths) |
| Static dashboards | Natural language query interface (Generative AI) |

### 2.3 In Scope

- Real-time metric ingestion pipeline
- Log ingestion and structured parsing
- Anomaly detection using multiple ML algorithms
- Root cause analysis engine
- Incident lifecycle management
- ML model training, evaluation, and versioning
- Interactive analytics dashboard
- Generative AI assistant for natural language incident querying
- Multi-tenant workspace support
- REST API for external integrations

### 2.4 Out of Scope (v1.0)

- Mobile native applications
- On-premise self-hosted deployment automation
- Integration with proprietary APM tools (Datadog, New Relic) in v1.0
- Real-time voice alerting

---

## 3. Stakeholders & User Roles

### 3.1 User Personas

#### 3.1.1 SRE / Platform Engineer (Primary User)
- Monitors system health across multiple services
- Investigates active incidents
- Reviews ML model performance
- Configures detection thresholds and policies

#### 3.1.2 Engineering Manager
- Reviews incident summaries and trends
- Tracks MTTD/MTTR KPIs
- Generates post-mortem reports

#### 3.1.3 Data / ML Engineer
- Manages training datasets
- Triggers model retraining
- Evaluates model performance metrics (Precision, Recall, F1, Confusion Matrix)
- Compares algorithm variants

#### 3.1.4 System Administrator
- Manages users and workspaces
- Configures data sources and integrations
- Reviews audit logs

### 3.2 Role-Permission Matrix

| Permission | Admin | SRE | Manager | ML Engineer |
|------------|-------|-----|---------|-------------|
| View Dashboard | ✓ | ✓ | ✓ | ✓ |
| Manage Incidents | ✓ | ✓ | Read | Read |
| Configure Data Sources | ✓ | ✓ | — | — |
| Trigger Model Training | ✓ | — | — | ✓ |
| View Model Metrics | ✓ | ✓ | ✓ | ✓ |
| Manage Users | ✓ | — | — | — |
| Use AI Assistant | ✓ | ✓ | ✓ | ✓ |
| Export Data | ✓ | ✓ | ✓ | ✓ |

---

## 4. System Architecture Overview

### 4.1 Architectural Style

SentinelAI follows a **Clean Architecture** (Hexagonal/Ports-and-Adapters) pattern layered as:

```
┌─────────────────────────────────────────────────┐
│                  Presentation Layer              │  React + Vite SPA
│           (Dashboard, API Routes, CLI)           │
├─────────────────────────────────────────────────┤
│                 Application Layer                │  Use Cases / Services
│    (IncidentService, MLPipelineService, etc.)    │
├─────────────────────────────────────────────────┤
│                  Domain Layer                    │  Entities, Value Objects
│      (Incident, Anomaly, Model, Alert)           │
├─────────────────────────────────────────────────┤
│               Infrastructure Layer              │  DB, ML Runtime, Queues
│     (PostgreSQL, Python ML Workers, Redis)       │
└─────────────────────────────────────────────────┘
```

### 4.2 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 18 + Vite + TypeScript | Fast, type-safe, component-driven |
| Backend API | Node.js + Express 5 + TypeScript | Unified language, non-blocking I/O |
| ML Engine | Python 3.11 + scikit-learn + FastAPI | Industry-standard ML stack |
| Database | PostgreSQL 16 + Drizzle ORM | ACID compliance, JSONB for telemetry |
| Cache / Queues | Redis 7 | Fast anomaly state, job queues |
| Validation | Zod v4 | Runtime type safety on API boundaries |
| API Contract | OpenAPI 3.1 | Contract-first development |
| Auth | JWT + bcrypt | Stateless, scalable sessions |

### 4.3 Service Topology

```
Browser
  │
  ▼
[Reverse Proxy / API Gateway]
  ├──► [React Frontend SPA]          ← Vite dev server
  ├──► [Node.js REST API]            ← Express 5
  │        ├──► PostgreSQL           ← Primary datastore
  │        ├──► Redis                ← Anomaly state, job queue
  │        └──► [ML Service]         ← Python FastAPI (internal only)
  │                ├──► Model Store  ← Versioned .pkl / .joblib files
  │                └──► Training DB  ← Feature-engineered datasets
  └──► [Ingestion Workers]           ← Node.js streams (metrics/logs)
```

### 4.4 Data Flow

```
Raw Telemetry (metrics, logs, traces)
    │
    ▼
[Ingestion Layer]  ──► Normalization ──► Feature Extraction
    │
    ▼
[Anomaly Detection Pipeline]
    ├── Real-time scoring (loaded model)
    └── Batch retraining (nightly job)
    │
    ▼
[Incident Engine]  ──► Severity Scoring ──► RCA Engine
    │
    ▼
[Alert + Notification]  ──► Dashboard ──► AI Assistant
```

---

## 5. Functional Requirements

### 5.1 Module: Data Ingestion (ING)

| ID | Requirement |
|----|------------|
| ING-01 | The system SHALL accept metric data via a REST API endpoint (`POST /api/ingest/metrics`) in JSON format |
| ING-02 | The system SHALL accept structured log data via `POST /api/ingest/logs` |
| ING-03 | The system SHALL parse and normalize incoming data into canonical schema within 500ms |
| ING-04 | The system SHALL reject malformed payloads with HTTP 422 and structured error details |
| ING-05 | The system SHALL support batch ingestion of up to 1,000 data points per request |
| ING-06 | The system SHALL record raw ingestion events with timestamps for audit purposes |
| ING-07 | The system SHALL simulate realistic telemetry data generation for demo/testing purposes |

### 5.2 Module: Data Preprocessing (PRE)

| ID | Requirement |
|----|------------|
| PRE-01 | The system SHALL detect and handle missing values using configurable strategies (mean, median, forward-fill, drop) |
| PRE-02 | The system SHALL normalize numeric features using Min-Max scaling |
| PRE-03 | The system SHALL standardize features using Z-score normalization |
| PRE-04 | The system SHALL detect and handle outliers using IQR-based capping |
| PRE-05 | The system SHALL encode categorical features using one-hot encoding |
| PRE-06 | The system SHALL maintain a preprocessing audit log showing transformations applied |
| PRE-07 | The system SHALL expose preprocessing statistics via API for dashboard visualization |

### 5.3 Module: Feature Engineering (FE)

| ID | Requirement |
|----|------------|
| FE-01 | The system SHALL extract time-series features: rolling mean, rolling std, lag features (1, 5, 15 min) |
| FE-02 | The system SHALL compute rate-of-change features (delta, percent change) |
| FE-03 | The system SHALL extract temporal features: hour-of-day, day-of-week, is_weekend |
| FE-04 | The system SHALL derive cross-metric correlation features |
| FE-05 | The system SHALL compute anomaly score from baseline deviation |
| FE-06 | The system SHALL support custom feature definitions via configuration |
| FE-07 | The system SHALL expose a feature importance visualization backed by model SHAP values |

### 5.4 Module: Anomaly Detection (AD)

| ID | Requirement |
|----|------------|
| AD-01 | The system SHALL run multiple ML classifiers in parallel for each ingested data window |
| AD-02 | The system SHALL use an ensemble voting mechanism to produce a final anomaly verdict |
| AD-03 | The system SHALL compute a confidence score (0.0–1.0) for each anomaly prediction |
| AD-04 | The system SHALL classify anomaly severity as: INFO, WARNING, CRITICAL based on confidence thresholds |
| AD-05 | The system SHALL suppress duplicate anomalies for the same service within a configurable suppression window |
| AD-06 | The system SHALL stream real-time anomaly events to connected dashboard clients via Server-Sent Events (SSE) |
| AD-07 | The system SHALL support unsupervised anomaly detection using K-Means clustering |

### 5.5 Module: Incident Management (INC)

| ID | Requirement |
|----|------------|
| INC-01 | The system SHALL automatically create an Incident record when anomaly confidence exceeds the CRITICAL threshold |
| INC-02 | Each Incident SHALL have a lifecycle: OPEN → INVESTIGATING → RESOLVED → CLOSED |
| INC-03 | The system SHALL link contributing anomalies to their parent incident |
| INC-04 | The system SHALL compute MTTD and MTTR per incident |
| INC-05 | Users SHALL be able to manually create, update, and close incidents |
| INC-06 | The system SHALL generate an incident timeline view showing correlated events |
| INC-07 | The system SHALL support incident tagging and commenting |
| INC-08 | The system SHALL export incident reports in JSON format |

### 5.6 Module: Root Cause Analysis (RCA)

| ID | Requirement |
|----|------------|
| RCA-01 | The system SHALL produce a ranked list of contributing factors for each incident |
| RCA-02 | The system SHALL use Decision Tree paths to trace the ML reasoning chain |
| RCA-03 | The system SHALL display feature contribution weights per anomaly |
| RCA-04 | The system SHALL identify the most anomalous service/metric as the primary root cause candidate |
| RCA-05 | The system SHALL correlate cross-service anomalies occurring within a configurable time window |
| RCA-06 | The system SHALL present a human-readable explanation of the root cause |

### 5.7 Module: ML Model Management (MLM)

| ID | Requirement |
|----|------------|
| MLM-01 | The system SHALL support training of the following algorithms: Decision Tree, Random Forest, KNN, SVM, Linear Regression, K-Means |
| MLM-02 | The system SHALL version every trained model with metadata (algorithm, timestamp, dataset hash, hyperparameters) |
| MLM-03 | The system SHALL evaluate each model and store: Accuracy, Precision, Recall, F1 Score, Confusion Matrix, ROC-AUC |
| MLM-04 | The system SHALL allow promotion of a model version to "active" for live inference |
| MLM-05 | The system SHALL support comparing two model versions side-by-side |
| MLM-06 | The system SHALL allow manual hyperparameter configuration before training |
| MLM-07 | The system SHALL expose training job status (queued, running, completed, failed) via API |
| MLM-08 | The system SHALL retain the last 10 model versions per algorithm |

### 5.8 Module: AI Assistant (GEN)

| ID | Requirement |
|----|------------|
| GEN-01 | The system SHALL provide a conversational AI assistant that answers questions about incidents in natural language |
| GEN-02 | The assistant SHALL be able to summarize the current system health |
| GEN-03 | The assistant SHALL be able to explain a specific incident's root cause in plain English |
| GEN-04 | The assistant SHALL be able to list active anomalies and their severities |
| GEN-05 | The assistant SHALL support follow-up questions within a conversation session |
| GEN-06 | The assistant SHALL clearly indicate when it does not have enough data to answer |
| GEN-07 | The system SHALL log all assistant conversations for audit purposes |

### 5.9 Module: Dashboard & Analytics (DASH)

| ID | Requirement |
|----|------------|
| DASH-01 | The dashboard SHALL display real-time system health score (0–100) |
| DASH-02 | The dashboard SHALL display a time-series chart of anomaly frequency over the last 24 hours |
| DASH-03 | The dashboard SHALL show active incident count by severity |
| DASH-04 | The dashboard SHALL render a confusion matrix visualization for the active model |
| DASH-05 | The dashboard SHALL display model performance trend over historical versions |
| DASH-06 | The dashboard SHALL show a feature importance bar chart |
| DASH-07 | The dashboard SHALL provide a data preprocessing summary view |
| DASH-08 | The dashboard SHALL auto-refresh without full page reload |

### 5.10 Module: User & Auth (AUTH)

| ID | Requirement |
|----|------------|
| AUTH-01 | The system SHALL support user registration with email and password |
| AUTH-02 | The system SHALL authenticate users via JWT access tokens (15-min expiry) and refresh tokens (7-day expiry) |
| AUTH-03 | The system SHALL enforce RBAC for all protected API endpoints |
| AUTH-04 | The system SHALL hash passwords using bcrypt with a minimum cost factor of 12 |
| AUTH-05 | The system SHALL record login/logout events in an audit log |

---

## 6. AI/ML Module Specifications

### 6.1 Supervised Learning: Anomaly Classification

The supervised classification pipeline labels telemetry windows as **normal (0)** or **anomalous (1)**. Training uses a labeled historical dataset.

#### 6.1.1 Decision Tree Classifier
- **Purpose:** Transparent, auditable classification; provides human-readable rule paths for RCA
- **Implementation:** `sklearn.tree.DecisionTreeClassifier`
- **Hyperparameters:** `max_depth`, `min_samples_split`, `criterion` (gini/entropy)
- **Role in SentinelAI:** Primary RCA explainability engine — decision paths map directly to root cause explanation

#### 6.1.2 Random Forest Classifier
- **Purpose:** Ensemble of decision trees; higher accuracy, lower variance, native feature importance
- **Implementation:** `sklearn.ensemble.RandomForestClassifier`
- **Hyperparameters:** `n_estimators`, `max_depth`, `max_features`
- **Role in SentinelAI:** Primary anomaly detection classifier in production ensemble

#### 6.1.3 K-Nearest Neighbors (KNN)
- **Purpose:** Instance-based learning; effective for detecting anomalies in low-dimensional feature spaces
- **Implementation:** `sklearn.neighbors.KNeighborsClassifier`
- **Hyperparameters:** `n_neighbors`, `metric` (euclidean/manhattan), `weights`
- **Role in SentinelAI:** Secondary classifier; contributes to ensemble voting

#### 6.1.4 Support Vector Machine (SVM)
- **Purpose:** Maximum-margin classifier; effective for high-dimensional feature spaces
- **Implementation:** `sklearn.svm.SVC`
- **Hyperparameters:** `C`, `kernel` (rbf/linear/poly), `gamma`
- **Role in SentinelAI:** Contributes to ensemble; used for cases with clear class separation

#### 6.1.5 Linear Regression (Baseline Deviation)
- **Purpose:** Predict expected metric values; deviation from prediction = anomaly signal
- **Implementation:** `sklearn.linear_model.LinearRegression`
- **Role in SentinelAI:** Baseline prediction model for trend analysis and threshold auto-calibration

### 6.2 Unsupervised Learning: K-Means Clustering

- **Purpose:** Cluster telemetry windows into behavioral groups without labels; windows far from cluster centroids are anomaly candidates
- **Implementation:** `sklearn.cluster.KMeans`
- **Hyperparameters:** `n_clusters`, `init` (k-means++), `max_iter`
- **Role in SentinelAI:**  
  1. Cold-start anomaly detection before labeled data exists  
  2. Service behavior profiling (identify normal operating regimes)  
  3. Incident grouping (cluster similar incidents for pattern analysis)

### 6.3 Ensemble Voting Strategy

```
Final Prediction = weighted_vote(
    RandomForest(weight=0.4),
    SVM(weight=0.3),
    KNN(weight=0.2),
    DecisionTree(weight=0.1)
)
Confidence = max(vote_share_for_winning_class)
```

Weights are configurable and updated based on cross-validation F1 scores during each retraining cycle.

### 6.4 Model Evaluation Framework

Every trained model SHALL be evaluated against a held-out test set (80/20 split with stratification):

| Metric | Formula | Purpose |
|--------|---------|---------|
| Accuracy | (TP+TN)/(TP+TN+FP+FN) | Overall correctness |
| Precision | TP/(TP+FP) | False-positive rate control — critical for alert fatigue |
| Recall | TP/(TP+FN) | Miss rate control — critical for undetected incidents |
| F1 Score | 2×(P×R)/(P+R) | Harmonic balance of Precision and Recall |
| Confusion Matrix | [[TN,FP],[FN,TP]] | Visual breakdown of prediction outcomes |
| ROC-AUC | Area under ROC curve | Discrimination ability across thresholds |

**Design rationale for Precision/Recall tradeoff:** In incident detection, a missed incident (low recall) is more costly than a false alert (low precision). The system SHALL default to maximizing Recall, with an operator-configurable Precision floor.

### 6.5 Data Preprocessing Pipeline

```
Raw Features
    │
    ├─[1] Missing Value Handling    → mean/median/ffill/drop (per-column strategy)
    ├─[2] Outlier Capping           → IQR-based capping (Q1 - 1.5×IQR, Q3 + 1.5×IQR)
    ├─[3] Feature Scaling           → StandardScaler (Z-score) or MinMaxScaler
    ├─[4] Categorical Encoding      → One-Hot Encoding
    ├─[5] Feature Engineering       → Rolling stats, lag features, temporal features
    └─[6] Feature Selection         → Drop zero-variance, correlated features (r > 0.95)
         │
         ▼
    Processed Feature Matrix (X_train, X_test)
```

### 6.6 Generative AI Module

- **Approach:** Retrieval-Augmented Generation (RAG)
  1. Query is embedded and matched against incident/anomaly records in the database
  2. Retrieved context (incident data, model explanation, RCA output) is injected into a prompt
  3. LLM generates a natural language response grounded in real system data
- **LLM Provider:** Replit AI Integrations (OpenAI-compatible API — no user API key required)
- **Prompt Design:** System prompt establishes the assistant's role as an SRE AI; context window includes relevant incident data; no hallucinated metrics
- **Guardrails:** Responses always cite the underlying data source; assistant declines to speculate when data is insufficient

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Requirement | Target |
|------------|--------|
| Anomaly scoring latency (p99) | < 200ms per data window |
| API response time (p95) | < 500ms |
| Dashboard initial load | < 3 seconds |
| Model training (1M samples) | < 5 minutes |
| SSE anomaly stream delay | < 1 second from detection to UI |

### 7.2 Scalability

- The ingestion API SHALL be stateless and horizontally scalable
- ML inference SHALL be decoupled from the API via a job queue (Redis)
- Database queries SHALL use indexed columns for all filter/sort operations
- Pagination SHALL be enforced on all list endpoints (max 100 per page)

### 7.3 Reliability

- The system SHALL achieve 99.9% uptime for the API layer
- Failed ML training jobs SHALL be retried up to 3 times with exponential backoff
- The system SHALL gracefully degrade if the ML service is unavailable (return cached predictions)

### 7.4 Security

- All API endpoints (except `/health`, `/auth/login`, `/auth/register`) SHALL require a valid JWT
- JWT secrets SHALL be stored as environment secrets, never in code
- All database queries SHALL use parameterized statements (Drizzle ORM enforces this)
- Passwords SHALL never be logged or returned in API responses
- Rate limiting SHALL be applied: 100 req/min per IP on public endpoints

### 7.5 Maintainability

- Code coverage target: ≥ 80% for domain and application layers
- All API routes SHALL be documented in OpenAPI 3.1 spec
- Every ML experiment SHALL be reproducible via stored hyperparameters and dataset hash

### 7.6 Observability

- All API requests SHALL be logged with: method, path, status code, duration, user ID
- ML training jobs SHALL emit structured progress events
- Errors SHALL include correlation IDs for distributed tracing

---

## 8. Data Requirements

### 8.1 Telemetry Data Schema (Canonical)

```
MetricPoint {
  id:           UUID (PK)
  source_id:    UUID (FK → DataSource)
  service_name: string
  metric_name:  string          // e.g. "cpu_usage", "response_time_ms"
  value:        float
  unit:         string          // "%", "ms", "bytes", "count"
  timestamp:    timestamptz
  labels:       JSONB           // arbitrary key-value tags
  ingested_at:  timestamptz
}

LogEntry {
  id:           UUID (PK)
  source_id:    UUID (FK → DataSource)
  service_name: string
  level:        enum(DEBUG, INFO, WARN, ERROR, FATAL)
  message:      text
  parsed_fields: JSONB          // structured fields extracted from log
  timestamp:    timestamptz
  ingested_at:  timestamptz
}
```

### 8.2 Training Dataset

The ML pipeline operates on a **Feature Matrix** derived from MetricPoints:

| Feature | Type | Description |
|---------|------|-------------|
| cpu_mean_5m | float | Rolling 5-min mean of CPU usage |
| cpu_std_5m | float | Rolling 5-min std dev of CPU usage |
| mem_mean_5m | float | Rolling 5-min mean of memory usage |
| response_time_p95 | float | 95th percentile response time |
| error_rate | float | Errors / total requests in window |
| request_rate | float | Requests per second |
| cpu_lag_1 | float | CPU at t-1 window |
| cpu_lag_5 | float | CPU at t-5 windows |
| hour_of_day | int | 0–23 |
| day_of_week | int | 0–6 |
| is_weekend | int | 0 or 1 |
| baseline_deviation | float | Z-score from Linear Regression baseline |
| label | int | 0=normal, 1=anomaly (supervised only) |

### 8.3 Synthetic Data Generation

For demonstration and testing, the system SHALL include a data simulator that generates:
- Normal operating patterns with daily/weekly seasonality
- Injected anomaly scenarios: CPU spike, memory leak, latency spike, error rate surge
- Configurable noise level and anomaly density

---

## 9. API Contract Summary

All API endpoints are defined in `lib/api-spec/openapi.yaml`. This section provides a high-level summary.

### 9.1 Ingestion API

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/ingest/metrics | Ingest one or more metric data points |
| POST | /api/ingest/logs | Ingest one or more log entries |

### 9.2 Anomaly API

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/anomalies | List anomalies with filters (service, severity, time range) |
| GET | /api/anomalies/:id | Get anomaly detail with ML explanation |
| GET | /api/anomalies/stream | SSE stream of real-time anomaly events |

### 9.3 Incident API

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/incidents | List incidents with pagination and filters |
| POST | /api/incidents | Create incident manually |
| GET | /api/incidents/:id | Get incident with timeline and RCA |
| PATCH | /api/incidents/:id | Update incident (status, assignee, tags) |
| POST | /api/incidents/:id/comments | Add comment |
| GET | /api/incidents/:id/export | Export incident report as JSON |

### 9.4 ML Model API

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/models | List all model versions |
| POST | /api/models/train | Trigger a new training job |
| GET | /api/models/:id | Get model metadata and evaluation metrics |
| GET | /api/models/:id/metrics | Get full evaluation report (confusion matrix, etc.) |
| POST | /api/models/:id/activate | Promote model to active |
| GET | /api/models/compare | Compare two model versions |

### 9.5 Analytics API

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/analytics/health-score | Current system health score |
| GET | /api/analytics/anomaly-trend | Anomaly frequency over time |
| GET | /api/analytics/preprocessing-stats | Data preprocessing pipeline statistics |
| GET | /api/analytics/feature-importance | Feature importance from active model |

### 9.6 AI Assistant API

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/assistant/chat | Send a message; get AI-generated response |
| GET | /api/assistant/sessions | List conversation sessions |
| GET | /api/assistant/sessions/:id | Get conversation history |

### 9.7 Auth API

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create user account |
| POST | /api/auth/login | Authenticate; receive JWT |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Invalidate refresh token |
| GET | /api/auth/me | Get current user profile |

---

## 10. UI/UX Module Breakdown

### 10.1 Application Routes

| Route | Page | Primary User |
|-------|------|-------------|
| `/` | Landing / Login | All |
| `/dashboard` | System health overview | SRE, Manager |
| `/anomalies` | Anomaly list with filters | SRE |
| `/anomalies/:id` | Anomaly detail + RCA | SRE |
| `/incidents` | Incident list | SRE, Manager |
| `/incidents/:id` | Incident detail + timeline | SRE |
| `/models` | ML model management | ML Engineer |
| `/models/:id` | Model evaluation + confusion matrix | ML Engineer |
| `/data` | Data ingestion + preprocessing view | ML Engineer |
| `/assistant` | AI chat interface | All |
| `/settings` | User + workspace settings | Admin |

### 10.2 Key UI Components

| Component | Data Source | Description |
|-----------|------------|-------------|
| SystemHealthGauge | `/api/analytics/health-score` | Radial gauge 0–100 |
| AnomalyTimeline | `/api/analytics/anomaly-trend` | Time-series line chart |
| IncidentSeverityBadge | Incident entity | Color-coded severity pill |
| ConfusionMatrixHeatmap | `/api/models/:id/metrics` | 2×2 heatmap with TP/TN/FP/FN |
| FeatureImportanceChart | `/api/analytics/feature-importance` | Horizontal bar chart |
| PreprocessingPipelineView | `/api/analytics/preprocessing-stats` | Step-by-step pipeline diagram |
| ModelComparisonTable | `/api/models/compare` | Side-by-side metric comparison |
| AnomalyFeed | `/api/anomalies/stream` (SSE) | Live scrolling feed |
| AIAssistantChat | `/api/assistant/chat` | Conversational chat interface |
| RCAExplanationCard | `/api/anomalies/:id` | Human-readable contributing factors |

### 10.3 Design Principles

- **Information Density First:** SREs need to see maximum signal with minimum navigation
- **Color-Coded Severity:** Consistent color system: green (normal), yellow (warning), red (critical)
- **No Emoji in UI:** Professional enterprise aesthetic
- **Dark Mode Default:** Most SRE tools are dark-mode; reduces eye strain during incidents
- **Responsive:** Minimum 1280px desktop; tablet-compatible at 768px

---

## 11. Database Schema Design

### 11.1 Core Tables

```sql
-- Users and Auth
users                 (id, email, password_hash, role, created_at)
refresh_tokens        (id, user_id, token_hash, expires_at, revoked_at)
audit_logs            (id, user_id, action, resource_type, resource_id, metadata, created_at)

-- Data Sources
data_sources          (id, name, type, config_json, created_by, created_at)
metric_points         (id, source_id, service_name, metric_name, value, unit, timestamp, labels, ingested_at)
log_entries           (id, source_id, service_name, level, message, parsed_fields, timestamp, ingested_at)

-- ML Pipeline
training_datasets     (id, name, feature_count, sample_count, label_distribution, created_at)
model_versions        (id, algorithm, hyperparameters, dataset_id, status, activated_at, created_at)
model_metrics         (id, model_id, metric_name, metric_value, created_at)
training_jobs         (id, model_id, status, error_message, started_at, completed_at)

-- Detection
anomalies             (id, service_name, metric_name, score, severity, model_id, feature_snapshot, explanation, detected_at)
incidents             (id, title, description, severity, status, mttd, mttr, created_by, created_at, resolved_at)
incident_anomalies    (incident_id, anomaly_id)   -- junction table
incident_comments     (id, incident_id, user_id, content, created_at)

-- AI Assistant
chat_sessions         (id, user_id, created_at)
chat_messages         (id, session_id, role, content, context_json, created_at)
```

### 11.2 Indexing Strategy

| Table | Index |
|-------|-------|
| metric_points | (service_name, metric_name, timestamp DESC) |
| metric_points | (ingested_at DESC) |
| anomalies | (severity, detected_at DESC) |
| incidents | (status, created_at DESC) |
| model_versions | (algorithm, status) |

---

## 12. Integration Points

### 12.1 Internal Service Communication

| From | To | Protocol | Purpose |
|------|----|----------|---------|
| API Server | ML Service | HTTP (internal) | Trigger training, get predictions |
| API Server | Redis | TCP | Job queue, anomaly state cache |
| ML Service | PostgreSQL | JDBC/psycopg2 | Read training data, write results |

### 12.2 External Integrations (v1.0)

| Service | Purpose | Method |
|---------|---------|--------|
| Replit AI (OpenAI-compatible) | LLM for AI Assistant | REST API via Replit AI Integration |
| Webhook endpoints (configurable) | Alert delivery | HTTP POST |

---

## 13. Security Requirements

### 13.1 Authentication & Authorization
- JWT access tokens SHALL expire after 15 minutes
- Refresh tokens SHALL be stored as hashed values in the database
- All role checks SHALL be enforced at the route middleware level, not the UI
- Privilege escalation SHALL require admin confirmation

### 13.2 Input Validation
- All request bodies SHALL be validated against Zod schemas before processing
- SQL injection is prevented by Drizzle ORM's parameterized query builder
- XSS prevention: API returns JSON only; no server-side HTML rendering

### 13.3 Secrets Management
- `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `ML_SERVICE_URL` stored as Replit Secrets
- No secrets committed to version control

### 13.4 Rate Limiting
- Auth endpoints: 10 requests/minute per IP
- Ingestion endpoints: 1,000 requests/minute per authenticated user
- AI assistant: 20 requests/minute per user

---

## 14. Deployment Architecture

### 14.1 Service Layout (Replit Monorepo)

```
artifacts/
├── web/              ← React + Vite frontend (previewPath: "/")
├── api-server/       ← Node.js Express API (previewPath: "/api")
├── ml-service/       ← Python FastAPI ML service (internal only)
lib/
├── api-spec/         ← OpenAPI spec + codegen
├── api-client-react/ ← Generated React Query hooks
├── api-zod/          ← Generated Zod schemas
└── db/               ← Drizzle ORM schema + migrations
```

### 14.2 Environment Variables Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Access token signing secret |
| `REFRESH_TOKEN_SECRET` | Refresh token signing secret |
| `ML_SERVICE_URL` | Internal URL of the Python ML service |
| `SESSION_SECRET` | Express session secret |

---

## 15. ML Syllabus Coverage Matrix

| Syllabus Topic | Covered By | Module | Evidence |
|---------------|-----------|--------|---------|
| Data Preprocessing | PRE module | Data Pipeline | Missing value handling, normalization, outlier capping |
| Feature Engineering | FE module | Data Pipeline | Rolling stats, lag features, temporal features |
| Supervised Learning | AD module | ML Engine | Labeled anomaly classification |
| Decision Tree | AD-01 | ML Engine | DT Classifier for RCA explainability |
| Random Forest | AD-01 | ML Engine | RF Classifier as primary ensemble member |
| KNN | AD-01 | ML Engine | KNN Classifier as secondary ensemble member |
| SVM | AD-01 | ML Engine | SVC as tertiary ensemble member |
| Linear Regression | FE-05 | Feature Engineering | Baseline deviation prediction |
| K-Means | AD-07 | Unsupervised Detection | Cold-start anomaly detection, clustering |
| Model Evaluation | MLM-03 | Model Management | Per-model evaluation on held-out test set |
| Precision | MLM-03 | Model Management | Stored and visualized per model version |
| Recall | MLM-03 | Model Management | Stored and visualized per model version |
| F1 Score | MLM-03 | Model Management | Stored and visualized per model version |
| Confusion Matrix | DASH-04 | Dashboard | Interactive heatmap visualization |
| Generative AI | GEN module | AI Assistant | RAG-based incident Q&A with LLM |

**Coverage: 15/15 syllabus topics — 100%**

---

## 16. Glossary

| Term | Definition |
|------|-----------|
| Anomaly | A data point or time window that deviates significantly from expected behavior as determined by an ML model |
| Incident | A confirmed service degradation or outage event, created from one or more anomalies |
| RCA | Root Cause Analysis — the process of identifying the primary cause of an incident |
| MTTD | Mean Time To Detect — time from anomaly occurrence to detection |
| MTTR | Mean Time To Resolve — time from incident creation to resolution |
| Ensemble | A combination of multiple ML models whose predictions are aggregated for a final decision |
| Feature Vector | A numerical representation of a telemetry window used as input to an ML model |
| SHAP | SHapley Additive exPlanations — a framework for explaining individual ML predictions |
| RAG | Retrieval-Augmented Generation — an AI technique that grounds LLM responses in retrieved data |
| SSE | Server-Sent Events — a protocol for server-to-client real-time streaming over HTTP |
| SLO | Service Level Objective — a measurable target for service reliability |
| Telemetry | Collected data about system behavior: metrics, logs, and traces |

---

*End of SRS v1.0 — SentinelAI*
