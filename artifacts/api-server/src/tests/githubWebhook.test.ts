import { describe, it, expect, vi } from 'vitest';
import { verifySignature, processWebhookEvent, recordProcessedEvent, extractTelemetry } from '../services/githubWebhookService.js';
import crypto from 'crypto';

describe('GitHub Webhook Service', () => {
    const secret = 'test-secret-key-12345';
    process.env.GITHUB_WEBHOOK_SECRET = secret;

    it('should verify valid HMAC SHA256 signatures', () => {
        const payload = { action: 'opened', repository: { name: 'sentinel-core' } };
        const hmac = crypto.createHmac('sha256', secret);
        const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');

        const isValid = verifySignature(digest, payload);
        expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
        const payload = { action: 'opened' };
        const isValid = verifySignature('sha256=invalidhexsignature', payload);
        expect(isValid).toBe(false);
    });

    it('should prevent duplicate webhook events using delivery idempotency', () => {
        const deliveryId = 'delivery-uuid-9999';
        const firstTime = recordProcessedEvent(deliveryId);
        expect(firstTime).toBe(true);

        const secondTime = recordProcessedEvent(deliveryId);
        expect(secondTime).toBe(false);
    });

    it('should correctly process push webhook event payloads', () => {
        const payload = {
            ref: 'refs/heads/main',
            commits: [
                { id: 'c1', message: 'feat: live github', author: { name: 'Alice', email: 'alice@example.com' } }
            ],
            repository: {
                id: 101,
                name: 'sentinel-core',
                full_name: 'org/sentinel-core',
                html_url: 'https://github.com/org/sentinel-core'
            }
        };

        const event = processWebhookEvent(payload, 'push', 'test-deliv-1');
        expect(event.type).toBe('push');

        const telemetry = extractTelemetry(event);
        expect(telemetry.source).toBe('github');
        expect(telemetry.repository.name).toBe('sentinel-core');
        expect(telemetry.commits.length).toBe(1);
    });
});

