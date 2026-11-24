import express from 'express';
import {
    listRepositories,
    connectRepository,
    disconnectRepository,
    getGitHubStatus,
    connectGitHubAccount,
    disconnectGitHubAccount,
    discoverGitHubRepositories,
    getLiveRepositoryDetails,
    getRepositoryTimeline
} from '../controllers/repositoryController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All repository routes require authentication
router.use(authenticateToken);

// GitHub Connection state & discovery endpoints
router.get('/status', getGitHubStatus);
router.post('/github/connect', connectGitHubAccount);
router.post('/github/disconnect', disconnectGitHubAccount);
router.get('/github/discover', discoverGitHubRepositories);
router.get('/github/details', getLiveRepositoryDetails);
router.get('/timeline', getRepositoryTimeline);

// Local Database Repository management endpoints
router.get('/', listRepositories);
router.post('/', connectRepository);
router.delete('/:id', disconnectRepository);

export default router;
