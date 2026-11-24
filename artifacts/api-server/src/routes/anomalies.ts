import express from 'express';
import { getAnomalies } from '../controllers/anomaliesController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();

// All anomalies routes require authentication
router.use(authenticateToken);

// GET /api/anomalies - Get anomalies for the authenticated user
router.get('/', getAnomalies);

export default router;