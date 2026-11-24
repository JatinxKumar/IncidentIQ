"""
app/schemas/ — Pydantic Request & Response Schemas
====================================================
All API request/response validation models for IncidentIQ.

Shared envelopes (imported everywhere):
  SuccessResponse[T]    → app/schemas/common.py
  PaginatedResponse[T]  → app/schemas/common.py
  ErrorResponse         → app/schemas/common.py
  HealthResponse        → app/schemas/common.py

Domain schemas (added module by module, one file per domain):
  Module 2:  preprocessing.py   — PreprocessingRequest, PreprocessingStatsResponse
  Module 3:  features.py        — FeatureEngineeringRequest, FeatureImportanceResponse
  Module 4:  training.py        — TrainModelRequest, TrainingJobResponse
             inference.py       — InferenceRequest, AnomalyScoreResponse
  Module 5:  evaluation.py      — ModelEvaluationResponse, ModelComparisonResponse
  Module 6:  users.py           — CreateUserRequest, UserResponse, LoginRequest
  Module 7:  incidents.py       — CreateIncidentRequest, IncidentResponse, UpdateIncidentRequest
  Module 8:  assistant.py       — ChatMessageRequest, ChatMessageResponse
  Module 9:  reports.py         — GenerateReportRequest, ReportResponse

Naming convention:
  - Request bodies: ...Request  (e.g. CreateIncidentRequest)
  - Response bodies: ...Response (e.g. IncidentResponse)
  - Shared domain objects match TypeScript interface names in web/src/types/index.ts
"""

from app.schemas.common import (
    ErrorDetail,
    ErrorResponse,
    HealthResponse,
    PaginatedResponse,
    ServiceCheck,
    SuccessResponse,
)

__all__ = [
    "SuccessResponse",
    "PaginatedResponse",
    "ErrorDetail",
    "ErrorResponse",
    "HealthResponse",
    "ServiceCheck",
]
