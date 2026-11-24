import { Request, Response } from 'express';
import { db } from '@workspace/db';
import { telemetryTable } from '@workspace/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

// Schema for telemetry validation
export const telemetrySchema = z.object({
  repositoryId: z.string().uuid().optional(),
  cpuUsage: z.number().min(0).max(100),
  memoryUsage: z.number().min(0).max(100),
  diskUsage: z.number().min(0).max(100),
  networkLatency: z.number().min(0),
  requestRate: z.number().min(0),
  errorRate: z.number().min(0).max(1),
  responseTime: z.number().min(0),
  httpStatus: z.number().int().min(100).max(599),
  serviceAvailability: z.number().min(0).max(100),
  dbConnections: z.number().min(0),
  queryLatency: z.number().min(0),
  cacheHitRatio: z.number().min(0).max(1),
  restartCount: z.number().int().min(0),
  deploymentIndicator: z.boolean(),
  telemetrySource: z.string().max(50)
});

// POST /api/telemetry
// Ingest telemetry data with validation, persistence, and ML prediction
export const handleTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate and parse request body
    const validatedData = telemetrySchema.parse(req.body);

    // Verify repository ownership
    // TODO: Implement proper authorization check
    // For now, assume the user has access to the repository

    // Persist telemetry
    const [telemetry] = await db
      .insert(telemetryTable)
      .values(validatedData)
      .returning();

    // Send telemetry to ML service for prediction
    try {
      const predictionResponse = await fetch('http://localhost:8002/api/v1/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      if (!predictionResponse.ok) {
        throw new Error(`ML service error: ${predictionResponse.status}`);
      }

      const prediction = await predictionResponse.json();

      res.status(201).json({
        message: 'Telemetry data persisted and processed',
        id: telemetry.id,
        createdAt: telemetry.createdAt,
        prediction,
      });
    } catch (mlError) {
      console.error('ML service error:', mlError);
      // Still return success since telemetry was persisted
      res.status(201).json({
        message: 'Telemetry data persisted (ML processing failed)',
        id: telemetry.id,
        createdAt: telemetry.createdAt,
        predictionError: mlError.message,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    } else {
      console.error('Telemetry persistence error:', error);
      res.status(500).json({
        error: 'Failed to persist telemetry data'
      });
    }
  }
};

// GET /api/telemetry/recent
// Retrieve recent telemetry for a repository
export const getRecentTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const repositoryId = z.string().uuid().parse(req.params.repositoryId);

    // Verify repository ownership
    // TODO: Implement proper authorization check

    // Get recent telemetry (last 100 records)
    const telemetry = await db
      .select()
      .from(telemetryTable)
      .where(eq(telemetryTable.repositoryId, repositoryId))
      .orderBy(desc(telemetryTable.createdAt))
      .limit(100);

    res.status(200).json(telemetry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid repository ID'
      });
    } else {
      console.error('Error fetching telemetry:', error);
      res.status(500).json({
        error: 'Failed to fetch telemetry data'
      });
    }
  }
};
