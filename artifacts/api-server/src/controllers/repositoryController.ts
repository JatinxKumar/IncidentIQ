import { Request, Response } from 'express';
import { db } from '@workspace/db';
import { repositoriesTable, userIntegrationsTable, webhookDeliveriesTable } from '@workspace/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { GitHubService } from '../services/githubService.js';
import { encryptToken, decryptToken } from '../utils/crypto.js';

/** Helper: fetch stored integration for a user */
async function getUserIntegration(userId: string) {
  const rows = await db.select().from(userIntegrationsTable).where(and(eq(userIntegrationsTable.userId, userId), eq(userIntegrationsTable.provider, 'github')));
  return rows[0];
}

/** Helper: store (upsert) integration */
async function upsertUserIntegration(userId: string, providerAccountId: string, username: string, token: string, scopes?: string) {
  const encrypted = encryptToken(token);
  // Upsert: delete existing then insert (simpler for now)
  await db.delete(userIntegrationsTable).where(and(eq(userIntegrationsTable.userId, userId), eq(userIntegrationsTable.provider, 'github')));
  await db.insert(userIntegrationsTable).values({
    userId,
    provider: 'github',
    providerAccountId,
    username,
    encryptedToken: encrypted,
    scopes: scopes || null,
    status: 'connected',
    lastValidatedAt: new Date(),
    encryptionKeyVersion: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/** Helper: delete integration */
async function deleteUserIntegration(userId: string) {
  await db.delete(userIntegrationsTable).where(and(eq(userIntegrationsTable.userId, userId), eq(userIntegrationsTable.provider, 'github')));
}

/** Helper: obtain usable token for a user */
async function getTokenForUser(userId: string): Promise<string | null> {
  const integration = await getUserIntegration(userId);
  if (!integration) return null;
  try {
    return decryptToken(integration.encryptedToken);
  } catch (err) {
    // Log decryption failure but NEVER delete stored user integration automatically
    console.error(`Failed to decrypt token for user ${userId}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/** Validation schema for manual repository connection */
const connectSchema = z.object({
  url: z.string().url(),
  branch: z.string().optional()
});

/** GET /api/repositories/status */
export const getGitHubStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const integration = await getUserIntegration(userId);
    if (integration) {
      return res.json({
        connected: true,
        username: integration.username,
        avatarUrl: null,
        connectedAt: integration.createdAt?.toISOString(),
        mode: 'user_oauth',
      });
    }

    const envToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    if (envToken) {
      const service = new GitHubService(envToken);
      try {
        const user = await service.getAuthenticatedUser();
        return res.json({
          connected: true,
          username: user.login,
          avatarUrl: user.avatarUrl,
          connectedAt: new Date().toISOString(),
          mode: 'system_token',
        });
      } catch {
        return res.json({ connected: false, configured: true, message: 'System token configured but authentication failed' });
      }
    }

    return res.json({ connected: false, message: 'No GitHub account or token connected' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to check GitHub status' });
  }
};

/** POST /api/repositories/github/connect */
export const connectGitHubAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const { token } = req.body;
    const targetToken = token || process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    if (!targetToken) return res.status(400).json({ error: 'GitHub token or OAuth code required', code: 'TOKEN_REQUIRED' });

    const service = new GitHubService(targetToken);
    const ghUser = await service.getAuthenticatedUser();

    await upsertUserIntegration(userId, String(ghUser.id), ghUser.login, targetToken, ghUser.scopes?.join(' '));

    const { repos } = await service.listUserRepositories(1, 10);
    return res.status(200).json({
      message: 'GitHub account connected successfully',
      account: { username: ghUser.login, avatarUrl: ghUser.avatarUrl, htmlUrl: ghUser.htmlUrl },
      discoveredCount: repos.length,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to authorize GitHub account' });
  }
};

/** POST /api/repositories/github/disconnect */
export const disconnectGitHubAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
    await deleteUserIntegration(userId);
    return res.json({ message: 'GitHub account disconnected successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/** GET /api/repositories/github/discover */
export const discoverGitHubRepositories = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
    const token = await getTokenForUser(userId);
    if (!token) return res.status(400).json({ error: 'No active GitHub connection or token found.', code: 'GITHUB_NOT_CONNECTED' });
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 20;
    const service = new GitHubService(token);
    const { repos } = await service.listUserRepositories(page, perPage);
    return res.json({ page, perPage, repositories: repos });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to discover GitHub repositories' });
  }
};

/** GET /api/repositories/github/details */
export const getLiveRepositoryDetails = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
    const token = await getTokenForUser(userId);
    if (!token) return res.status(400).json({ error: 'GitHub not connected' });
    const owner = req.query.owner as string;
    const repo = req.query.repo as string;
    if (!owner || !repo) return res.status(400).json({ error: 'Owner and repo query parameters are required' });
    const service = new GitHubService(token);
    const [repoInfo, branches, commits, pulls, deployments] = await Promise.allSettled([
      service.getRepository(owner, repo),
      service.getBranches(owner, repo),
      service.getRecentCommits(owner, repo, 10),
      service.getPullRequests(owner, repo, 'all', 10),
      service.getDeployments(owner, repo, 5),
    ]);
    return res.json({
      repository: repoInfo.status === 'fulfilled' ? repoInfo.value : null,
      branches: branches.status === 'fulfilled' ? branches.value : [],
      commits: commits.status === 'fulfilled' ? commits.value : [],
      pullRequests: pulls.status === 'fulfilled' ? pulls.value : [],
      deployments: deployments.status === 'fulfilled' ? deployments.value : [],
      lastSynchronized: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to retrieve repository details' });
  }
};

/** GET /api/repositories/timeline */
export const getRepositoryTimeline = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 20;
    const rows = await db.select().from(webhookDeliveriesTable).orderBy(desc(webhookDeliveriesTable.processedAt)).limit(size).offset((page - 1) * size);
    return res.json({ page, size, events: rows });
  } catch (error: any) {
    console.error('Timeline fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch timeline' });
  }
};

/** List repositories */
export const listRepositories = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
    const repos = await db.select().from(repositoriesTable).where(eq(repositoriesTable.userId, userId)).orderBy(desc(repositoriesTable.createdAt));
    return res.json(repos);
  } catch (error) {
    console.error('Error listing repositories:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/** Connect a new repository */
export const connectRepository = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
    const parseResult = connectSchema.safeParse(req.body);
    if (!parseResult.success) return res.status(400).json({ error: 'Invalid request body', details: parseResult.error.errors });
    const { url, branch = 'main' } = parseResult.data;
    let parsedUrl;
    try { parsedUrl = new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL format' }); }
    if (!parsedUrl.hostname.endsWith('github.com')) return res.status(400).json({ error: 'Only GitHub URLs are allowed' });
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const repoName = pathSegments[1] || pathSegments[0] || 'unknown-repo';
    const insertResult = await db.insert(repositoriesTable).values({ name: repoName, url, branch, status: 'connected', userId, connectedAt: new Date() }).returning();
    return res.status(201).json(insertResult[0]);
  } catch (error) {
    console.error('Error connecting repository:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/** Disconnect a repository */
export const disconnectRepository = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
    const repoId = req.params.id;
    if (!repoId) return res.status(400).json({ error: 'Repository ID is required' });
    const updateResult = await db.update(repositoriesTable).set({ status: 'disconnected', disconnectedAt: new Date() }).where(and(eq(repositoriesTable.id, repoId), eq(repositoriesTable.userId, userId))).returning();
    if (updateResult.length === 0) return res.status(404).json({ error: 'Repository not found' });
    return res.json(updateResult[0]);
  } catch (error) {
    console.error('Error disconnecting repository:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};