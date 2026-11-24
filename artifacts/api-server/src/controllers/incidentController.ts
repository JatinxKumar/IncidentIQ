import { Request, Response } from 'express';
import { db } from '@workspace/db';
import { incidentsTable, insertIncidentSchema, updateIncidentSchema, repositoriesTable } from '@workspace/db/schema';
import { incidentStatusEnum } from '@workspace/db/schema';
import { eq, and } from 'drizzle-orm';
import type { InsertIncident, UpdateIncident } from '@workspace/db/schema';

// GET /api/incidents
// Retrieve all incidents for the authenticated user
export const getIncidents = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
    }

    // Get user's repositories
    const userRepos = await db.select().from(repositoriesTable).where(eq(repositoriesTable.userId, userId));
    const repoIds = userRepos.map(r => r.id);

    // Get incidents for user's repositories
    const allIncidents = await db.select().from(incidentsTable);
    const filteredIncidents = allIncidents.filter(inc =>
        inc.createdBy === userId || repoIds.includes(inc.createdBy)
    );

    res.json(filteredIncidents);
};

// GET /api/incidents/:id
// Retrieve a single incident by ID (only if user has access)
export const getIncidentById = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
    }

    // Cast req.params.id to string to satisfy Drizzle's expectation
    const id = (req.params.id as unknown) as string;
    const incident = await db
        .select()
        .from(incidentsTable)
        .where(eq(incidentsTable.id, id));

    if (incident && incident.length > 0) {
        const inc = incident[0];
        // Check if user has access to this incident
        const userRepos = await db.select().from(repositoriesTable).where(eq(repositoriesTable.userId, userId));
        const repoIds = userRepos.map(r => r.id);

        if (inc.createdBy === userId || repoIds.includes(inc.createdBy)) {
            res.json(inc);
        } else {
            res.status(403).json({ error: 'Forbidden' });
        }
    } else {
        res.status(404).json({ error: 'Not found' });
    }
};

// POST /api/incidents
// Create a new incident
export const createIncident = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
    }

    const result = await db.insert(incidentsTable).values({
        ...req.body,
        createdBy: userId,
    } as InsertIncident).returning();
    res.status(201).json(result[0]);
};

// PUT /api/incidents/:id
// Update an existing incident
export const updateIncident = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
    }

    // Cast req.params.id to string
    const id = (req.params.id as unknown) as string;

    // Validate and parse the update payload
    const result = updateIncidentSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: 'Invalid update data' });
        return;
    }
    const updates: UpdateIncident = result.data;

    // Handle status transitions - only set resolvedAt if status is being updated to resolved/closed
    if (updates.status && (updates.status === 'resolved' || updates.status === 'closed')) {
        (updates as UpdateIncident & { resolvedAt?: Date }).resolvedAt = new Date();
    }

    // Check if user has access to this incident
    const incident = await db.select().from(incidentsTable).where(eq(incidentsTable.id, id)).limit(1);
    if (incident.length === 0) {
        res.status(404).json({ error: 'Not found' });
        return;
    }

    const userRepos = await db.select().from(repositoriesTable).where(eq(repositoriesTable.userId, userId));
    const repoIds = userRepos.map(r => r.id);

    if (incident[0].createdBy !== userId && !repoIds.includes(incident[0].createdBy)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    const updated = await db.update(incidentsTable)
        .set(updates)
        .where(eq(incidentsTable.id, id))
        .returning();

    if (updated.length === 0) {
        res.status(404).json({ error: 'Not found' });
    } else {
        res.json(updated[0]);
    }
};

// DELETE /api/incidents/:id
// Delete an incident
export const deleteIncident = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
    }

    // Cast req.params.id to string
    const id = (req.params.id as unknown) as string;

    // Check if user has access to this incident
    const incident = await db.select().from(incidentsTable).where(eq(incidentsTable.id, id)).limit(1);
    if (incident.length === 0) {
        res.status(404).json({ error: 'Not found' });
        return;
    }

    const userRepos = await db.select().from(repositoriesTable).where(eq(repositoriesTable.userId, userId));
    const repoIds = userRepos.map(r => r.id);

    if (incident[0].createdBy !== userId && !repoIds.includes(incident[0].createdBy)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    const result = await db.delete(incidentsTable)
        .where(eq(incidentsTable.id, id));

    if (result.rowCount === 0) {
        res.status(404).json({ error: 'Not found' });
    } else {
        res.status(204).send();
    }
};

// GET /api/incidents/status
// Filter incidents by status
export const getIncidentsByStatus = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
    }

    // Handle status parameter (can be string or string[] due to Express types)
    let statusParam: string | string[] = req.params.status;
    if (Array.isArray(statusParam)) {
        // If it's an array, take the first value
        statusParam = statusParam[0];
    }
    if (typeof statusParam !== 'string') {
        res.status(400).json({ error: 'Invalid status parameter' });
        return;
    }

    // Validate against allowed status values
    const validStatuses = ['open', 'investigating', 'resolved', 'closed'];
    if (!validStatuses.includes(statusParam)) {
        res.status(400).json({ error: 'Invalid status value' });
        return;
    }
    const status = statusParam;

    // Get user's repositories
    const userRepos = await db.select().from(repositoriesTable).where(eq(repositoriesTable.userId, userId));
    const repoIds = userRepos.map(r => r.id);

    // Get incidents for user's repositories
    const allIncidents = await db.select().from(incidentsTable).where(eq(incidentsTable.status, status as any));
    const filteredIncidents = allIncidents.filter(inc =>
        inc.createdBy === userId || repoIds.includes(inc.createdBy)
    );

    res.json(filteredIncidents);
};