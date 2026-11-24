"""
app/api/v1/endpoints/predict.py — ML Prediction and Model Information Endpoints
================================================================================

POST /api/v1/predict
    Accepts telemetry feature data, validates it, applies the same preprocessing
    used during training, loads the trained Random Forest model, and returns the
    predicted class (0=normal, 1=anomaly), anomaly status, and confidence/probability.

GET /api/v1/models/info
    Returns model metadata including name, algorithm, feature names, training status,
    and performance metrics.

Both endpoints handle invalid inputs and missing model files gracefully.
"""

import os
import joblib
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from app.core.logger import get_logger
from app.schemas.common import SuccessResponse

router = APIRouter()
logger = get_logger(__name__)

# Model file path - matches the path used in train.py
PROJECT_ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')
MODEL_PATH = os.path.join(PROJECT_ROOT, "artifacts", "ml-service", "ml", "models", "incident_model.joblib")
METRICS_PATH = os.path.join(PROJECT_ROOT, "artifacts", "ml-service", "ml", "models", "metrics.json")

# Feature names must match exactly the training order
FEATURES = [
    'cpu_usage', 'memory_usage', 'disk_usage', 'network_latency',
    'request_rate', 'error_rate', 'response_time', 'http_status',
    'service_availability', 'db_connections', 'query_latency',
    'cache_hit_ratio', 'restart_count', 'deployment_indicator'
]

# Pydantic model for prediction request
class PredictionRequest(BaseModel):
    """Telemetry data for anomaly prediction."""
    cpu_usage: float = Field(..., description="CPU usage percentage (0-100)")
    memory_usage: float = Field(..., description="Memory usage percentage (0-100)")
    disk_usage: float = Field(..., description="Disk usage percentage (0-100)")
    network_latency: float = Field(..., description="Network latency in milliseconds")
    request_rate: float = Field(..., description="Requests per second")
    error_rate: float = Field(..., description="Error rate (0-1)")
    response_time: float = Field(..., description="Response time in milliseconds")
    http_status: int = Field(..., description="HTTP status code")
    service_availability: float = Field(..., description="Service availability percentage (0-100)")
    db_connections: float = Field(..., description="Database connection count")
    query_latency: float = Field(..., description="Query latency in milliseconds")
    cache_hit_ratio: float = Field(..., description="Cache hit ratio (0-1)")
    restart_count: int = Field(..., description="Number of service restarts")
    deployment_indicator: int = Field(..., description="Deployment indicator (0=stable, 1=deploying)")

    @field_validator('*')
    @classmethod
    def validate_numeric_fields(cls, v, info):
        """Ensure all fields are numeric."""
        if not isinstance(v, (int, float)):
            raise ValueError(f"{info.field_name} must be numeric")
        return v

    @field_validator('error_rate', 'cache_hit_ratio')
    @classmethod
    def validate_ratio_fields(cls, v, info):
        """Ensure ratio fields are between 0 and 1."""
        if not 0 <= v <= 1:
            raise ValueError(f"{info.field_name} must be between 0 and 1")
        return v

    @field_validator('http_status')
    @classmethod
    def validate_http_status(cls, v, info):
        """Ensure HTTP status is valid."""
        if not 100 <= v <= 599:
            raise ValueError(f"{info.field_name} must be a valid HTTP status code (100-599)")
        return v

    @field_validator('service_availability')
    @classmethod
    def validate_availability(cls, v, info):
        """Ensure availability is between 0 and 100."""
        if not 0 <= v <= 100:
            raise ValueError(f"{info.field_name} must be between 0 and 100")
        return v

# Pydantic model for model info response
class ModelInfo(BaseModel):
    """Model metadata and information."""
    model_name: str
    algorithm: str
    feature_names: list[str]
    target_name: str
    class_names: list[str]
    training_status: str
    metrics: Dict[str, Any]
    model_path: str
    metrics_path: str
    model_size_bytes: int

