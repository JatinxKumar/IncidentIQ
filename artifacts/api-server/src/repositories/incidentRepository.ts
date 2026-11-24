import { db } from '@workspace/db';
import { incidentsTable } from '@workspace/db/src/schema/incidents';
import { eq } from 'drizzle-orm';

export const incidentRepository = {
    // Get all incidents (supports filtering, ordering in future)
    async getIncidents() {
        return db.select().from(incidentsTable);
    },

    // Get a single incident by ID
    async getIncidentById(id: string) {
        return db.select().from(incidentsTable).where(eq(incidentsTable.id, id)).first();
    },

    // Create a new incident
    async createIncident(incident: any) {
        // Ensure required fields are present
        if (!incident.title || !incident.description || !incident.severity || !incident.source) {
            throw new Error('Missing required fields: title, description, severity, source');
        }

        // Set default status if not provided
        if (!incident.status) {
            incident.status = 'open';
        }

        // Insert and return the created incident
        const result = await db.insert(incidentsTable).values(incident).returning();
        return result[0];
    },

    // Update an existing incident
    async updateIncident(id: string, updates: any) {
        // Handle status transitions
        if (updates.status && updates.status !== 'open' && updates.status !== 'investigating') {
            // If moving to resolved or closed, set resolvedAt
            if (updates.status === 'resolved' || updates.status === 'closed') {
                updates.resolvedAt = new Date();
            }
        }

        const result = await db.update(incidentsTable)
            .set(updates)
            .where(eq(incidentsTable.id, id))
            .returning();

        return result[0];
    },

    // Delete an incident
    async deleteIncident(id: string) {
        const result = await db.delete(incidentsTable)
            .where(eq(incidentsTable.id, id));

        return result;
    },

    // Helper: Get incidents by status
    async getIncidentsByStatus(status: string) {
        return db.select().from(incidentsTable).where(eq(incidentsTable.status, status));
    }
};