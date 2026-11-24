import express from 'express';

import { db } from '@workspace/db';
// Simple console logger replacements
const logger = console;
import { verifySignature, processWebhookEvent, recordProcessedEvent, extractTelemetry, createIncidentFromWebhook, generateIncidentReport } from '../services/githubWebhookService.js';
import { webhookDeliveriesTable } from '@workspace/db/schema';

const router = express.Router();

/**
 * Public/Unauthenticated or Secret-authenticated GitHub Webhook Receiver
 */
router.post('/webhook', async (req, res) => {
    try {
        const signature = req.headers['x-hub-signature-256'] as string | undefined;
        const eventType = req.headers['x-github-event'] as string | undefined;
        const deliveryId = req.headers['x-github-delivery'] as string | undefined;

        // Verify GitHub signature if secret is configured
        const hasSecret = Boolean(process.env.GITHUB_WEBHOOK_SECRET);
        if (hasSecret) {
            if (!verifySignature(signature, req.body)) {
                logger.warn({ deliveryId }, 'GitHub webhook signature mismatch');
                return res.status(401).json({ error: 'Invalid webhook signature' });
            }
        }

        // Duplicate delivery protection
        if (deliveryId && !recordProcessedEvent(deliveryId)) {
            logger.info({ deliveryId }, 'Duplicate GitHub webhook delivery ignored');
            return res.status(200).json({ status: 'ignored', reason: 'duplicate_delivery' });
        }

        // Process standard event
        const event = processWebhookEvent(req.body, eventType, deliveryId);
        const telemetry = extractTelemetry(event);

        // Persist delivery to DB for durable timeline
        try {
            await db.insert(webhookDeliveriesTable).values({
                userId: null,
                provider: 'github',
                deliveryId: deliveryId || event.eventId,
                eventType: event.type,
                payload: event.payload,
                status: 'processed',
                processedAt: new Date(),
                createdAt: new Date()
            });
        } catch (e) {
            // Duplicate insertion will be caught by unique constraint – ignore silently
            logger.warn({ deliveryId }, 'Duplicate webhook DB insert ignored');
        }

        // Create incident if this is a qualifying failure event
        let reportResult: { reportId: string } | null = null;
        const incidentResult = await createIncidentFromWebhook(event.type, event.payload, deliveryId);
        if (incidentResult) {
            logger.info({ incidentId: incidentResult.incidentId, repo: telemetry.repository?.name }, 'Incident created from GitHub webhook');

            // Generate automatic incident report
            reportResult = await generateIncidentReport(incidentResult.incidentId, incidentResult.userId);
            if (reportResult) {
                logger.info({ reportId: reportResult.reportId, incidentId: incidentResult.incidentId }, 'Incident report generated');
            }
        }

        logger.info({ eventType: event.type, repo: telemetry.repository?.name }, 'GitHub webhook event processed');

        return res.status(200).json({
            status: 'received',
            eventType: event.type,
            eventId: event.eventId,
            incidentCreated: !!incidentResult,
            reportGenerated: !!reportResult
        });
    } catch (error: any) {
        logger.error({ error: error.message }, 'GitHub webhook processing failed');
        return res.status(500).json({ error: 'Internal server error' });
    }
});

function getEventSummary(event: any): string {
    switch (event.type) {
        case 'push': {
            const count = event.payload.commits?.length || 0;
            const ref = event.payload.ref || 'branch';
            return `Pushed ${count} commit(s) to ${ref.replace('refs/heads/', '')}`;
        }
        case 'pull_request': {
            const pr = event.payload.pull_request;
            return `PR #${pr?.number || ''} ${pr?.title || ''} (${pr?.state || 'updated'})`;
        }
        case 'deployment':
        case 'deployment_status': {
            return `Deployment to ${event.payload.deployment?.environment || 'environment'} updated`;
        }
        default:
            return `GitHub event: ${event.type}`;
    }
}

export default router;
