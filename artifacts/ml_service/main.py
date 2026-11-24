"""
Minimal FastAPI application entry point.
This file defines the FastAPI app instance used by the ML service.
"""
from fastapi import FastAPI

# Create the FastAPI application instance
app = FastAPI()

# Health check endpoint
@app.get("/ml/healthz")
async def healthz():
    return {"status": "ok"}

# Root endpoint (optional)
@app.get("/")
async def root():
    return {"message": "IncidentIQ ML Service is running"}