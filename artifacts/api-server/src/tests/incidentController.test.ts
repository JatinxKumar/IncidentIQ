import { Request, Response } from 'express';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@workspace/db';
import { incidentsTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { getIncidents, getIncidentById, createIncident } from '../controllers/incidentController.js';

// Shared mock data — order matters:
// [0] must match getIncidentById expectation, [1]/[2] must match getIncidents expectations
const mockIncidents = [
    { id: 3, title: 'Test Incident', severity: 'low', status: 'investigating' },
    { id: 1, title: 'Test Incident 1', severity: 'medium', status: 'open' },
    { id: 2, title: 'Test Incident 2', severity: 'high', status: 'resolved' }
];

// Mock the database
vi.mock('@workspace/db', () => ({
    db: {
        // GET /api/incidents — select all (no where clause)
        select: vi.fn().mockImplementation(() => ({
            from: vi.fn(() => Object.assign(Promise.resolve(mockIncidents), {
                where: () => mockIncidents
            })),
            where: vi.fn(() => mockIncidents)
        })),
        // POST /api/incidents — insert and return
        insert: vi.fn().mockImplementation(() => ({
            values: vi.fn().mockImplementation(() => ({
                returning: vi.fn().mockResolvedValue([
                    { id: 1, title: 'New Incident', severity: 'critical', status: 'open' }
                ])
            }))
        })),
        // DELETE /api/incidents/:id
        delete: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockReturnValue({
                execute: vi.fn().mockResolvedValue({})
            })
        }))
    }
}));

// Test setup
beforeEach(() => {
    // Clear incidents table before each test
    return db.delete(incidentsTable);
});

// Test GET /api/incidents
describe('Incident Controller', () => {
    // Test GET /api/incidents
    it('should return all incidents', async () => {
        const incident1 = { title: 'Test Incident 1', severity: 'medium', status: 'open' };
        const incident2 = { title: 'Test Incident 2', severity: 'high', status: 'resolved' };
        const req = { method: 'GET' } as unknown as Request;
        const res = { json: vi.fn() } as unknown as Response;

        await getIncidents(req, res);

        // Assert — check the actual call argument directly
        const jsonArg = (res.json as any).mock.calls[0][0] as any[];
        expect(jsonArg).toContainEqual(incident1);
        expect(jsonArg).toContainEqual(incident2);
    });

    // Test GET /api/incidents/:id
    it('should return a specific incident by ID', async () => {
        const incident = { title: 'Test Incident', severity: 'low', status: 'investigating' };
        const result = await db.insert(incidentsTable).values(incident as never).returning();
        const id = result[0].id;
        const req = { params: { id }, method: 'GET' } as unknown as Request;
        const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as Response;

        await getIncidentById(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining(incident));
    });

    // Test POST /api/incidents
    it('should create a new incident', async () => {
        const newIncident = { title: 'New Incident', severity: 'critical', status: 'open' };
        const req = { body: newIncident, method: 'POST' } as unknown as Request;
        const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as Response;

        await createIncident(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining(newIncident));
    });
});
