import express from 'express';
import {
  getVercelStatus,
  connectVercel,
  vercelCallback,
  disconnectVercel,
  syncVercelProjects,
} from '../controllers/vercelController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public / query-based callback endpoint (Vercel redirects here with code and state)
router.get('/callback', vercelCallback);

// Authenticated routes
router.get('/status', authenticateToken, getVercelStatus);
router.get('/connect', authenticateToken, connectVercel);
router.post('/disconnect', authenticateToken, disconnectVercel);
router.post('/sync-projects', authenticateToken, syncVercelProjects);

export default router;

