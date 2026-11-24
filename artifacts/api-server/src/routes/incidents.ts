import express from 'express';
import { getIncidents, getIncidentById, createIncident, updateIncident, deleteIncident } from '../controllers/incidentController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All incident routes require authentication
router.use(authenticateToken);

// GET /api/incidents
router.get('/', getIncidents);

// GET /api/incidents/:id
router.get('/:id', getIncidentById);

// POST /api/incidents
router.post('/', createIncident);

// PUT /api/incidents/:id
router.put('/:id', updateIncident);

// DELETE /api/incidents/:id
router.delete('/:id', deleteIncident);

export default router;