async def load_model():
    """Load the trained model from disk.
    
    Returns:
        dict: Model artifacts containing model, feature_names, target_name, etc.
        
    Raises:
        FileNotFoundError: If the model file doesn't exist
        Exception: If there's an error loading the model
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
    
    try:
        model = joblib.load(MODEL_PATH)
        logger.info("Model loaded successfully", extra={"path": MODEL_PATH})
        return model
    except Exception as e:
        logger.error("Failed to load model", extra={"path": MODEL_PATH, "error": str(e)})
        raise

@router.post(
    "/predict",
    response_model=SuccessResponse,
    summary="Predict anomaly from telemetry data",
    description=(
        "Accepts telemetry feature data, validates it, applies the same preprocessing "
        "used during training, loads the trained Random Forest model, and returns "
        "the predicted class (0=normal, 1=anomaly), anomaly status, and confidence/probability."
    ),
    tags=["ml"],
)
async def predict_anomaly(request: PredictionRequest) -> SuccessResponse:
    """
    Predict whether the given telemetry data represents an anomaly.
    
    Args:
        request: Telemetry data containing the 14 system metrics
        
    Returns:
        SuccessResponse containing:
            - prediction: Predicted class (0=normal, 1=anomaly)
            - anomaly_status: Human-readable status
            - confidence: Confidence score (0-1)
            - probability: Probability distribution [P(normal), P(anomaly)]
            - features: Input features used for prediction
            
    Raises:
        HTTPException: 400 for invalid input, 503 for missing model
    """
    try:
        # Load model
        model = await load_model()
        
        # Convert request to DataFrame with correct feature order
        import pandas as pd
        features_dict = {feature: getattr(request, feature) for feature in FEATURES}
        features_df = pd.DataFrame([features_dict])
        
        # Ensure features are in the exact same order as training
        features_df = features_df[FEATURES]
        
        # Make prediction
        prediction = int(model['model'].predict(features_df)[0])
        probabilities = model['model'].predict_proba(features_df)[0]
        
        # Handle both binary and multi-class probability arrays
        if probabilities.ndim == 1:
            # Single class model (e.g., all-anomaly training data)
            confidence = float(probabilities[0])
            probability_normal = 0.0
            probability_anomaly = float(probabilities[0])
        else:
            # Binary classification with two classes
            confidence = float(probabilities[prediction])
            probability_normal = float(probabilities[0])
            probability_anomaly = float(probabilities[1])
        
        # Determine anomaly status
        anomaly_status = "anomaly" if prediction == 1 else "normal"
        
        # Build response
        response_data = {
            "prediction": prediction,
            "anomaly_status": anomaly_status,
            "confidence": confidence,
            "probability": {
                "normal": probability_normal,
                "anomaly": probability_anomaly
            },
            "features": features_dict
        }
        
        logger.info(
            "Prediction made successfully",
            extra={
                "prediction": prediction,
                "confidence": confidence,
                "anomaly_status": anomaly_status,
                "feature_count": len(FEATURES)
            }
        )
        
        return SuccessResponse(data=response_data)
        
    except FileNotFoundError as e:
        logger.error("Model file not found", extra={"path": MODEL_PATH})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model not available - model file not found"
        )
    except Exception as e:
        logger.error("Prediction failed", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )

@router.get(
    "/models/info",
    response_model=SuccessResponse,
    summary="Get model metadata and information",
    description="Returns model metadata including name, algorithm, feature names, training status, and performance metrics.",
    tags=["ml"],
)
async def get_model_info() -> SuccessResponse:
    """
    Get detailed information about the trained model.
    
    Returns:
        SuccessResponse containing model metadata and metrics
        
    Raises:
        HTTPException: 503 if model or metrics file is missing
    """
    try:
        # Load model
        model = await load_model()
        
        # Load metrics if available
        metrics = {}
        if os.path.exists(METRICS_PATH):
            import json
            with open(METRICS_PATH, 'r') as f:
                metrics = json.load(f)
        else:
            logger.warning("Metrics file not found", extra={"path": METRICS_PATH})
        
        # Get model file size
        model_size = os.path.getsize(MODEL_PATH) if os.path.exists(MODEL_PATH) else 0
        
        # Build model info
        model_info = ModelInfo(
            model_name="RandomForestClassifier",
            algorithm="random_forest",
            feature_names=model.get('feature_names', FEATURES),
            target_name=model.get('target_name', 'anomaly'),
            class_names=model.get('class_names', ['0', '1']),
            training_status="trained" if model else "not_trained",
            metrics=metrics,
            model_path=MODEL_PATH,
            metrics_path=METRICS_PATH,
            model_size_bytes=model_size
        )
        
        logger.info("Model info retrieved successfully", extra={"model_name": model_info.model_name})
        
        return SuccessResponse(data=model_info.model_dump())
        
    except FileNotFoundError as e:
        logger.error("Model or metrics file not found", extra={"model_path": MODEL_PATH, "metrics_path": METRICS_PATH})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model or metrics file not found"
        )
    except Exception as e:
        logger.error("Failed to get model info", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get model info: {str(e)}"
        )