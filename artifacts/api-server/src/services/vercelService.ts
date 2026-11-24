import { db } from '@workspace/db';
import { userIntegrationsTable, repositoriesTable } from '@workspace/db/schema';
import { eq, and } from 'drizzle-orm';
import { encryptToken, decryptToken } from '../utils/crypto.js';

export interface VercelProjectLink {
  type: string;
  repo?: string;
  repoId?: number;
  org?: string;
}

export interface VercelProject {
  id: string;
  name: string;
  framework?: string | null;
  link?: VercelProjectLink;
  targets?: {
    production?: {
      url?: string;
      alias?: string[];
    };
  };
}

export interface VercelTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  teamId?: string;
  userId: string;
  tokenType: string;
  scope?: string;
}

export class VercelService {
  private token: string;
  private teamId?: string;

  constructor(token: string, teamId?: string) {
    this.token = token;
    this.teamId = teamId;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private getUrl(endpoint: string) {
    const url = new URL(`https://api.vercel.com${endpoint}`);
    if (this.teamId) {
      url.searchParams.set('teamId', this.teamId);
    }
    return url.toString();
  }

  /**
   * Fetch authenticated Vercel user profile
   */
  async getUser(): Promise<{ id: string; username: string; email: string }> {
    const res = await fetch(this.getUrl('/v2/user'), {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Vercel API error (${res.status}): Failed to retrieve user profile`);
    }
    const data = await res.json();
    return {
      id: data.user?.id || data.id,
      username: data.user?.username || data.username || 'vercel_user',
      email: data.user?.email || data.email || '',
    };
  }

  /**
   * List projects authorized for this Vercel account / team
   */
  async listProjects(limit = 100): Promise<VercelProject[]> {
    const url = new URL(`https://api.vercel.com/v9/projects?limit=${limit}`);
    if (this.teamId) {
      url.searchParams.set('teamId', this.teamId);
    }
    const res = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Vercel API error (${res.status}): Failed to list projects`);
    }
    const data = await res.json();
    return data.projects || [];
  }

  /**
   * Match user's tracked GitHub repositories to authorized Vercel projects
   */
  static matchProjectToRepo(project: VercelProject, repoUrl: string, repoName: string): boolean {
    if (!project.link) return false;

    // Check link type and repo path (e.g. "owner/repo" or "repo")
    const linkedRepo = project.link.repo?.toLowerCase();
    if (!linkedRepo) return false;

    const normalizedRepoName = repoName.toLowerCase();
    const cleanUrl = repoUrl.toLowerCase().replace(/\.git$/, '').replace(/\/$/, '');

    // Check full path match (owner/repo)
    if (cleanUrl.endsWith(linkedRepo)) return true;

    // Check bare repo name match
    const linkedRepoName = linkedRepo.includes('/') ? linkedRepo.split('/')[1] : linkedRepo;
    if (linkedRepoName === normalizedRepoName) return true;

    return false;
  }

  /**
   * Exchange OAuth authorization code for Vercel access token (and optional refresh token)
   */
  static async exchangeCodeForToken(code: string, redirectUri: string): Promise<VercelTokenResponse> {
    const clientId = process.env.VERCEL_CLIENT_ID;
    const clientSecret = process.env.VERCEL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('VERCEL_CLIENT_ID and VERCEL_CLIENT_SECRET must be configured');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    const res = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error_description || errBody.error || `Token exchange failed with status ${res.status}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      teamId: data.team_id || undefined,
      userId: data.user_id,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope,
    };
  }

  /**
   * Refresh an expired Vercel access token using the rotated refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<VercelTokenResponse> {
    const clientId = process.env.VERCEL_CLIENT_ID;
    const clientSecret = process.env.VERCEL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('VERCEL_CLIENT_ID and VERCEL_CLIENT_SECRET must be configured');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('refresh_token', refreshToken);

    const res = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error_description || errBody.error || `Token refresh failed with status ${res.status}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token, // Rotated new refresh token
      expiresIn: data.expires_in,
      teamId: data.team_id || undefined,
      userId: data.user_id,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope,
    };
  }
}

/** Helper: fetch stored Vercel integration for a user */
export async function getVercelIntegration(userId: string) {
  const rows = await db
    .select()
    .from(userIntegrationsTable)
    .where(and(eq(userIntegrationsTable.userId, userId), eq(userIntegrationsTable.provider, 'vercel')));
  return rows[0] || null;
}

/** Helper: get valid decrypted Vercel token, refreshing automatically if close to expiration */
export async function getVercelTokenForUser(userId: string): Promise<{ token: string; teamId?: string } | null> {
  const integration = await getVercelIntegration(userId);
  if (!integration) return null;

  try {
    const now = new Date();
    const expiresAt = integration.tokenExpiresAt;
    const meta = (integration.metadata as any) || {};

    // Check if token expires within the next 5 minutes and we have a refresh token
    const isExpiringSoon = expiresAt && (expiresAt.getTime() - now.getTime()) < 5 * 60 * 1000;

    if (isExpiringSoon && integration.encryptedRefreshToken) {
      try {
        const rawRefreshToken = decryptToken(integration.encryptedRefreshToken);
        const refreshed = await VercelService.refreshAccessToken(rawRefreshToken);

        const newEncryptedToken = encryptToken(refreshed.accessToken);
        const newEncryptedRefreshToken = refreshed.refreshToken ? encryptToken(refreshed.refreshToken) : integration.encryptedRefreshToken;
        const newExpiresAt = refreshed.expiresIn ? new Date(Date.now() + refreshed.expiresIn * 1000) : null;

        await db
          .update(userIntegrationsTable)
          .set({
            encryptedToken: newEncryptedToken,
            encryptedRefreshToken: newEncryptedRefreshToken,
            tokenExpiresAt: newExpiresAt,
            lastValidatedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userIntegrationsTable.id, integration.id));

        return { token: refreshed.accessToken, teamId: refreshed.teamId || meta.teamId };
      } catch (refreshErr) {
        console.error(`Automatic Vercel token refresh failed for user ${userId}:`, refreshErr);
        // Fall back to current decrypted token if refresh fails
      }
    }

    const token = decryptToken(integration.encryptedToken);
    return { token, teamId: meta.teamId };
  } catch (err) {
    console.error(`Failed to decrypt Vercel token for user ${userId}:`, err instanceof Error ? err.message : err);
    return null;
  }
}
