"""
app/services/ — Domain Service Layer
======================================
Service classes contain all business logic for IncidentIQ.
They sit between route handlers and repositories.

Base class:
  BaseService[ModelT, CreateSchemaT, UpdateSchemaT]
    → app/services/base.py

Domain services (added module by module):

  Module 2 (Data Preprocessing):
    PreprocessingService     → preprocessing_service.py

  Module 3 (Feature Engineering):
    FeatureEngineeringService → feature_service.py

  Module 4 (ML Engine):
    TrainingService          → training_service.py
    InferenceService         → inference_service.py

  Module 5 (Model Evaluation):
    EvaluationService        → evaluation_service.py

  Module 6 (User Management + Auth):
    UserService              → user_service.py

  Module 7 (Incident Management):
    IncidentService          → incident_service.py

  Module 8 (Generative AI):
    AssistantService         → assistant_service.py

  Module 9 (Reporting):
    ReportService            → report_service.py
"""

from app.services.base import BaseService

__all__ = ["BaseService"]
