import 'dotenv/config';
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encryptToken, decryptToken } from '../utils/crypto.js';
import { VercelService } from '../services/vercelService.js';
import crypto from 'crypto';

describe('Phase 1 Deep Verification Suite', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('1. AES-256-GCM Encryption, Rotation & Security', () => {
    it('encrypts tokens and ensures plaintext is never present in encrypted output', () => {
      const rawToken = 'vca_secretAccessToken123456789';
      const encrypted = encryptToken(rawToken);

      expect(encrypted).not.toContain(rawToken);
      expect(encrypted).not.toContain('vca_');
      expect(decryptToken(encrypted)).toBe(rawToken);
    });

    it('rejects tampered ciphertext with auth tag failure', () => {
      const rawToken = 'ghp_SampleSecretTokenToProtect';
      const encrypted = encryptToken(rawToken);
      const buf = Buffer.from(encrypted, 'base64');
      buf[buf.length - 2] ^= 0x55; // Tamper
      expect(() => decryptToken(buf.toString('base64'))).toThrow();
    });
  });

  describe('2. Vercel OAuth Authorization-Code Exchange (Mocked)', () => {
    beforeEach(() => {
      process.env.VERCEL_CLIENT_ID = 'test_client_id';
      process.env.VERCEL_CLIENT_SECRET = 'test_client_secret';
    });

    it('exchanges code for access token and refresh token via official endpoint', async () => {
      const mockResponse = {
        access_token: 'vca_mock_access_token_123',
        refresh_token: 'vcr_mock_refresh_token_456',
        token_type: 'Bearer',
        expires_in: 3600,
        user_id: 'user_vercel_test_id',
        team_id: 'team_test_123',
        scope: 'offline_access',
      };

      global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
        expect(url).toBe('https://api.vercel.com/v2/oauth/access_token');
        expect(opts.method).toBe('POST');
        expect(opts.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

        const params = new URLSearchParams(opts.body);
        expect(params.get('grant_type')).toBe('authorization_code');
        expect(params.get('client_id')).toBe('test_client_id');
        expect(params.get('client_secret')).toBe('test_client_secret');
        expect(params.get('code')).toBe('auth_code_xyz');

        return {
          ok: true,
          json: async () => mockResponse,
        } as any;
      });

      const res = await VercelService.exchangeCodeForToken('auth_code_xyz', 'http://localhost:3001/api/integrations/vercel/callback');
      expect(res.accessToken).toBe(mockResponse.access_token);
      expect(res.refreshToken).toBe(mockResponse.refresh_token);
      expect(res.expiresIn).toBe(3600);
      expect(res.teamId).toBe('team_test_123');
      expect(res.userId).toBe('user_vercel_test_id');
    });

    it('refreshes token using grant_type=refresh_token and returns rotated tokens', async () => {
      const mockRefreshResponse = {
        access_token: 'vca_new_rotated_access_token',
        refresh_token: 'vcr_new_rotated_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        user_id: 'user_vercel_test_id',
      };

      global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
        expect(url).toBe('https://api.vercel.com/v2/oauth/access_token');
        const params = new URLSearchParams(opts.body);
        expect(params.get('grant_type')).toBe('refresh_token');
        expect(params.get('refresh_token')).toBe('vcr_old_refresh_token');

        return {
          ok: true,
          json: async () => mockRefreshResponse,
        } as any;
      });

      const res = await VercelService.refreshAccessToken('vcr_old_refresh_token');
      expect(res.accessToken).toBe('vca_new_rotated_access_token');
      expect(res.refreshToken).toBe('vcr_new_rotated_refresh_token');
    });
  });

  describe('3. CSRF State Generation and Verification', () => {
    function generateSignedState(userId: string): string {
      const secret = process.env.ENCRYPTION_KEY || 'fallback';
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

        if (Date.now() - timestamp > 15 * 60 * 1000 || Date.now() < timestamp) {
          return { valid: false };
        }

        const secret = process.env.ENCRYPTION_KEY || 'fallback';
        const payload = `${random}.${timestampStr}.${userId}`;
        const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

        if (signature.length !== expectedSig.length) return { valid: false };
        const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
        return isValid ? { valid: true, userId } : { valid: false };
      } catch {
        return { valid: false };
      }
    }

    it('generates and validates signed CSRF state correctly', () => {
      const state = generateSignedState('usr_test_123');
      const verification = verifySignedState(state);
      expect(verification.valid).toBe(true);
      expect(verification.userId).toBe('usr_test_123');
    });

    it('rejects tampered or forged state parameters', () => {
      const validState = generateSignedState('usr_test_123');
      const parts = validState.split('.');
      parts[2] = 'usr_attacker_999'; // Tamper user ID
      const forgedState = parts.join('.');

      expect(verifySignedState(forgedState).valid).toBe(false);
    });

    it('rejects expired state parameters', () => {
      const secret = process.env.ENCRYPTION_KEY || 'fallback';
      const random = crypto.randomBytes(16).toString('hex');
      const expiredTimestamp = (Date.now() - 20 * 60 * 1000).toString(); // 20 mins ago
      const payload = `${random}.${expiredTimestamp}.usr_test_123`;
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const expiredState = `${payload}.${signature}`;

      expect(verifySignedState(expiredState).valid).toBe(false);
    });
  });

  describe('4. Project Mapping Accuracy', () => {
    it('matches exact full name owner/repo', () => {
      const project: any = {
        name: 'resource-loop',
        link: { type: 'github', repo: 'JatinxKumar/ResourceLoop' },
      };
      expect(VercelService.matchProjectToRepo(project, 'https://github.com/JatinxKumar/ResourceLoop', 'ResourceLoop')).toBe(true);
    });

    it('matches bare repository names', () => {
      const project: any = {
        name: 'frontend-mini-projects',
        link: { type: 'github', repo: 'Frontend-Mini-Projects' },
      };
      expect(VercelService.matchProjectToRepo(project, 'https://github.com/JatinxKumar/Frontend-Mini-Projects', 'Frontend-Mini-Projects')).toBe(true);
    });

    it('rejects mismatching repositories', () => {
      const project: any = {
        name: 'other',
        link: { type: 'github', repo: 'other/repo' },
      };
      expect(VercelService.matchProjectToRepo(project, 'https://github.com/JatinxKumar/ResourceLoop', 'ResourceLoop')).toBe(false);
    });
  });
});

