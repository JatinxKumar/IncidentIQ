import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '@workspace/db';
import { userIntegrationsTable, repositoriesTable } from '@workspace/db/schema';
import { eq, and } from 'drizzle-orm';
import { encryptToken, decryptToken } from '../utils/crypto.js';
import { VercelService, getVercelIntegration, getVercelTokenForUser } from '../services/vercelService.js';

/**
 * Robust HMAC-signed CSRF State tokens.
 * Format: `<randomHex>.<timestamp>.<userId>.<signature>`
 * Stateless and works seamlessly across multiple backend instances/restarts.
 */
function generateSignedState(userId: string): string {
  const secret = process.env.ENCRYPTION_KEY || 'incidentiq_fallback_secret_for_csrf';
  const random = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now().toString();
  const payload = `${random}.${timestamp}.${userId}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifySignedState(state: string): { valid: boolean; userId?: string } {
  try {
    const parts = state.split('.');
    if (parts.length !== 4) return { valid: false };

    const [random, timestampStr, userId, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return { valid: false };

    // Reject if expired (TTL: 15 minutes)
    if (Date.now() - timestamp > 15 * 60 * 1000 || Date.now() < timestamp) {
      return { valid: false };
    }

    const secret = process.env.ENCRYPTION_KEY || 'incidentiq_fallback_secret_for_csrf';
    const payload = `${random}.${timestampStr}.${userId}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (signature.length !== expectedSig.length) return { valid: false };
    const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));

    return isValid ? { valid: true, userId } : { valid: false };
  } catch {
    return { valid: false };
  }
}

/**
 * GET /api/integrations/vercel/status
 * Return whether current user has connected Vercel (NEVER returns tokens)
 */
export const getVercelStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const integration = await getVercelIntegration(userId);
    if (!integration) {
      return res.json({ connected: false });
    }

    const meta = (integration.metadata as any) || {};
    return res.json({
      connected: true,
      username: integration.username,
      teamId: meta.teamId || null,
      status: integration.status,
      connectedAt: integration.createdAt?.toISOString(),
      lastValidatedAt: integration.lastValidatedAt?.toISOString(),
      expiresAt: integration.tokenExpiresAt?.toISOString() || null,
      hasRefreshToken: Boolean(integration.encryptedRefreshToken),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to check Vercel status' });
  }
};

/**
 * GET /api/integrations/vercel/connect
 * Generates OAuth authorization URL with signed state & offline_access scope
 */
