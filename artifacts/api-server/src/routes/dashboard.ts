import express from 'express';
import { DashboardController } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticateToken);

// GET /api/dashboard/metrics
router.get('/', DashboardController.getMetrics);

// GET /api/dashboard/incidents
router.get('/incidents', DashboardController.getIncidents);

// GET /api/dashboard/models
router.get('/models', DashboardController.getModels);

// GET /api/dashboard/reports
router.get('/reports', DashboardController.getReports);

// GET /api/dashboard/repositories
router.get('/repositories', DashboardController.getRepositories);

// GET /api/dashboard/knowledge
router.get('/knowledge', DashboardController.getKnowledge);

// GET /api/dashboard/settings
router.get('/settings', DashboardController.getSettings);

export default router;