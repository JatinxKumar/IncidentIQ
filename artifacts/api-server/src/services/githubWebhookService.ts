import crypto from 'crypto';
import { db } from '@workspace/db';
import { repositoriesTable, webhookDeliveriesTable, incidentsTable, reportsTable, userIntegrationsTable } from '@workspace/db/schema';
import { eq, and } from 'drizzle-orm';

interface GitHubWebhookPayload {
    action?: string;
    repository?: {
        id: number;
        name: string;
        full_name: string;
        html_url: string;
    };
    issue?: {
        id: number;
        title: string;
        body: string;
        html_url: string;
    };
    commits?: Array<{
        id: string;
        message: string;
        author: { name: string; email: string };
        timestamp?: string;
    }>;
    ref?: string;
    pusher?: { name: string; email: string };
    pull_request?: {
        id: number;
        title: string;
        state: string;
        html_url: string;
    };
    deployment?: {
        id: number;
        environment: string;
    };
    deployment_status?: {
        state: string;
    };
    workflow_run?: {
        id: number;
        name: string;
        conclusion: string;
        html_url: string;
        head_branch: string;
        head_sha: string;
        actor?: { login: string };
        created_at: string;
        updated_at: string;
    };
}

export interface ProcessedEvent {
    eventId: string;
    type: string;
    payload: GitHubWebhookPayload;
    timestamp: string;
}

// In-memory LRU cache / Set to prevent duplicate event delivery (idempotency)
const processedEventIds = new Set<string>();
const MAX_PROCESSED_EVENTS = 1000;

export function recordProcessedEvent(eventId: string): boolean {
    if (processedEventIds.has(eventId)) {
        return false; // Duplicate!
    }
    processedEventIds.add(eventId);
    if (processedEventIds.size > MAX_PROCESSED_EVENTS) {
        const first = processedEventIds.values().next().value;
        if (first) processedEventIds.delete(first);
    }
    return true; // New event
}

/**
 * Verify GitHub webhook signature
 * @param signature - The X-Hub-Signature-256 header value
 * @param payload - The request body (string or object)
 * @returns boolean indicating if signature is valid
 */
