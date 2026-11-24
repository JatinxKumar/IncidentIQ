import express from 'express';
import {
    uploadKnowledgeDocument,
    listKnowledgeDocuments,
    searchKnowledge,
    linkKnowledgeToIncident,
    getKnowledgeForIncident
} from '../controllers/knowledgeController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();

// All knowledge routes require authentication
router.use(authenticateToken);

// POST /api/knowledge/upload - Upload and process a knowledge document
router.post('/upload', uploadKnowledgeDocument);

// GET /api/knowledge - List all knowledge documents for the authenticated user
router.get('/', listKnowledgeDocuments);

// POST /api/knowledge/search - Search for relevant knowledge chunks
router.post('/search', searchKnowledge);

// POST /api/knowledge/link - Link a knowledge chunk to an incident
router.post('/link', linkKnowledgeToIncident);

// GET /api/knowledge/incident/:id - Get knowledge chunks linked to an incident
router.get('/incident/:id', getKnowledgeForIncident);

export default router;