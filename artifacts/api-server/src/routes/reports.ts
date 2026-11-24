import express from 'express';
import { listReports, generateReport, getReportById } from '../controllers/reportsController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();

// All reports routes require authentication
router.use(authenticateToken);

// GET /api/reports - List all reports for the authenticated user
router.get('/', listReports);

// POST /api/reports/generate - Generate a new report
router.post('/generate', generateReport);

// GET /api/reports/:id - Get a specific report by ID
router.get('/:id', getReportById);

export default router;