export function verifySignature(signature: string | undefined, payload: any): boolean {
    if (!signature) {
        return false;
    }

    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'default-secret-change-in-production';
    const hmac = crypto.createHmac('sha256', secret);
    const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const digest = 'sha256=' + hmac.update(content).digest('hex');

    if (signature.length !== digest.length) {
        return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * Process GitHub webhook payload into a standardized event
 * @param payload - The GitHub webhook payload
 * @param eventHeader - Optional event header (e.g. from X-GitHub-Event)
 * @param deliveryId - Optional delivery GUID from X-GitHub-Delivery
 * @returns Processed event object
 */
export function processWebhookEvent(payload: GitHubWebhookPayload, eventHeader?: string, deliveryId?: string): ProcessedEvent {
    let eventType = eventHeader || 'unknown';

    // Determine event type based on payload structure if not in header
    if (eventType === 'unknown') {
        if (payload.pull_request) {
            eventType = 'pull_request';
        } else if (payload.commits && payload.ref) {
            eventType = 'push';
        } else if (payload.deployment) {
            eventType = 'deployment';
        } else if (payload.issue) {
            eventType = 'issues';
        } else if (payload.repository && payload.action === 'created') {
            eventType = 'repository_created';
        }
    }

    const eventId = deliveryId || crypto.createHash('sha256').update(JSON.stringify(payload) + Date.now()).digest('hex');

    return {
        eventId,
        type: eventType,
        payload,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Extract development telemetry from webhook event
 * Separate from OS infrastructure metrics (CPU/RAM).
 */
export function extractTelemetry(event: ProcessedEvent): Record<string, any> {
    const telemetry: Record<string, any> = {
        source: 'github',
        eventType: event.type,
        timestamp: event.timestamp,
        eventId: event.eventId,
    };

    if (event.payload.repository) {
        telemetry.repository = {
            id: event.payload.repository.id,
            name: event.payload.repository.name,
            fullName: event.payload.repository.full_name,
            htmlUrl: event.payload.repository.html_url,
        };
    }

    if (event.payload.pull_request) {
        telemetry.pullRequest = {
            id: event.payload.pull_request.id,
            title: event.payload.pull_request.title,
            state: event.payload.pull_request.state,
            url: event.payload.pull_request.html_url,
        };
    }

    if (event.payload.commits) {
        telemetry.commits = event.payload.commits.map(commit => ({
            id: commit.id,
            message: commit.message,
            author: commit.author,
            timestamp: commit.timestamp,
        }));
    }

    if (event.payload.deployment) {
        telemetry.deployment = {
            id: event.payload.deployment.id,
            environment: event.payload.deployment.environment,
            status: event.payload.deployment_status?.state || 'in_progress',
        };
    }

    return telemetry;
}

/**
 * Determine if a GitHub webhook event qualifies as an incident.
 * Only workflow_run failures and deployment_status failures/errors create incidents.
 */
export function isIncidentEvent(eventType: string, payload: GitHubWebhookPayload): boolean {
    if (eventType === 'workflow_run') {
        return payload.workflow_run?.conclusion === 'failure';
    }
    if (eventType === 'deployment_status') {
        return payload.deployment_status?.state === 'failure' || payload.deployment_status?.state === 'error';
    }
    return false;
}

/**
 * Determine incident severity based on event type and payload.
 */
export function determineSeverity(eventType: string, payload: GitHubWebhookPayload): 'low' | 'medium' | 'high' | 'critical' {
    if (eventType === 'workflow_run' && payload.workflow_run?.conclusion === 'failure') {
        return 'high';
    }
    if (eventType === 'deployment_status') {
        const state = payload.deployment_status?.state;
        if (state === 'error') return 'critical';
        if (state === 'failure') return 'high';
    }
    return 'medium';
}

/**
 * Create an incident record from a qualifying GitHub webhook event.
 * Associates with the connected repository and user.
 */
export async function createIncidentFromWebhook(
    eventType: string,
    payload: GitHubWebhookPayload,
    deliveryId: string | undefined,
): Promise<{ incidentId: string; repositoryId: string | null; userId: string | null } | null> {
    if (!isIncidentEvent(eventType, payload)) {
        return null;
    }

    const repo = payload.repository;
    if (!repo) {
        return null;
    }

    // Find the connected repository by GitHub repo name/full_name
    // We match on the repository URL or name
    const repoName = repo.full_name || repo.name;
    const repositories = await db.select().from(repositoriesTable);

    // Find matching repository by URL containing the repo name
    let matchedRepo = repositories.find(r => r.url.includes(repoName) || r.name === repo.name);
    if (!matchedRepo) {
        // Try matching by full_name (owner/repo)
        matchedRepo = repositories.find(r => r.url.includes(repoName));
    }

    if (!matchedRepo) {
        // No connected repository found for this event - cannot associate incident
        return null;
    }

    // Find the user who owns this repository
    const userId = matchedRepo.userId;

    // Determine severity and title
    const severity = determineSeverity(eventType, payload);
    let title = '';
    let description = '';

    if (eventType === 'workflow_run' && payload.workflow_run) {
        const wr = payload.workflow_run;
        title = `GitHub Actions workflow failed: ${wr.name}`;
        description = `Workflow "${wr.name}" failed on repository ${repo.full_name}.\n` +
            `Branch: ${wr.head_branch || 'unknown'}\n` +
            `Commit: ${wr.head_sha || 'unknown'}\n` +
            `Conclusion: ${wr.conclusion}\n` +
            `Workflow URL: ${wr.html_url}\n` +
            `Actor: ${wr.actor?.login || 'unknown'}\n` +
            `Event ID: ${deliveryId || 'unknown'}`;
    } else if (eventType === 'deployment_status' && payload.deployment_status) {
        const ds = payload.deployment_status;
        title = `Deployment failed: ${repo.full_name}`;
        description = `Deployment to ${payload.deployment?.environment || 'unknown'} failed.\n` +
            `State: ${ds.state}\n` +
            `Repository: ${repo.full_name}\n` +
            `Event ID: ${deliveryId || 'unknown'}`;
    }

    // Check for duplicate incident (same delivery ID already processed)
    const existingDelivery = await db.select().from(webhookDeliveriesTable)
        .where(and(eq(webhookDeliveriesTable.deliveryId, deliveryId || ''), eq(webhookDeliveriesTable.provider, 'github')))
        .limit(1);

    if (existingDelivery.length > 0 && existingDelivery[0].status === 'processed') {
        // Already processed this delivery
        return null;
    }

    // Create the incident
    const insertResult = await db.insert(incidentsTable).values({
        title,
        description,
        severity,
        status: 'open',
        source: 'github',
        createdBy: userId || '',
    }).returning();

    const incident = insertResult[0];

    return {
        incidentId: incident.id,
        repositoryId: matchedRepo.id,
        userId,
    };
}

/**
 * Generate an automatic incident report for a newly created incident.
 * Creates a report record in the reports table.
 */
export async function generateIncidentReport(incidentId: string, userId: string | null): Promise<{ reportId: string } | null> {
    if (!incidentId) {
        return null;
    }

    // Fetch the incident details
    const incidents = await db.select().from(incidentsTable).where(eq(incidentsTable.id, incidentId));
    if (incidents.length === 0) {
        return null;
    }

    const incident = incidents[0];

    // Generate report content based on incident
    const reportContent = {
        incidentId: incident.id,
        title: incident.title,
        description: incident.description,
        severity: incident.severity,
        status: incident.status,
        source: incident.source,
        createdAt: incident.createdAt,
        resolvedAt: incident.resolvedAt,
        createdBy: incident.createdBy,
        assignedTo: incident.assignedTo,
        uploadedLogId: incident.uploadedLogId,
        rootCause: incident.rootCause,
        metadata: {
            generatedBy: 'github_webhook',
            generationTimestamp: new Date().toISOString(),
            incidentAgeHours: incident.createdAt ? Math.floor((new Date().getTime() - new Date(incident.createdAt).getTime()) / (1000 * 60 * 60)) : 0,
        },
    };

    // Create the report
    const reportResult = await db.insert(reportsTable).values({
        title: `Incident Report: ${incident.title}`,
        type: 'incident_summary',
        generatedBy: userId || '',
        incidentId: incident.id,
        content: reportContent,
    }).returning();

    const report = reportResult[0];

    return {
        reportId: report.id,
    };
}
