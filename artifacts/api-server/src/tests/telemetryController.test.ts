import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '@workspace/db';
import { telemetryTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { createTestUser, createTestRepository, cleanupTestData } from './test-utils.js';

// Mock the ML service
vi.mock('node-fetch', async () => {
    const actual: any = await vi.importActual('node-fetch');
    return {
        default: vi.fn().mockImplementation((url: string, options?: any) => {
            if (typeof url === 'string' && url.includes('/api/v1/predict')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            prediction: 1,
                            confidence: 0.95,
                            status: 'anomaly',
                        }),
                });
            }
            return actual.default(url, options);
        }),
    };
});

describe('Telemetry Controller', () => {
    let testUser: any;
    let testRepository: any;
    let authToken: string;

    beforeAll(async () => {
        // Create test user and repository
        testUser = await createTestUser();
        testRepository = await createTestRepository(testUser.id);

        // Get auth token
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: 'testpassword' });
        authToken = loginRes.body.accessToken;
    });

    afterAll(async () => {
        await cleanupTestData();
    });

    describe('POST /api/telemetry', () => {
        it('should persist valid telemetry', async () => {
            const telemetryData = {
                repositoryId: testRepository.id,
                cpuUsage: 75.5,
                memoryUsage: 65.2,
                diskUsage: 45.8,
                networkLatency: 25.3,
                requestRate: 100.0,
                errorRate: 0.05,
                responseTime: 500.0,
                httpStatus: 200,
                serviceAvailability: 99.9,
                dbConnections: 50.0,
                queryLatency: 100.0,
                cacheHitRatio: 0.85,
                restartCount: 0,
                deploymentIndicator: false,
                telemetrySource: 'test',
            };

            const res = await request(app)
                .post('/api/telemetry')
                .set('Authorization', `Bearer ${authToken}`)
                .send(telemetryData)
                .expect(201);

            // Verify telemetry was persisted
            const [storedTelemetry] = await db
                .select()
                .from(telemetryTable)
                .where(eq(telemetryTable.id, res.body.id));

            expect(storedTelemetry).toBeDefined();
            expect(Number(storedTelemetry.cpuUsage)).toBe(75.5);
            expect(res.body.prediction).toBeDefined();
            expect(res.body.prediction.status).toBe('anomaly');
        });

        it('should reject missing required fields', async () => {
            const res = await request(app)
                .post('/api/telemetry')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ repositoryId: testRepository.id })
                .expect(400);

            expect(res.body.error).toBe('Validation failed');
        });

        it('should reject invalid numeric values', async () => {
            const res = await request(app)
                .post('/api/telemetry')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    repositoryId: testRepository.id,
                    cpuUsage: 101,
                    memoryUsage: -1,
                    diskUsage: 50,
                    networkLatency: 10,
                    requestRate: 50,
                    errorRate: 1.1,
                    responseTime: 100,
                    httpStatus: 600,
                    serviceAvailability: 101,
                    dbConnections: 10,
                    queryLatency: 10,
                    cacheHitRatio: 1.1,
                    restartCount: -1,
                    deploymentIndicator: false,
                    telemetrySource: 'test',
                })
                .expect(400);

            expect(res.body.error).toBe('Validation failed');
        });

        it('should reject unauthorized requests', async () => {
            const res = await request(app)
                .post('/api/telemetry')
                .send({ repositoryId: testRepository.id })
                .expect(401);

            expect(res.body.error).toBe('Authentication token required');
        });
    });

    describe('GET /api/telemetry/recent/:repositoryId', () => {
        const baseRow = {
            cpuUsage: '50',
            memoryUsage: '50',
            diskUsage: '50',
            networkLatency: '50',
            requestRate: '50',
            errorRate: '0.5',
            responseTime: '50',
            httpStatus: 200,
            serviceAvailability: '90',
            dbConnections: '50',
            queryLatency: '50',
            cacheHitRatio: '0.5',
            restartCount: 0,
            deploymentIndicator: false,
            telemetrySource: 'test',
        };

        it('should return recent telemetry for authorized repository', async () => {
            // First create some test telemetry
            await db.insert(telemetryTable).values({
                repositoryId: testRepository.id,
                ...baseRow,
            });

            const res = await request(app)
                .get(`/api/telemetry/recent/${testRepository.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body).toBeInstanceOf(Array);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it("should not expose another user's repository data", async () => {
            // Create a different user and repository
            const otherUser = await createTestUser('other@example.com');
            const otherRepository = await createTestRepository(otherUser.id);

            // Add telemetry to the other repository
            await db.insert(telemetryTable).values({
                repositoryId: otherRepository.id,
                ...baseRow,
            });

            // Try to access the other user's repository
            const res = await request(app)
                .get(`/api/telemetry/recent/${otherRepository.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Should return empty array (no access)
            expect(res.body).toEqual([]);
        });
    });
});