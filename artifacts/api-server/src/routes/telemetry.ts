import { Router } from 'express';
import { handleTelemetry, getRecentTelemetry } from '../controllers/telemetryController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

// Authenticated telemetry ingestion
router.post('/', authenticateToken, handleTelemetry);

// Authenticated telemetry retrieval
router.get('/recent/:repositoryId', authenticateToken, getRecentTelemetry);

export default router;