export const connectVercel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const clientId = process.env.VERCEL_CLIENT_ID;
    if (!clientId) {
      return res.status(400).json({
        error: 'Vercel OAuth is not configured on the server. VERCEL_CLIENT_ID is required.',
        code: 'VERCEL_CONFIG_MISSING',
      });
    }

    // Generate stateless cryptographically signed state
    const state = generateSignedState(userId);
    const redirectUri = process.env.VERCEL_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/integrations/vercel/callback`;

    const authorizeUrl = new URL('https://vercel.com/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('state', state);
    // Request offline_access scope so Vercel returns a rotating refresh_token
    authorizeUrl.searchParams.set('scope', 'offline_access');

    return res.json({
      url: authorizeUrl.toString(),
      state,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to initiate Vercel connection' });
  }
};

/**
 * GET /api/integrations/vercel/callback
 * Handles OAuth callback, validates signed CSRF state, and stores encrypted credentials
 */
export const vercelCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      return res.status(400).json({
        error: String(error_description || error),
        code: 'VERCEL_OAUTH_ERROR',
      });
    }

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.status(400).json({ error: 'Missing code or state parameter', code: 'INVALID_CALLBACK' });
    }

    // Validate signed CSRF state
    const stateCheck = verifySignedState(state);
    if (!stateCheck.valid || !stateCheck.userId) {
      return res.status(400).json({ error: 'Invalid or expired state parameter', code: 'CSRF_STATE_MISMATCH' });
    }

    const userId = stateCheck.userId;
    const redirectUri = process.env.VERCEL_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/integrations/vercel/callback`;

    // Exchange code for token and refresh token
    const tokenData = await VercelService.exchangeCodeForToken(code, redirectUri);

    // Fetch user profile from Vercel
    const service = new VercelService(tokenData.accessToken, tokenData.teamId);
    const vercelUser = await service.getUser().catch(() => ({ id: tokenData.userId, username: 'vercel_user', email: '' }));

    // Encrypt tokens before storing
    const encryptedToken = encryptToken(tokenData.accessToken);
    const encryptedRefreshToken = tokenData.refreshToken ? encryptToken(tokenData.refreshToken) : null;
    const tokenExpiresAt = tokenData.expiresIn ? new Date(Date.now() + tokenData.expiresIn * 1000) : null;

    // Upsert into user_integrations
    await db
      .delete(userIntegrationsTable)
      .where(and(eq(userIntegrationsTable.userId, userId), eq(userIntegrationsTable.provider, 'vercel')));

    await db.insert(userIntegrationsTable).values({
      userId,
      provider: 'vercel',
      providerAccountId: tokenData.userId || vercelUser.id,
      username: vercelUser.username,
      encryptedToken,
      encryptedRefreshToken,
      tokenExpiresAt,
      scopes: tokenData.scope || null,
      status: 'connected',
      lastValidatedAt: new Date(),
      metadata: {
        teamId: tokenData.teamId || null,
        email: vercelUser.email || null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Auto-map user repositories to Vercel projects
    const mapped = await mapUserRepositoriesToVercel(userId, service);

    return res.json({
      message: 'Vercel account connected successfully',
      username: vercelUser.username,
      mappedRepositories: mapped,
    });
  } catch (error: any) {
    console.error('Vercel callback error:', error);
    return res.status(500).json({ error: error.message || 'Vercel authentication failed' });
  }
};

/**
 * POST /api/integrations/vercel/disconnect
 * Disconnect Vercel integration for the user
 */
export const disconnectVercel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    await db
      .delete(userIntegrationsTable)
      .where(and(eq(userIntegrationsTable.userId, userId), eq(userIntegrationsTable.provider, 'vercel')));

    // Unlink vercel project info from user repositories
    await db
      .update(repositoriesTable)
      .set({
        vercelProjectId: null,
        vercelProjectName: null,
        vercelDeploymentUrl: null,
        vercelLinkedAt: null,
      })
      .where(eq(repositoriesTable.userId, userId));

    return res.json({ message: 'Vercel account disconnected and repositories unlinked successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Helper: Map user's tracked GitHub repositories to authorized Vercel projects
 */
export async function mapUserRepositoriesToVercel(userId: string, service?: VercelService) {
  if (!service) {
    const creds = await getVercelTokenForUser(userId);
    if (!creds) return [];
    service = new VercelService(creds.token, creds.teamId);
  }

  // Fetch all projects from Vercel
  const projects = await service.listProjects().catch((err) => {
    console.error('Failed to list Vercel projects:', err);
    return [];
  });

  if (projects.length === 0) return [];

  // Fetch user's repositories from DB
  const userRepos = await db.select().from(repositoriesTable).where(eq(repositoriesTable.userId, userId));

  const mapped: Array<{ repoId: string; repoName: string; vercelProject: string }> = [];

  for (const repo of userRepos) {
    const matched = projects.find((p) => VercelService.matchProjectToRepo(p, repo.url, repo.name));
    if (matched) {
      const prodUrl = matched.targets?.production?.url || (matched.targets?.production?.alias?.[0] ? `https://${matched.targets.production.alias[0]}` : null);
      await db
        .update(repositoriesTable)
        .set({
          vercelProjectId: matched.id,
          vercelProjectName: matched.name,
          vercelDeploymentUrl: prodUrl,
          vercelLinkedAt: new Date(),
        })
        .where(eq(repositoriesTable.id, repo.id));

      mapped.push({
        repoId: repo.id,
        repoName: repo.name,
        vercelProject: matched.name,
      });
    }
  }

  return mapped;
}

/**
 * POST /api/integrations/vercel/sync-projects
 * Manually trigger matching user repos to Vercel projects
 */
export const syncVercelProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const creds = await getVercelTokenForUser(userId);
    if (!creds) {
      return res.status(400).json({ error: 'Vercel integration is not connected', code: 'VERCEL_NOT_CONNECTED' });
    }

    const service = new VercelService(creds.token, creds.teamId);
    const mapped = await mapUserRepositoriesToVercel(userId, service);

    return res.json({
      message: 'Vercel project sync completed',
      mappedCount: mapped.length,
      mapped,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to sync Vercel projects' });
  }
};
