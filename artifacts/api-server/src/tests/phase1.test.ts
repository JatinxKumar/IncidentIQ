import 'dotenv/config';
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
}

import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from '../utils/crypto.js';
import { VercelService } from '../services/vercelService.js';

describe('Phase 1 - Security, Encryption, and Vercel Matching', () => {
  describe('AES-256-GCM Token Encryption', () => {
    it('encrypts and decrypts GitHub and Vercel tokens cleanly', () => {
      const sampleToken = 'ghp_SampleGitHubPersonalAccessToken1234567890';
      const encrypted = encryptToken(sampleToken);
      expect(encrypted).not.toBe(sampleToken);
      expect(typeof encrypted).toBe('string');

      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(sampleToken);
    });

    it('produces non-deterministic ciphertext (unique IV for each encryption)', () => {
      const token = 'vercel_access_token_abc123';
      const enc1 = encryptToken(token);
      const enc2 = encryptToken(token);
      expect(enc1).not.toBe(enc2);
      expect(decryptToken(enc1)).toBe(token);
      expect(decryptToken(enc2)).toBe(token);
    });

    it('rejects tampered ciphertext with an authentication tag error', () => {
      const token = 'ghp_validToken123';
      const enc = encryptToken(token);
      const buf = Buffer.from(enc, 'base64');
      // Tamper with the ciphertext byte
      buf[buf.length - 1] ^= 0xff;
      const tampered = buf.toString('base64');
      expect(() => decryptToken(tampered)).toThrow();
    });
  });

  describe('GitHub to Vercel Project Matching', () => {
    it('matches project with owner/repo format', () => {
      const project: any = {
        id: 'prj_123',
        name: 'campus-connect-hub',
        link: {
          type: 'github',
          repo: 'JatinxKumar/Campus-Connect-Hub',
        },
      };

      const isMatch = VercelService.matchProjectToRepo(
        project,
        'https://github.com/JatinxKumar/Campus-Connect-Hub',
        'Campus-Connect-Hub'
      );
      expect(isMatch).toBe(true);
    });

    it('matches project case-insensitively and handles .git suffix', () => {
      const project: any = {
        id: 'prj_456',
        name: 'resourceloop',
        link: {
          type: 'github',
          repo: 'jatinxkumar/resourceloop',
        },
      };

      const isMatch = VercelService.matchProjectToRepo(
        project,
        'https://github.com/JatinxKumar/ResourceLoop.git',
        'ResourceLoop'
      );
      expect(isMatch).toBe(true);
    });

    it('does not match unrelated repositories', () => {
      const project: any = {
        id: 'prj_789',
        name: 'other-project',
        link: {
          type: 'github',
          repo: 'someone/other-repo',
        },
      };

      const isMatch = VercelService.matchProjectToRepo(
        project,
        'https://github.com/JatinxKumar/ResourceLoop',
        'ResourceLoop'
      );
      expect(isMatch).toBe(false);
    });

    it('handles projects without a GitHub link safely', () => {
      const project: any = {
        id: 'prj_000',
        name: 'unlinked-project',
      };

      const isMatch = VercelService.matchProjectToRepo(
        project,
        'https://github.com/JatinxKumar/ResourceLoop',
        'ResourceLoop'
      );
      expect(isMatch).toBe(false);
    });
  });
});
